import { expect, test, type Locator, type Page } from '@playwright/test'
import { enterEdit, leaveCard, saveEdit, summaryOf } from './card-helpers'
import { dismissedInstallInvitation } from './storage-state'

async function setup(page: Page, en = false) {
  await page.addInitScript(() => {
    const put = IDBObjectStore.prototype.put
    ;(window as unknown as { cardWrites: number }).cardWrites = 0
    IDBObjectStore.prototype.put = function (...args) {
      if (this.name === 'cards') (window as unknown as { cardWrites: number }).cardWrites++
      return put.apply(this, args)
    }
  })
  await page.goto('/tracker/')
  if (en) { await page.getByRole('button', { name: 'Настройки', exact: true }).click(); await page.getByRole('combobox', { name: 'Язык приложения' }).selectOption('en'); await page.keyboard.press('Escape') }
  await page.getByRole('button', { name: en ? 'Create project' : 'Создать проект', exact: true }).click()
  await page.getByRole('dialog').getByRole('textbox').fill('Drag project')
  await page.getByRole('dialog').getByRole('combobox').selectOption('empty')
  await page.getByRole('dialog').getByRole('button', { name: en ? 'Create project' : 'Создать проект', exact: true }).click()
  for (const name of ['A', 'B', 'Empty']) {
    await page.getByRole('button', { name: en ? 'Add status' : 'Добавить статус', exact: true }).click()
    await page.getByRole('dialog').getByRole('textbox').fill(name)
    await page.getByRole('dialog').getByRole('button', { name: en ? 'Create status' : 'Создать статус', exact: true }).click()
    await expect(page.getByRole('dialog')).toBeHidden()
  }
  for (const [status, name, important, urgent] of [
    ['A', 'Both', true, true], ['A', 'A1', true, false], ['A', 'A2', true, false], ['A', 'Urgent', false, true], ['A', 'None', false, false],
    ['B', 'B1', true, false], ['B', 'B2', true, false], ['B', 'Bottom', false, false],
  ] as const) {
    await column(page, status).locator('.add-card-header').click()
    const dialog = page.getByRole('dialog')
    await dialog.getByRole('textbox').fill(name)
    if (important) await dialog.getByRole('checkbox', { name: en ? 'Important' : 'Важная', exact: true }).check()
    if (urgent) await dialog.getByRole('checkbox', { name: en ? 'Urgent' : 'Срочная', exact: true }).check()
    await dialog.getByRole('button', { name: en ? 'Create card' : 'Создать карточку', exact: true }).click()
    await expect(dialog).toBeHidden()
  }
}
const column = (page: Page, name: string) => page.locator('.status-column').filter({ has: page.getByRole('heading', { name, exact: true }) })
const card = (page: Page, name: string) => page.locator('.work-card').filter({ has: page.getByRole('link', { name, exact: true }) })
const names = (page: Page, status: string) => column(page, status).locator('.card-name')
const writes = (page: Page) => page.evaluate(() => (window as unknown as { cardWrites: number }).cardWrites)
async function start(page: Page, source: Locator, area: 'name' | 'badge' | 'body' = 'name') {
  await source.scrollIntoViewIfNeeded()
  const box = await source.boundingBox()
  const badge = area === 'badge' ? await source.locator('.card-badge').first().boundingBox() : null
  const point = { x: badge ? badge.x + 10 : box!.x + 25, y: badge ? badge.y + 5 : area === 'body' ? box!.y + box!.height - 6 : box!.y + 25 }
  await page.mouse.move(point.x, point.y); await page.mouse.down()
  await page.mouse.move(point.x + 15, point.y, { steps: 3 })
  await expect(source).toHaveAttribute('data-dragging', 'true')
}
async function hover(page: Page, target: Locator, position: 'start' | 'end' = 'start') {
  const box = await target.boundingBox()
  await page.mouse.move(box!.x + 25, position === 'start' ? box!.y + 5 : box!.y + box!.height - 5, { steps: 12 })
  await expect(page.locator('.card-placement-marker')).toBeVisible()
}

