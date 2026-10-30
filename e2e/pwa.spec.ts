import { expect, test } from '@playwright/test'

const app = '/tracker/'

async function openAndControl(page: import('@playwright/test').Page) {
  await page.goto(app)
  await expect(page.getByRole('button', { name: 'Создать проект' })).toBeVisible()
  await page.evaluate(() => navigator.serviceWorker.ready)
  await page.reload()
  await page.waitForFunction(() => navigator.serviceWorker.controller !== null)
}

async function prepareUpdate(page: import('@playwright/test').Page) {
  await page.request.get('/__release/1')
  await openAndControl(page)
  await page.request.get('/__release/2')
  await page.evaluate(async () => { await (await navigator.serviceWorker.getRegistration('/tracker/'))?.update() })
  await expect(page.getByRole('status', { name: 'Обновление EasyTrack' })).toBeVisible()
}

test('delivers the manifest and keeps local projects usable offline', async ({ page, context }) => {
  await openAndControl(page)
  const metadata = await page.evaluate(async () => {
    const manifest = await fetch(document.querySelector<HTMLLinkElement>('link[rel="manifest"]')!.href).then(response => response.json())
    const iconStatuses = await Promise.all(manifest.icons.map((icon: { src: string }) => fetch(`/tracker/${icon.src}`).then(response => response.status)))
    return { manifest, iconStatuses, registration: Boolean(await navigator.serviceWorker.getRegistration('/tracker/')) }
  })
  expect(metadata.manifest).toMatchObject({ name: 'EasyTrack', scope: '/tracker/', start_url: '/tracker/' })
  expect(metadata.iconStatuses).toEqual([200, 200])
  expect(metadata.registration).toBe(true)

  await page.getByRole('button', { name: 'Создать проект' }).click()
  await page.getByLabel('Название проекта').fill('Поиск квартиры')
  await page.getByRole('button', { name: 'Создать проект' }).click()
  await expect(page.getByRole('heading', { name: 'Поиск квартиры' })).toBeVisible()
  await context.setOffline(true)
  await page.goto(app)
  await expect(page.getByRole('heading', { name: 'Поиск квартиры' })).toBeVisible()
  await page.setViewportSize({ width: 390, height: 844 })
  await page.getByRole('button', { name: 'Добавить статус' }).first().click()
  await page.getByLabel('Название статуса').fill('Просмотр')
  await page.getByRole('button', { name: 'Создать статус' }).click()
  await expect(page.getByRole('heading', { name: 'Просмотр' })).toBeVisible()
  await page.reload()
  await expect(page.getByRole('heading', { name: 'Просмотр' })).toBeVisible()
})

test('keeps the waiting worker when the user chooses Later', async ({ page }) => {
  await prepareUpdate(page)
  await page.getByRole('button', { name: 'Позже' }).click()
  await expect(page.getByRole('status', { name: 'Обновление EasyTrack' })).toBeHidden()
  expect(await page.evaluate(async () => Boolean((await navigator.serviceWorker.getRegistration('/tracker/'))?.waiting))).toBe(true)
})

test('activates a waiting worker only after the user chooses Update', async ({ page }) => {
  await prepareUpdate(page)
  const reload = page.waitForEvent('framenavigated', frame => frame === page.mainFrame())
  await page.getByRole('button', { name: 'Обновить' }).click()
  await reload
  await page.waitForFunction(() => navigator.serviceWorker.controller !== null)
  expect(await page.evaluate(async () => !(await navigator.serviceWorker.getRegistration('/tracker/'))?.waiting)).toBe(true)
})

for (const locale of ['ru', 'en'] as const) {
  test(`localizes manifests and keeps ${locale} selected after offline reopen at mobile width`, async ({ page, context }) => {
    await openAndControl(page)
    await page.setViewportSize({ width: 320, height: 740 })
    await page.getByRole('button', {name: /^(Настройки|Settings)$/}).click()
    const selector = page.getByRole('combobox', { name: 'Язык приложения' })
    await selector.focus()
    // Native select is keyboard accessible; selecting the option emits the native change event.
    await page.keyboard.press('ArrowUp')
    await page.keyboard.press('Enter')
    await selector.selectOption(locale)
    const activeSelector = page.getByRole('combobox', { name: locale === 'en' ? 'Application language' : 'Язык приложения' })
    await expect(activeSelector).toBeVisible()
    const bounds = await activeSelector.boundingBox()
    expect(bounds!.x).toBeGreaterThanOrEqual(0)
    expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(320)
    const manifests = await page.evaluate(async () => {
      const links = [...document.querySelectorAll<HTMLLinkElement>('link[rel="manifest"]')]
      const variants = await Promise.all(['ru', 'en'].map(async language => fetch(`/tracker/manifest.${language}.webmanifest`).then(response => response.json())))
      return { count: links.length, active: await fetch(links[0].href).then(response => response.json()), variants }
    })
    expect(manifests.count).toBe(1)
    expect(manifests.active.lang).toBe(locale)
    expect(manifests.active.description).toBe(locale === 'en' ? 'Personal project tracker' : 'Трекер личных проектов')
    const [ru, en] = manifests.variants
    expect({ ...ru, lang: '', description: '' }).toEqual({ ...en, lang: '', description: '' })
    expect(ru.id).toBe('/tracker/')
    await expect(page.locator('html')).toHaveAttribute('lang', locale)
    await context.setOffline(true)
    await page.reload()
    await page.getByRole('button', {name: /^(Настройки|Settings)$/}).click()
    await expect(page.getByRole('combobox')).toHaveValue(locale)
    await expect(page.getByRole('button', { name: locale === 'en' ? 'Create project' : 'Создать проект' })).toBeVisible()
    expect(await page.evaluate(async () => {
      const active = document.querySelector<HTMLLinkElement>('link[rel="manifest"]')!
      return (await fetch(active.href).then(response => response.json())).lang
    })).toBe(locale)
    await page.screenshot({ path: `test-results/locale-${locale}-mobile.png`, fullPage: true })
  })
}

for (const width of [1280, 320]) {
  test(`switches language after closing an unfinished dialog at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 })
    await page.goto(app)
    await page.getByRole('button', { name: 'Создать проект' }).click()
    await page.getByLabel('Название проекта').fill('Мой проект')
    await page.getByRole('button', { name: 'Создать проект' }).click()
    await expect(page.getByRole('heading', { name: 'Мой проект' })).toBeVisible()
    await page.getByRole('button', { name: 'Добавить статус' }).first().click()
    await page.getByLabel('Название статуса').fill('Незавершённый черновик')
    const dialog = page.getByRole('dialog')
    await expect(dialog.getByRole('combobox')).toHaveCount(0)
    await expect(page.getByRole('combobox')).toHaveCount(0)
    await page.keyboard.press('Escape')
    await page.getByRole('button', {name: /^(Настройки|Settings)$/}).click()
    const selector = page.getByRole('combobox')
    await selector.focus()
    await selector.selectOption('en')
    await expect(selector).toBeFocused()
    await expect(page.getByRole('heading', { name: 'Мой проект' })).toBeVisible()
    await page.getByRole('button', { name: 'Add status' }).click()
    await expect(dialog).toHaveAccessibleName('New status')
    await expect(dialog.getByLabel('Status name')).toHaveValue('')
    await dialog.getByLabel('Status name').fill('Незавершённый черновик')
    await dialog.getByRole('button', { name: 'Create status' }).click()
    await expect(page.getByRole('heading', { name: 'Незавершённый черновик' })).toBeVisible()
  })
}
