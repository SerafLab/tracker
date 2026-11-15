import { expect, test, type Page } from '@playwright/test'
import { referenceViewports } from './viewports'

const project = 'viewports'
const statuses = ['Идеи и предложения на будущее', 'В работе', 'На проверке', 'Завершено']

async function seed(page: Page, language: 'ru' | 'en') {
  await page.addInitScript(language => localStorage.setItem('easytrack.locale', language), language)
  await page.goto('/tracker/')
  await expect(page.locator('.app-brand')).toBeVisible()
  await page.evaluate(async ({ project, statuses }) => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => { const request = indexedDB.open('personal-project-tracker'); request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error) })
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(['projects', 'statuses', 'cards'], 'readwrite')
      tx.objectStore('projects').put({ id: project, name: 'Переезд в новую квартиру с ремонтом кухни', createdAt: '2026-11-06T00:00:00Z' })
      statuses.forEach((name, index) => {
        tx.objectStore('statuses').put({ id: `s${index}`, projectId: project, name, position: index })
        for (let card = 0; card < 6; card++) tx.objectStore('cards').put({ id: `c${index}-${card}`, statusId: `s${index}`, name: `Карточка ${card + 1}: ${'длинное название '.repeat(card % 3)}`, description: card === 0 ? 'Описание '.repeat(20) : '', important: card === 1, urgent: card === 2, position: card })
      })
      tx.oncomplete = () => resolve(); tx.onerror = () => reject(tx.error)
    })
    db.close()
  }, { project, statuses })
}

async function expectScreenFits(page: Page, en: boolean, plus?: string, board = false) {
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true)
  const bar = page.locator('.app-bar').filter({ visible: true })
  const gear = bar.getByRole('button', { name: en ? 'Settings' : 'Настройки', exact: true })
  await expect(bar.locator('.app-brand')).toBeInViewport({ ratio: 1 })
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  if (plus) await expect(bar.getByRole('button', { name: plus, exact: true })).toBeInViewport({ ratio: 1 })
  await expect(gear).toBeInViewport({ ratio: 1 })
  if (board) {
    const actions = bar.getByRole('button', { name: en ? 'Project actions' : 'Действия проекта', exact: true })
    await expect(actions).toBeInViewport({ ratio: 1 })
    await actions.click()
    await expect(page.locator('.bar-menu')).toBeInViewport({ ratio: 1 })
    await page.keyboard.press('Escape')
    await expect(actions).toBeFocused()
  }
}

for (const { width, height } of referenceViewports) for (const language of ['ru', 'en'] as const) {
  test(`main screens fit the ${width}x${height} reference size in ${language}`, async ({ page }) => {
    const en = language === 'en'
    await page.setViewportSize({ width, height })
    await seed(page, language)

    await test.step('catalogue', async () => {
      await page.reload()
      await expect(page.locator('.project-card')).toHaveCount(1)
      await expectScreenFits(page, en, en ? 'Create project' : 'Создать проект')
    })
    await test.step('board', async () => {
      await page.goto(`/tracker/#project/${project}`)
      await expect(page.getByRole('heading', { level: 2 })).toHaveCount(statuses.length)
      await expectScreenFits(page, en, en ? 'Add status' : 'Добавить статус', true)
    })
    await test.step('settings', async () => {
      await page.getByRole('button', { name: en ? 'Settings' : 'Настройки', exact: true }).click()
      const heading = page.getByRole('heading', { name: en ? 'Settings' : 'Настройки', exact: true })
      await expect(heading).toBeFocused()
      const back = page.getByRole('button', { name: en ? 'Back' : 'Назад', exact: true })
      await expect(page.locator('.app-brand')).toBeInViewport({ ratio: 1 })
      await expect(back).toBeInViewport({ ratio: 1 })
      await expect(page.getByRole('heading', { level: 2 })).toHaveText(en ? ['Appearance', 'Data', 'Application'] : ['Внешний вид', 'Данные', 'Приложение'])
      await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true)
      await back.click()
      await expect(page.getByRole('button', { name: en ? 'Settings' : 'Настройки', exact: true })).toBeFocused()
    })
    await test.step('card panel', async () => {
      await page.locator('.work-card').first().getByRole('link').first().click()
      const panel = page.locator('.card-panel')
      await expect(panel).toBeVisible()
      await expect(panel.getByRole('button', { name: en ? 'Open full page' : 'Открыть на всю страницу', exact: true })).toBeInViewport({ ratio: 1 })
      await expect(panel.getByRole('button', { name: en ? 'Close card' : 'Закрыть карточку', exact: true })).toBeInViewport({ ratio: 1 })
      // Up to 960 px the panel covers the whole screen, application bar included.
      if (width <= 960) await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true)
      else await expectScreenFits(page, en)
    })
    await test.step('full card page', async () => {
      await page.goto(`/tracker/#project/${project}/card/c0-0`)
      await page.reload()
      await expect(page.locator('.card-panel')).toHaveCount(0)
      await expect(page.locator('.card-detail')).toBeVisible()
      await expectScreenFits(page, en)
    })
  })
}