for (const en of [false, true]) test(`projects exact legal gaps, cancels safely, persists groups and keeps clicks independent in ${en ? 'en' : 'ru'}`, async ({ page, context }, info) => {
  await page.setViewportSize({ width: 1280, height: 1000 }); await setup(page, en)
  await expect(page.locator('.card-move-arrows, .card-controls')).toHaveCount(0)
  await expect(card(page, 'A1')).not.toHaveAttribute('role', 'button')
  await expect(card(page, 'A1')).not.toHaveAttribute('tabindex', '0')
  const before = await writes(page)
  await start(page, card(page, 'A2')); await hover(page, card(page, 'A1'))
  await expect(names(page, 'A')).toHaveText(['Both', 'A1', 'A2', 'Urgent', 'None'])
  expect(await writes(page)).toBe(before)
  await expect(page.locator('.drag-card-preview button')).toHaveCount(0)
  await page.mouse.up()
  await expect(names(page, 'A')).toHaveText(['Both', 'A2', 'A1', 'Urgent', 'None'])
  await expect(page.locator('.card-detail')).toBeHidden()
  await start(page, card(page, 'A1')); await hover(page, card(page, 'B2'))
  await page.screenshot({ path: info.outputPath('drag-insertion-gap-1280.png') })
  await page.mouse.up(); await expect(names(page, 'B')).toHaveText(['B1', 'A1', 'B2', 'Bottom'])
  // Hovering a foreign group clamps preview to the boundary of the source's group.
  await start(page, card(page, 'A1')); await hover(page, card(page, 'Bottom'), 'end')
  expect(await page.locator('.card-placement-marker').evaluate(element => element.nextElementSibling?.querySelector('.card-name')?.textContent)).toBe('Bottom')
  await page.mouse.up(); await expect(names(page, 'B')).toHaveText(['B1', 'B2', 'A1', 'Bottom'])
  const saved = await writes(page)
  await start(page, card(page, 'A1')); await page.keyboard.press('Escape'); await page.mouse.up()
  await expect(page.locator('.card-placement-marker')).toHaveCount(0); expect(await writes(page)).toBe(saved)
  await start(page, card(page, 'A1')); await page.mouse.move(4, 4, { steps: 12 }); await page.mouse.up()
  await expect(page.locator('.card-placement-marker')).toHaveCount(0); expect(await writes(page)).toBe(saved)
  // Appending an already-last peer is a no-op, even with a lower-priority card after it.
  await start(page, card(page, 'A1')); await hover(page, card(page, 'Bottom'), 'end'); await page.mouse.up()
  await expect(page.locator('.notification-transient')).toContainText(en ? 'Card placement did not change' : 'Расположение карточки не изменилось')
  expect(await writes(page)).toBe(saved)
  await card(page, 'A1').getByRole('link').click()
  await expect(page.locator('.card-detail')).toBeVisible()
  const form = await enterEdit(page, en)
  await form.getByLabel(en ? 'Card description' : 'Описание карточки', { exact: true }).fill('Description survives drag')
  await saveEdit(page, form, en)
  await page.getByRole('button', { name: en ? 'Add note' : 'Добавить заметку', exact: true }).click()
  await page.getByLabel(en ? 'New note' : 'Новая заметка', { exact: true }).fill('Note survives drag')
  await page.getByRole('button', { name: en ? 'Add note' : 'Добавить заметку', exact: true }).click()
  await expect(page.locator('.note')).toHaveCount(1)
  await leaveCard(page, en)
  await start(page, card(page, 'A1')); await hover(page, column(page, 'Empty'), 'start'); await page.mouse.up()
  await expect(names(page, 'Empty')).toHaveText(['A1'])
  await page.evaluate(async () => { await navigator.serviceWorker.ready })
  await context.setOffline(true); await page.reload()
  await expect(names(page, 'A')).toHaveText(['Both', 'A2', 'Urgent', 'None'])
  await expect(names(page, 'Empty')).toHaveText(['A1'])
  await card(page, 'A1').getByRole('link').focus(); await page.keyboard.press('Enter')
  await expect(summaryOf(page, en).locator('.detail-text')).toHaveText('Description survives drag')
  await expect(page.locator('.note')).toContainText('Note survives drag')
  await context.setOffline(false)
})


