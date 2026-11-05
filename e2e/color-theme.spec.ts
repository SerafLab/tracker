import { expect, test, type Page } from '@playwright/test'
import { selectTheme } from './theme'

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
test('switching to Ink recolours the open board without reload and applies everywhere', async ({ page }) => {
  await page.goto('/tracker/')
  await createBoard(page, 'First')
  const url = page.url()
  expect(await accent(page)).toBe(green)
  const canvas = await page.evaluate(() => getComputedStyle(document.body).backgroundColor)
  await selectTheme(page, 'ink')
  await expect.poll(() => accent(page)).toBe(ink)
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'ink')
  expect(page.url()).toBe(url)
  await expect(page.locator('.work-card')).toBeVisible()
  expect(await page.evaluate(() => getComputedStyle(document.body).backgroundColor)).toBe(canvas)

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
  await selectTheme(page, 'green')
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
  await expect(page.getByRole('group', { name: 'Application color theme' })).toHaveCount(1)
  await expect(page.getByRole('menuitemradio', { name: 'Green' })).toHaveAttribute('aria-checked', 'true')
  await expect(page.getByRole('menuitemradio', { name: 'Ink' })).toHaveAttribute('aria-checked', 'false')
})

const greenElements = (page: Page) => page.evaluate(() => {
  const isGreen = (value: string) => {
    const [r, g, b] = (value.match(/[\d.]+/g) ?? []).slice(0, 3).map(Number)
    return g !== undefined && g - r >= 4 && g - b >= 4
  }
  return [...document.querySelectorAll('body, body *')].flatMap(element => {
    const style = getComputedStyle(element)
    const colors = [style.color, style.backgroundColor, style.borderTopColor, style.outlineColor, style.boxShadow, style.scrollbarColor, getComputedStyle(element, '::selection').backgroundColor, getComputedStyle(element, '::selection').color]
    return colors.some(value => isGreen(value) || /rgba?\(\s*(?:28, 48, 43|18, 39, 30)\b/.test(value)) ? [element.className || element.tagName] : []
  })
})

test('Ink leaves no green on the board in hover, keyboard focus, selection, scrolling, menus, skeletons and dragging', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('easytrack.theme', 'ink'))
  await page.goto('/tracker/')
  await createBoard(page, 'Ink board')
  await page.locator('.add-card-header').first().click()
  await page.getByRole('dialog').getByRole('textbox').fill('Second card')
  await page.getByRole('dialog').getByRole('button', { name: 'Create card', exact: true }).click()
  await expect(page.locator('.work-card')).toHaveCount(2)

  await page.locator('.work-card').first().hover()
  expect(await greenElements(page)).toEqual([])

  await page.locator('body').click({ position: { x: 1, y: 1 } })
  await page.keyboard.press('Tab')
  await expect(page.locator(':focus-visible')).toBeVisible()
  await expect(page.locator(':focus-visible')).toHaveCSS('outline-color', 'rgb(39, 87, 147)')
  expect(await greenElements(page)).toEqual([])

  const name = page.locator('.card-name').first()
  expect(await name.evaluate(element => { const style = getComputedStyle(element, '::selection'); return [style.backgroundColor, style.color] })).toEqual(['rgb(203, 221, 244)', 'rgb(29, 44, 63)'])
  await expect(page.locator('.board-workspace > main')).toHaveCSS('scrollbar-color', 'rgb(153, 166, 184) rgb(245, 244, 240)')

  await page.evaluate(() => { const bone = document.createElement('div'); bone.className = 'skeleton'; bone.id = 'probe-skeleton'; bone.style.height = '8px'; document.body.append(bone) })
  await expect(page.locator('#probe-skeleton')).toHaveCSS('background-color', 'rgb(223, 230, 239)')
  await page.locator('#probe-skeleton').evaluate(element => element.remove())

  await page.getByRole('button', { name: 'Settings', exact: true }).click()
  await expect(page.locator('.settings-panel')).toBeVisible()
  expect(await page.locator('.settings-panel').evaluate(element => getComputedStyle(element).boxShadow)).toContain('rgba(22, 35, 51')
  expect(await greenElements(page)).toEqual([])
  await page.keyboard.press('Escape')
  await expect(page.locator('.settings-panel')).toBeHidden()

  const card = page.locator('.work-card').first()
  const box = await card.boundingBox()
  await page.mouse.move(box!.x + 25, box!.y + 25); await page.mouse.down()
  await page.mouse.move(box!.x + 40, box!.y + 25, { steps: 3 })
  await expect(card).toHaveAttribute('data-dragging', 'true')
  const target = await page.locator('.work-card').nth(1).boundingBox()
  await page.mouse.move(target!.x + 25, target!.y + target!.height - 5, { steps: 12 })
  const marker = page.locator('.card-placement-marker')
  await expect(marker).toBeVisible()
  await expect(marker).toHaveCSS('background-color', 'rgb(226, 234, 244)')
  expect(await greenElements(page)).toEqual([])
  await page.mouse.up()
})

test('a theme choice that cannot be saved still applies and warns in the settings menu', async ({ page }) => {
  await page.addInitScript(() => { Storage.prototype.setItem = () => { throw Error('blocked') } })
  await page.goto('/tracker/')
  await page.getByRole('button', { name: 'Settings', exact: true }).click()
  await page.getByRole('menuitemradio', { name: 'Ink' }).click()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'ink')
  await expect(page.getByRole('alert')).toContainText('Could not save your color theme')
  await expect(page.getByRole('menuitemradio', { name: 'Ink' })).toHaveAttribute('aria-checked', 'true')
  await expect(page.getByRole('group', { name: 'Application color theme' })).toHaveCount(1)
  await expect(page.getByRole('group', { name: 'Application language' })).toHaveCount(1)
})
