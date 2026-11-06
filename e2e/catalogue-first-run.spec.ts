import { expect, test, type Page } from '@playwright/test'
import { referenceViewports } from './viewports'

type Language = 'ru' | 'en'
const text = {
  ru: { heading: 'Начните с первого проекта', create: 'Создать проект', project: 'Первый проект', statuses: ['Нужно сделать', 'В процессе', 'Готово'], error: 'Не удалось сохранить' },
  en: { heading: 'Start with your first project', create: 'Create project', project: 'First project', statuses: ['To do', 'In progress', 'Done'], error: 'Could not save' },
}

const block = (page: Page) => page.locator('.catalogue-first-run-block')
const quickCreate = (page: Page, language: Language) => page.getByRole('main').getByRole('button', { name: text[language].create, exact: true })
const box = async (locator: ReturnType<Page['locator']>) => (await locator.boundingBox())!

async function open(page: Page, language: Language, size?: { width: number; height: number }) {
  if (size) await page.setViewportSize(size)
  await page.addInitScript(language => localStorage.setItem('easytrack.locale', language), language)
  await page.goto('/tracker/')
  await expect(block(page)).toBeVisible()
}

for (const size of referenceViewports) for (const language of ['ru', 'en'] as const) {
  test(`empty catalogue block is placed at ${size.width}x${size.height} in ${language}`, async ({ page }) => {
    await open(page, language, size)
    const { width, height } = size
    await expect(page.getByRole('heading', { level: 2, name: text[language].heading })).toBeVisible()
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)

    const bar = await box(page.locator('.app-bar'))
    const area = await box(block(page))
    const barBottom = bar.y + bar.height
    expect(Math.abs(area.x + area.width / 2 - width / 2)).toBeLessThanOrEqual(1)
    const heading = page.getByRole('heading', { level: 2 })
    expect(await heading.evaluate(element => getComputedStyle(element).textAlign)).toBe('center')

    const above = area.y - barBottom
    const below = height - (area.y + area.height)
    if (width >= 1280) {
      // Free height is the space left above and below the block.
      const share = above / (above + below)
      expect(share).toBeGreaterThanOrEqual(0.35)
      expect(share).toBeLessThanOrEqual(0.45)
    }
    if ((width === 820 && height === 1180) || (width === 390 && height === 844)) {
      expect(above).toBeGreaterThanOrEqual(24)
      expect(above).toBeLessThan(below)
    }
    if ((width === 568 && height === 320) || (width === 320 && height === 568)) {
      await expect(heading).toBeInViewport({ ratio: 1 })
      await expect(quickCreate(page, language)).toBeInViewport({ ratio: 1 })
    }
    if (width <= 650) {
      const button = await box(quickCreate(page, language))
      expect(Math.abs(button.width - area.width)).toBeLessThanOrEqual(1)
    }
  })
}

async function stored(page: Page) {
  return page.evaluate(() => new Promise<{ projects: string[]; statuses: string[] }>((resolve, reject) => {
    const request = indexedDB.open('personal-project-tracker')
    request.onerror = () => reject(request.error)
    request.onsuccess = () => {
      const db = request.result
      const transaction = db.transaction(['projects', 'statuses'])
      const projects = transaction.objectStore('projects').getAll()
      const statuses = transaction.objectStore('statuses').getAll()
      transaction.oncomplete = () => {
        db.close()
        resolve({ projects: projects.result.map(item => item.name), statuses: statuses.result.sort((a, b) => a.position - b.position).map(item => item.name) })
      }
      transaction.onerror = () => reject(transaction.error)
    }
  }))
}

for (const language of ['ru', 'en'] as const) {
  test(`one press creates ${text[language].project} with three statuses and it survives a reload (${language})`, async ({ page }) => {
    await open(page, language)
    await quickCreate(page, language).click()
    await expect(page.getByRole('heading', { level: 1, name: text[language].project, exact: true })).toBeVisible()
    await expect(page.getByRole('dialog')).toHaveCount(0)
    await expect(page.locator('.column-title')).toHaveText(text[language].statuses)
    await page.reload()
    await expect(page.getByRole('heading', { level: 1, name: text[language].project, exact: true })).toBeVisible()
    expect(await stored(page)).toEqual({ projects: [text[language].project], statuses: text[language].statuses })
  })

  test(`a failed quick creation keeps the block in place, shows the error and allows a retry (${language})`, async ({ page }) => {
    await page.addInitScript(() => {
      const add = IDBObjectStore.prototype.add
      ;(window as unknown as { failCreate: boolean }).failCreate = true
      IDBObjectStore.prototype.add = function (...args) {
        if (this.name === 'statuses' && (window as unknown as { failCreate: boolean }).failCreate) throw Error('Test write unavailable')
        return add.apply(this, args)
      }
    })
    await open(page, language, { width: 390, height: 844 })
    const button = quickCreate(page, language)
    const before = await box(button)
    const headingBefore = await box(page.getByRole('heading', { level: 2 }))
    await button.click()
    await expect(block(page).getByRole('alert')).toContainText(text[language].error)
    await expect(button).not.toHaveAttribute('aria-disabled', 'true')
    await expect(button).toBeFocused()
    expect(await box(button)).toEqual(before)
    expect(await box(page.getByRole('heading', { level: 2 }))).toEqual(headingBefore)
    expect(await stored(page)).toEqual({ projects: [], statuses: [] })
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)

    await page.evaluate(() => { (window as unknown as { failCreate: boolean }).failCreate = false })
    await button.click()
    await expect(page.getByRole('heading', { level: 1, name: text[language].project, exact: true })).toBeVisible()
    expect(await stored(page)).toEqual({ projects: [text[language].project], statuses: text[language].statuses })
  })
}

test('the app bar plus still opens the creation dialog in an empty catalogue', async ({ page }) => {
  await open(page, 'ru')
  await page.getByRole('banner').getByRole('button', { name: 'Создать проект', exact: true }).click()
  await expect(page.getByRole('dialog').getByRole('textbox')).toBeFocused()
})