for (const width of [320, 390, 1280, 1440]) for (const en of [false, true]) {
  test(`top card menus and drag remain usable in ${en ? 'en' : 'ru'} at ${width}px`, async ({ page }, info) => {
    await page.setViewportSize({ width, height: 900 }); await setup(page, en)
    await column(page, 'A').locator('.add-card-header').click()
    const longName = 'ДлинноеНазваниеКарточкиБезПробелов'.repeat(4)
    await page.getByRole('dialog').getByRole('textbox').fill(longName)
    await page.getByRole('dialog').getByRole('button', { name: en ? 'Create card' : 'Создать карточку', exact: true }).click()
    await expect(page.getByRole('dialog')).toBeHidden()
    await card(page, longName).scrollIntoViewIfNeeded()
    const layout = await card(page, longName).evaluate(element => {
      const title = element.querySelector('.card-name')!.getBoundingClientRect(), menu = element.querySelector('.menu')!.getBoundingClientRect(), button = element.querySelector('.menu button')!.getBoundingClientRect()
      return { separate: title.right <= menu.left, target: { width: button.width, height: button.height }, fits: element.scrollWidth <= element.clientWidth, pageFits: document.documentElement.scrollWidth <= innerWidth }
    })
    expect(layout).toEqual({ separate: true, target: { width: 44, height: 44 }, fits: true, pageFits: true })
    await expect(card(page, longName).locator('.card-controls, .card-move-arrows')).toHaveCount(0)
    const columnsTop = () => page.locator('.status-columns').evaluate(element => element.getBoundingClientRect().top)
    const topBefore = await columnsTop()
    await card(page, 'A1').getByRole('button').click()
    await expect(page.getByRole('menuitem', { name: en ? 'Move up' : 'Поднять выше', exact: true })).toHaveCount(0)
    await page.getByRole('menuitem', { name: en ? 'Move down' : 'Опустить ниже', exact: true }).click()
    await expect(names(page, 'A')).toHaveText(['Both', 'A2', 'A1', 'Urgent', 'None', longName])
    await expect(card(page, 'A1').getByRole('button')).toBeFocused()
    // The result is a toast at the bottom centre that never shifts the board.
    const toast = page.locator('.notification-transient .toast')
    await expect(toast).toHaveText(en ? 'Card placement saved.' : 'Расположение карточки сохранено.')
    expect(await columnsTop()).toBe(topBefore)
    const placement = await toast.evaluate(element => { const box = element.getBoundingClientRect(); return { centred: Math.abs(box.left + box.width / 2 - innerWidth / 2) <= 1, inside: box.bottom <= innerHeight && box.left >= 0 && box.right <= innerWidth, passesTaps: getComputedStyle(element).pointerEvents === 'none' } })
    expect(placement).toEqual({ centred: true, inside: true, passesTaps: true })
    await start(page, card(page, 'A1'), width === 320 ? 'badge' : width === 390 ? 'body' : 'name')
    await hover(page, card(page, 'A2')); await page.mouse.up()
    await expect(names(page, 'A')).toHaveText(['Both', 'A1', 'A2', 'Urgent', 'None', longName])
    await expect(page.locator('.card-detail')).toBeHidden()
    await card(page, 'Both').scrollIntoViewIfNeeded()
    await page.screenshot({ path: info.outputPath(`card-drag-${en ? 'en' : 'ru'}-${width}.png`), fullPage: true })
    await page.reload(); await expect(names(page, 'A')).toHaveText(['Both', 'A1', 'A2', 'Urgent', 'None', longName])
  })
}

