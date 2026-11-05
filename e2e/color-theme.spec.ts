import { expect, test, type Page } from '@playwright/test'

test.use({ locale: 'en-US' })

const accent = (page: Page) => page.locator('.add-card-header').first().evaluate(element => getComputedStyle(element).backgroundColor)
const green = 'rgb(49, 95, 72)'
const ink = 'rgb(45, 73, 109)'

async function createBoard(page: Page, name: string) {
  await page.getByRole('button', { name: 'Create project', exact: true }).click()
  await page.getByRole('dialog').getByRole('textbox').fill(name)
  await page.getByRole('dialog').getByRole('combobox', { name: 'Status set' }).selectOption('empty')
  await page.getByRole('dialog').getByRole('button', { name: 'Create project', exact: true }).click()
  await page.getByRole('button', { name: 'Add status', exact: true }).click()
  await page.getByRole('dialog').getByRole('textbox').fill('Todo')
  await page.getByRole('dialog').getByRole('button', { name: 'Create status', exact: true }).click()
  await expect(page.getByRole('dialog')).toBeHidden()
  await page.locator('.add-card-header').first().click()
  const dialog = page.getByRole('dialog')
  await dialog.getByRole('textbox').fill('Themed card')
  await dialog.getByRole('checkbox', { name: 'Important', exact: true }).check()
  await dialog.getByRole('checkbox', { name: 'Urgent', exact: true }).check()
  await dialog.getByRole('button', { name: 'Create card', exact: true }).click()
  await expect(dialog).toBeHidden()
  await expect(page.locator('.work-card')).toBeVisible()
}
async function chooseTheme(page: Page, theme: 'Green' | 'Ink') {
  await page.getByRole('button', { name: 'Settings', exact: true }).click()
  await page.getByRole('combobox', { name: 'Color theme' }).selectOption(theme)
}

test('switching to Ink recolours the open board without reload and applies everywhere', async ({ page }) => {
  await page.goto('/tracker/')
  await createBoard(page, 'First')
  const url = page.url()
  expect(await accent(page)).toBe(green)
  const canvas = await page.evaluate(() => getComputedStyle(document.body).backgroundColor)
  await chooseTheme(page, 'Ink')
  await expect.poll(() => accent(page)).toBe(ink)
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'ink')
  expect(page.url()).toBe(url)
  await expect(page.locator('.work-card')).toBeVisible()
  expect(await page.evaluate(() => getComputedStyle(document.body).backgroundColor)).toBe(canvas)
  await page.keyboard.press('Escape')

  await page.getByRole('button', { name: /All projects/ }).click()
  await expect(page.getByRole('heading', { level: 1, name: 'First' })).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Create project', exact: true })).toHaveCSS('background-color', ink)
  await page.getByRole('button', { name: 'Create project', exact: true }).click()
  await page.getByRole('dialog').getByRole('textbox').fill('Second')
  await page.getByRole('dialog').getByRole('button', { name: 'Create project', exact: true }).click()
  await expect(page.getByRole('heading', { level: 1, name: 'Second' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Add status', exact: true })).toHaveCSS('background-color', ink)

  await page.reload()
  await expect(page.getByRole('heading', { level: 1, name: 'Second' })).toBeVisible()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'ink')
  await expect(page.getByRole('button', { name: 'Add status', exact: true })).toHaveCSS('background-color', ink)
  await chooseTheme(page, 'Green')
  await expect(page.locator('html')).not.toHaveAttribute('data-theme')
  await expect(page.getByRole('button', { name: 'Add status', exact: true })).toHaveCSS('background-color', green)
})

test('a saved Ink theme is applied before the application renders', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('easytrack.theme', 'ink')
    new MutationObserver(() => {
      if (document.getElementById('root') && !(window as unknown as Record<string, unknown>).themeAtRoot) (window as unknown as Record<string, unknown>).themeAtRoot = document.documentElement.dataset.theme
    }).observe(document, { childList: true, subtree: true })
  })
  await page.goto('/tracker/')
  await expect(page.getByRole('button', { name: 'Create project', exact: true })).toHaveCSS('background-color', ink)
  expect(await page.evaluate(() => (window as unknown as Record<string, unknown>).themeAtRoot)).toBe('ink')
})

test('an unknown stored theme falls back to Green', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('easytrack.theme', 'plum'))
  await page.goto('/tracker/')
  await expect(page.locator('html')).not.toHaveAttribute('data-theme')
  await page.getByRole('button', { name: 'Settings', exact: true }).click()
  await expect(page.getByRole('combobox', { name: 'Color theme' })).toHaveValue('green')
})

test('Ink leaves no green on the board, including hover and focus', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('easytrack.theme', 'ink'))
  await page.goto('/tracker/')
  await createBoard(page, 'Ink board')
  await page.locator('.work-card').hover()
  await page.getByRole('button', { name: 'Settings', exact: true }).focus()
  const greenish = await page.evaluate(() => {
    const isGreen = (value: string) => {
      const [r, g, b] = (value.match(/[\d.]+/g) ?? []).slice(0, 3).map(Number)
      return g !== undefined && g - r >= 4 && g - b >= 4
    }
    return [...document.querySelectorAll('body, body *')].flatMap(element => {
      const style = getComputedStyle(element)
      return [style.color, style.backgroundColor, style.borderTopColor, style.outlineColor].some(isGreen) ? [element.className || element.tagName] : []
    })
  })
  expect(greenish).toEqual([])
})
