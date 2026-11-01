import { expect, test } from '@playwright/test'
import { createProbeRelay } from '../scripts/mcp-transport-probe.mjs'

test('isolated transport probe authenticates, executes a background marker command and preserves the marker', async ({ page, context, baseURL }) => {
  const evidence = []
  const relay = await createProbeRelay({ origin: new URL(baseURL).origin, appURL: `${baseURL}mcp-transport-probe.html`, onEvidence: entry => evidence.push(entry) })
  try {
    await page.goto(relay.url)
    expect(page.url()).not.toContain('token')
    await page.getByRole('button', { name: 'Test connection' }).click()
    await expect(page.getByRole('status')).toHaveText('Handshake confirmed')
    const other = await context.newPage()
    await other.goto(baseURL)
    await other.bringToFront()
    expect(relay.marker('browser-context-marker')).toBe(true)
    await expect.poll(() => evidence.some(entry => entry.type === 'result' && entry.marker === 'browser-context-marker')).toBe(true)
    await page.close()
    const reopened = await context.newPage()
    await reopened.goto(relay.url)
    await reopened.getByRole('button', { name: 'Test connection' }).click()
    await expect(reopened.getByRole('status')).toHaveText('Handshake confirmed')
    await expect(reopened.locator('#evidence')).toContainText('"previousMarker":"browser-context-marker"')
    expect(await reopened.evaluate(() => Object.keys(localStorage).some(key => /token|probe/i.test(key)))).toBe(false)
    await other.close()
  } finally { await relay.close() }
})

test('experiment without a private bootstrap URL cannot connect', async ({ page }) => {
  await page.goto('mcp-transport-probe.html')
  await expect(page.getByRole('button', { name: 'Test connection' })).toBeDisabled()
  await expect(page.getByRole('status')).toContainText('temporary experiment URL')
})