test('uses library autoscroll to reach an offscreen empty column and a long board', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 700 }); await setup(page)
  const scroller = page.locator('[data-board-scroller]')
  await start(page, card(page, 'A1'))
  const boardBox = await scroller.boundingBox()
  await page.mouse.move(boardBox!.x + boardBox!.width - 2, boardBox!.y + 100, { steps: 12 })
  await expect.poll(() => scroller.evaluate(element => element.scrollLeft)).toBeGreaterThan(200)
  await expect.poll(async () => (await column(page, 'Empty').boundingBox())!.x).toBeLessThan(200)
  await hover(page, column(page, 'Empty')); await page.mouse.up()
  await expect(names(page, 'Empty')).toHaveText(['A1'])
  for (let index = 0; index < 10; index++) {
    await column(page, 'A').locator('.add-card-header').click()
    await page.getByRole('dialog').getByRole('textbox').fill(`Long ${index}`)
    await page.getByRole('dialog').getByRole('button', { name: 'Создать карточку', exact: true }).click()
    await expect(page.getByRole('dialog')).toBeHidden()
  }
  await start(page, card(page, 'Both'))
  // The same workspace scrolls vertically towards the end of a long status.
  const before = await scroller.evaluate(node => node.scrollTop), count = await writes(page)
  const source = await card(page, 'Both').boundingBox()
  const listBox = await scroller.boundingBox()
  await page.mouse.move(source!.x + 35, listBox!.y + listBox!.height - 4, { steps: 15 })
  await expect.poll(() => scroller.evaluate(node => node.scrollTop)).toBeGreaterThan(before + 100)
  await page.keyboard.press('Escape'); await page.mouse.up()
  await expect(page.locator('.card-placement-marker')).toHaveCount(0)
  expect(await writes(page)).toBe(count)
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
})

test('keeps native touch swipes before hold, then drags without opening on release', async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 650 }, isMobile: true, hasTouch: true, storageState: dismissedInstallInvitation })
  try {
    const page = await context.newPage(), cdp = await context.newCDPSession(page)
    await setup(page)
    await card(page, 'A2').scrollIntoViewIfNeeded()
    const initial = await writes(page), boardUrl = page.url()
    const swipe = async (x: number, y: number, dx: number, dy: number) => {
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] })
      for (let step = 1; step <= 6; step++) await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x + dx * step / 6, y: y + dy * step / 6 }] })
      const scrolled = page.evaluate(() => new Promise<void>(resolve => document.addEventListener('scrollend', () => resolve(), { once: true, capture: true })))
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
      await scrolled
    }
    let bounds = await card(page, 'A2').boundingBox()
    await swipe(300, bounds!.y + 25, -210, 0)
    const list = page.locator('[data-board-scroller]')
    await expect.poll(() => list.evaluate(element => element.scrollLeft)).toBeGreaterThan(20)
    await list.evaluate(element => { element.scrollLeft = 0 })
    await list.evaluate(node => { node.scrollTop = 0 })
    bounds = await card(page, 'A2').boundingBox()
    const listBox = await list.boundingBox()
    await swipe(bounds!.x + 30, listBox!.y + listBox!.height - 40, 0, -160)
    await expect.poll(() => list.evaluate(node => node.scrollTop)).toBeGreaterThan(0)
    expect(await writes(page)).toBe(initial); await expect(page).toHaveURL(boardUrl)
    await list.evaluate(node => { node.scrollTop = 0 }); await card(page, 'A2').scrollIntoViewIfNeeded()
    bounds = await card(page, 'A2').boundingBox()
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: bounds!.x + 30, y: bounds!.y + 25 }] })
    await page.waitForTimeout(300)
    await expect(card(page, 'A2')).toHaveAttribute('data-dragging', 'true')
    await expect(page.locator('.drag-card-preview')).toBeVisible()
    const target = await card(page, 'A1').boundingBox()
    for (let step = 1; step <= 10; step++) await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: target!.x + 30, y: bounds!.y + 25 + (target!.y + 5 - bounds!.y - 25) * step / 10 }] })
    await expect.poll(() => page.locator('.card-placement-marker').evaluateAll(elements => elements[0]?.nextElementSibling?.querySelector('.card-name')?.textContent)).toBe('A1')
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
    await expect(names(page, 'A')).toHaveText(['Both', 'A2', 'A1', 'Urgent', 'None'])
    await expect(page).toHaveURL(boardUrl); await expect(page.locator('.card-detail')).toBeHidden()
    const committed = await writes(page), current = await card(page, 'A2').boundingBox()
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: current!.x + 30, y: current!.y + 25 }] })
    await page.waitForTimeout(300)
    await expect(card(page, 'A2')).toHaveAttribute('data-dragging', 'true')
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchCancel', touchPoints: [] })
    await expect(page.locator('.card-placement-marker')).toHaveCount(0)
    expect(await writes(page)).toBe(committed); await expect(page).toHaveURL(boardUrl)
    await card(page, 'A2').getByRole('link').tap(); await expect(page.locator('.card-detail')).toBeVisible()
  } finally { await context.close() }
})

