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
    const manifest = await fetch('/tracker/manifest.webmanifest').then(response => response.json())
    const iconStatuses = await Promise.all(manifest.icons.map((icon: { src: string }) => fetch(`/tracker/${icon.src}`).then(response => response.status)))
    return { manifest, iconStatuses, registration: Boolean(await navigator.serviceWorker.getRegistration('/tracker/')) }
  })
  expect(metadata.manifest).toMatchObject({ name: 'EasyTrack', scope: '/tracker/', start_url: '/tracker/' })
  expect(metadata.iconStatuses).toEqual([200, 200])
  expect(metadata.registration).toBe(true)

  await page.getByLabel('Новый проект').fill('Поиск квартиры')
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
