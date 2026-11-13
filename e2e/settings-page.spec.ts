import { expect, test, type Page } from '@playwright/test'
import { edgeCasesBackup } from '../src/test/backup-fixtures'
import { viewportFor } from './viewports'

const gear = (page: Page) => page.getByRole('button', { name: 'Настройки', exact: true })
const back = (page: Page) => page.getByRole('button', { name: 'Назад', exact: true })
const heading = (page: Page) => page.getByRole('heading', { name: 'Настройки', exact: true })

async function seedBoard(page: Page) {
  await page.goto('/tracker/')
  await expect(page.getByRole('banner').getByRole('button', { name: 'Создать проект' })).toBeVisible()
  await page.evaluate(async () => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open('personal-project-tracker')
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(['projects', 'statuses', 'cards'], 'readwrite')
      tx.objectStore('projects').put({ id: 'p', name: 'Project', createdAt: '2026-11-06T00:00:00.000Z' })
      tx.objectStore('statuses').put({ id: 's', projectId: 'p', name: 'Todo', position: 0 })
      tx.objectStore('cards').put({ id: 'c', statusId: 's', name: 'Card', position: 0, description: 'Saved', important: false, urgent: false })
      tx.oncomplete = () => resolve()
      tx.onabort = () => reject(tx.error)
    })
    db.close()
  })
  await page.goto('/tracker/#project/p')
  await expect(page.getByRole('heading', { name: 'Project' })).toBeVisible()
}

test('keeps direct settings across a reload and replaces the entry with the catalogue on Back', async ({ page }) => {
  await page.goto('/tracker/#settings')
  await expect(heading(page)).toBeFocused()
  await expect(page.getByRole('region', { name: 'Данные' })).toBeVisible()
  await page.reload()
  await expect(heading(page)).toBeFocused()
  await back(page).click()
  await expect(page).toHaveURL(/\/tracker\/$/)
  await expect(gear(page)).toBeFocused()
})

test('keeps the board history entry across a settings reload', async ({ page }) => {
  await seedBoard(page)
  await gear(page).click()
  await page.reload()
  await expect(heading(page)).toBeFocused()
  await page.goBack()
  await expect(page.getByRole('heading', { name: 'Project' })).toBeVisible()
  await expect(gear(page)).toBeFocused()
})

for (const presentation of ['panel', 'page'] as const) {
  test(`protects a ${presentation} draft and restores the card and gear on Back`, async ({ page }) => {
    await seedBoard(page)
    await page.getByRole('link', { name: 'Card' }).click()
    if (presentation === 'page') await page.getByRole('button', { name: 'Открыть на всю страницу' }).click()
    await page.getByRole('button', { name: 'Редактировать основное' }).click()
    const description = page.getByRole('textbox', { name: 'Описание карточки' })
    await description.fill('Unsaved')
    await gear(page).click()
    const guard = page.getByRole('dialog', { name: 'Несохранённые изменения' })
    await guard.getByRole('button', { name: 'Остаться' }).click()
    await expect(description).toHaveValue('Unsaved')
    await gear(page).click()
    await guard.getByRole('button', { name: presentation === 'panel' ? 'Выйти без сохранения' : 'Сохранить и выйти' }).click()
    await expect(heading(page)).toBeFocused()
    await back(page).click()
    await expect(page).toHaveURL(/#project\/p\/card\/c$/)
    if (presentation === 'panel') await expect(page.locator('.card-panel')).toBeVisible()
    else await expect(page.getByRole('heading', { name: 'Card', level: 1 })).toBeVisible()
    await expect(gear(page)).toBeFocused()
    await expect(page.locator('.card-detail')).toContainText(presentation === 'panel' ? 'Saved' : 'Unsaved')
  })
}

test('restoring a copy from settings shows the restored catalogue and notification', async ({ page }) => {
  await page.goto('/tracker/#settings')
  const file = page.waitForEvent('filechooser')
  await page.getByRole('button', { name: 'Восстановить из резервной копии' }).click()
  const copy = edgeCasesBackup()
  await (await file).setFiles({ name: 'copy.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(copy)) })
  await page.getByRole('dialog').getByRole('button', { name: 'Заменить' }).click()
  await expect(page).toHaveURL(/\/tracker\/$/)
  await expect(page.getByRole('button', { name: copy.data.projects[0].name, exact: true })).toBeVisible()
  await expect(page.locator('.notification-transient')).toContainText('Данные восстановлены из резервной копии')
})

for (const width of [320, 1280]) for (const language of ['ru', 'en'] as const) {
  test(`direct settings fit at ${width}px in ${language}`, async ({ page }, info) => {
    await page.setViewportSize(viewportFor(width))
    await page.addInitScript(locale => { localStorage.setItem('easytrack.locale', locale) }, language)
    await page.goto('/tracker/#settings')
    const en = language === 'en'
    await expect(page.getByRole('heading', { name: en ? 'Settings' : 'Настройки', exact: true })).toBeFocused()
    await expect(page.getByRole('heading', { level: 2 })).toHaveText(en ? ['Appearance', 'Data', 'Application'] : ['Внешний вид', 'Данные', 'Приложение'])
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    await page.screenshot({ path: info.outputPath(`settings-ready-${language}-${width}.png`), fullPage: true })
  })
}

test('direct settings work with storage unavailable', async ({ page }) => {
  await page.addInitScript(() => { indexedDB.open = () => { throw Error('Storage unavailable') } })
  await page.goto('/tracker/#settings')
  await expect(heading(page)).toBeFocused()
  await expect(page.getByRole('heading', { level: 2 })).toHaveText(['Внешний вид', 'Приложение'])
  await back(page).click()
  await expect(page.getByRole('heading', { name: 'Рабочая доска недоступна' })).toBeVisible()
  await expect(gear(page)).toBeFocused()
})