for (const en of [false, true]) test(`recovers a committed placement through reading only in ${en ? 'en' : 'ru'}`, async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 }); await setup(page, en)
  const before = await writes(page)
  await page.evaluate(() => {
    const get = IDBObjectStore.prototype.get
    let fail = true
    IDBObjectStore.prototype.get = function (...args) {
      if (this.name === 'projects' && fail) { fail = false; throw new DOMException('Injected post-commit read failure', 'UnknownError') }
      return get.apply(this, args)
    }
  })
  await card(page, 'A1').getByRole('button').click()
  await page.getByRole('menuitem', { name: en ? 'Move down' : 'Опустить ниже', exact: true }).click()
  await expect(page.getByRole('alert')).toContainText(en ? 'Placement was saved, but the board could not refresh' : 'Расположение сохранено, но не удалось обновить доску')
  await expect(names(page, 'A')).toHaveText(['Both', 'A1', 'A2', 'Urgent', 'None'])
  await expect(card(page, 'A1').getByRole('button')).toBeDisabled()
  await expect(page.getByRole('button', { name: en ? 'Add status' : 'Добавить статус', exact: true })).toBeDisabled()
  const committed = await writes(page); expect(committed).toBeGreaterThan(before)
  await page.getByRole('button', { name: en ? 'Refresh board' : 'Обновить доску', exact: true }).click()
  await expect(names(page, 'A')).toHaveText(['Both', 'A2', 'A1', 'Urgent', 'None'])
  await expect(page.getByRole('alert')).toBeHidden()
  await expect(card(page, 'A1').getByRole('button')).toBeFocused()
  expect(await writes(page)).toBe(committed)
})

test('cancels a gesture when a confirmed board refresh replaces its starting snapshot', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 }); await setup(page)
  await start(page, card(page, 'A1')); await hover(page, card(page, 'B1'))
  const before = await writes(page)
  // Another confirmed mutation refreshes the board while the pointer is still down.
  await page.getByRole('button', { name: 'Добавить статус', exact: true }).evaluate(element => (element as HTMLButtonElement).click())
  await page.getByRole('dialog').getByRole('textbox').fill('New snapshot')
  await page.getByRole('dialog').locator('form').evaluate(element => (element as HTMLFormElement).requestSubmit())
  await expect(page.getByRole('heading', { name: 'New snapshot', exact: true })).toBeVisible()
  await expect(page.locator('.card-placement-marker')).toHaveCount(0)
  await page.mouse.up()
  await expect(names(page, 'A')).toHaveText(['Both', 'A1', 'A2', 'Urgent', 'None'])
  expect(await writes(page)).toBe(before)
  await expect(page.locator('.card-detail')).toBeHidden()
})
