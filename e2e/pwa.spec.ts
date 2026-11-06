import { expect, test } from '@playwright/test'
import { viewportFor } from './viewports'

const app = '/tracker/'

async function openAndControl(page: import('@playwright/test').Page) {
  await page.goto(app)
  await expect(page.getByRole('banner').getByRole('button', { name: 'Создать проект' })).toBeVisible()
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

  await page.getByRole('banner').getByRole('button', { name: 'Создать проект' }).click()
  await page.getByLabel('Название проекта').fill('Поиск квартиры')
  await page.getByRole('dialog').getByRole('combobox').selectOption('empty')
  await page.getByRole('dialog').getByRole('button', { name: 'Создать проект' }).click()
  await expect(page.getByRole('heading', { name: 'Поиск квартиры' })).toBeVisible()
  await context.setOffline(true)
  await page.goto(app)
  await expect(page.getByRole('heading', { name: 'Поиск квартиры' })).toBeVisible()
  await page.setViewportSize(viewportFor(390))
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
    await page.setViewportSize(viewportFor(320))
    await page.getByRole('button', {name: /^(Настройки|Settings)$/}).click()
    const item = page.getByRole('menuitemradio', { name: locale === 'en' ? 'English' : 'Русский' })
    const other = page.getByRole('menuitemradio', { name: locale === 'en' ? 'Русский' : 'English' })
    // Start from the other language so the keyboard choice is a real change.
    if (await item.getAttribute('aria-checked') === 'true') { await other.click(); await expect(other).toHaveAttribute('aria-checked', 'true') }
    await expect(item).toHaveAttribute('aria-checked', 'false')
    await item.focus()
    await page.keyboard.press('Enter')
    await expect(item).toHaveAttribute('aria-checked', 'true')
    await expect(item).toBeFocused()
    // The menu repositions itself after the language change resizes it, so wait for the settled position.
    await expect.poll(async () => {
      const bounds = (await page.getByRole('menu').boundingBox())!
      return bounds.x >= 0 && bounds.x + bounds.width <= 320
    }).toBe(true)
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
    await expect(page.getByRole('group')).toHaveCount(2)
    await expect(page.getByRole('group', { name: /^(Application language|Язык приложения)$/ })).toHaveCount(1)
    await expect(page.getByRole('group', { name: /^(Application color theme|Цветовая тема приложения)$/ })).toHaveCount(1)
    await expect(page.getByRole('menuitemradio', { name: locale === 'en' ? 'English' : 'Русский' })).toHaveAttribute('aria-checked', 'true')
    await expect(page.getByRole('banner').getByRole('button', { name: locale === 'en' ? 'Create project' : 'Создать проект' })).toBeVisible()
    expect(await page.evaluate(async () => {
      const active = document.querySelector<HTMLLinkElement>('link[rel="manifest"]')!
      return (await fetch(active.href).then(response => response.json())).lang
    })).toBe(locale)
    await page.screenshot({ path: `test-results/locale-${locale}-mobile.png`, fullPage: true })
  })
}

for (const width of [1280, 320]) {
  test(`switches language after closing an unfinished dialog at ${width}px`, async ({ page }) => {
    await page.setViewportSize(viewportFor(width))
    await page.goto(app)
    await page.getByRole('banner').getByRole('button', { name: 'Создать проект' }).click()
    await page.getByLabel('Название проекта').fill('Мой проект')
    await page.getByRole('dialog').getByRole('combobox').selectOption('empty')
    await page.getByRole('dialog').getByRole('button', { name: 'Создать проект' }).click()
    await expect(page.getByRole('heading', { name: 'Мой проект' })).toBeVisible()
    await page.getByRole('button', { name: 'Добавить статус' }).first().click()
    await page.getByLabel('Название статуса').fill('Незавершённый черновик')
    const dialog = page.getByRole('dialog')
    await expect(dialog.getByRole('menuitemradio')).toHaveCount(0)
    await expect(page.getByRole('menuitemradio')).toHaveCount(0)
    await page.keyboard.press('Escape')
    await page.getByRole('button', {name: /^(Настройки|Settings)$/}).click()
    const selector = page.getByRole('menuitemradio', { name: 'English' })
    await selector.focus()
    await page.keyboard.press('Enter')
    await expect(selector).toHaveAttribute('aria-checked', 'true')
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

test.describe('first-visit installation invitation', () => {
  test.use({ storageState: { cookies: [], origins: [] } })

  for (const [language, width] of [['ru', 320], ['en', 1280]] as const) test(`opens on first visit until dismissed permanently in ${language} at ${width}px`, async ({ page }) => {
    const en = language === 'en'
    await page.setViewportSize(viewportFor(width))
    await page.addInitScript(locale => localStorage.setItem('easytrack.locale', locale), language)
    await page.goto(app)
    const invitation = page.getByRole('dialog', { name: en ? 'You can install EasyTrack' : 'EasyTrack можно установить' })
    await expect(invitation).toBeVisible()
    await expect(invitation).toContainText(en ? 'do not sync' : 'не синхронизируются')
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    // Closing without the checkbox brings the invitation back on the next launch.
    await invitation.getByRole('button', { name: en ? 'Close' : 'Закрыть' }).last().click()
    await expect(invitation).toBeHidden()
    await page.reload()
    await expect(invitation).toBeVisible()
    await invitation.getByRole('checkbox', { name: en ? 'Don’t show again' : 'Больше не показывать' }).check()
    await page.keyboard.press('Escape')
    await expect(invitation).toBeHidden()
    await page.reload()
    await expect(page.getByRole('banner').getByRole('button', { name: en ? 'Create project' : 'Создать проект' })).toBeVisible()
    await expect(page.getByRole('dialog')).toHaveCount(0)
    // The settings entry stays available after dismissal.
    await page.getByRole('button', { name: en ? 'Settings' : 'Настройки' }).click()
    await page.getByRole('menuitem', { name: en ? 'How to install EasyTrack' : 'Как установить EasyTrack' }).click()
    await expect(page.getByRole('dialog', { name: en ? 'Install EasyTrack' : 'Установить EasyTrack' })).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(page.getByRole('button', { name: en ? 'Settings' : 'Настройки' })).toBeFocused()
  })

  test('does not open in the installed application', async ({ page }) => {
    await page.addInitScript(() => {
      const original = window.matchMedia.bind(window)
      window.matchMedia = query => query === '(display-mode: standalone)' ? { ...original(query), matches: true, media: query } as MediaQueryList : original(query)
    })
    await page.goto(app)
    await expect(page.getByRole('banner').getByRole('button', { name: 'Создать проект' })).toBeVisible()
    await expect(page.getByRole('dialog')).toHaveCount(0)
    await page.getByRole('button', { name: 'Настройки' }).click()
    await page.getByRole('menuitem', { name: 'Где хранятся проекты' }).click()
    await expect(page.getByRole('dialog', { name: 'Где хранятся проекты' })).toContainText('не синхронизируются')
  })
})
