import { expect, test } from '@playwright/test'

async function installModelContextFixture(page, deferFirst = false) {
  await page.addInitScript(({ deferFirst }) => {
    const registered = new Map()
    window.probeTools = registered
    window.probeRegistrationCalls = []
    let release, first = deferFirst
    const gate = new Promise(resolve => { release = resolve })
    window.probeReleaseRegistration = () => release()
    Object.defineProperty(document, 'modelContext', { configurable: true, value: {
      async registerTool(tool, { signal }) {
        window.probeRegistrationCalls.push(tool.name)
        registered.set(tool.name, tool)
        signal.addEventListener('abort', () => registered.delete(tool.name), { once: true })
        if (first) { first = false; await gate }
      },
    } })
  }, { deferFirst })
}

test('WebMCP experiment registers a bounded marker-only contract and survives a controlled-context reopen', async ({ page, context }) => {
  await installModelContextFixture(page)
  await page.goto('/tracker/')
  await page.evaluate(() => navigator.serviceWorker.ready)
  await page.reload()
  await page.waitForFunction(() => navigator.serviceWorker.controller !== null)
  await page.goto('/tracker/webmcp-probe.html')
  await expect(page.getByRole('heading', { name: 'EasyTrack WebMCP experiment' })).toBeVisible()
  await expect(page.getByRole('status')).toHaveText('Three experiment tools registered')
  const names = await page.evaluate(() => [...window.probeTools.keys()])
  expect(names).toEqual(['easytrack_probe_echo', 'easytrack_probe_store_marker', 'easytrack_probe_read_marker'])
  expect(await page.evaluate(() => window.probeTools.get('easytrack_probe_echo').execute({ marker: '' }))).toEqual({ ok: false, error: 'invalid_argument' })
  expect(await page.evaluate(() => window.probeTools.get('easytrack_probe_echo').execute({ marker: 'safe', extra: true }))).toEqual({ ok: false, error: 'invalid_argument' })
  expect(await page.evaluate(() => window.probeTools.get('easytrack_probe_echo').execute({ marker: 'synthetic' }))).toMatchObject({ ok: true, marker: 'synthetic' })
  expect(await page.evaluate(() => window.probeTools.get('easytrack_probe_store_marker').execute({ marker: 'saved-marker' }))).toMatchObject({ ok: true, saved: true })
  expect(await page.evaluate(() => { dispatchEvent(new PageTransitionEvent('pagehide', { persisted: true })); return window.probeTools.size })).toBe(0)
  await page.evaluate(() => dispatchEvent(new PageTransitionEvent('pageshow', { persisted: true })))
  await expect(page.getByRole('status')).toHaveText('Three experiment tools registered')
  expect(await page.evaluate(() => window.probeTools.size)).toBe(3)
  await page.close()
  const reopened = await context.newPage()
  await installModelContextFixture(reopened)
  await reopened.goto('/tracker/webmcp-probe.html')
  await expect(reopened.getByRole('status')).toHaveText('Three experiment tools registered')
  expect(await reopened.evaluate(() => window.probeTools.get('easytrack_probe_read_marker').execute())).toMatchObject({ ok: true, marker: 'saved-marker' })
  expect(await reopened.evaluate(() => [...window.probeTools.values()].every(tool => !tool.annotations.consequentialHint))).toBe(true)
})

test('WebMCP experiment explicitly reports an unsupported native context', async ({ page }) => {
  await page.addInitScript(() => Object.defineProperty(document, 'modelContext', { configurable: true, value: undefined }))
  await page.goto('/tracker/webmcp-probe.html')
  await expect(page.getByRole('status')).toHaveText('Native WebMCP is unavailable in this browser context')
  await expect(page.locator('#evidence')).toContainText('"nativeWebMCP":false')
})

test('an aborted pending registration cannot resume into a newer page lifetime', async ({ page }) => {
  await installModelContextFixture(page, true)
  await page.goto('/tracker/webmcp-probe.html', { waitUntil: 'commit' })
  await expect.poll(() => page.evaluate(() => window.probeTools?.size)).toBe(1)
  expect(await page.evaluate(() => { dispatchEvent(new PageTransitionEvent('pagehide', { persisted: true })); return window.probeTools.size })).toBe(0)
  await page.evaluate(() => dispatchEvent(new PageTransitionEvent('pageshow', { persisted: true })))
  await expect(page.getByRole('status')).toHaveText('Three experiment tools registered')
  await page.evaluate(() => window.probeReleaseRegistration())
  expect(await page.evaluate(() => window.probeRegistrationCalls)).toEqual(['easytrack_probe_echo', 'easytrack_probe_echo', 'easytrack_probe_store_marker', 'easytrack_probe_read_marker'])
  expect(await page.evaluate(() => window.probeTools.size)).toBe(3)
})
