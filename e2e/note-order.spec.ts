import { expect, test, type Page } from '@playwright/test'
import { selectLanguage } from './language'
import { viewportFor } from './viewports'

const t = (en: boolean, ru: string, enText: string) => en ? enText : ru

async function createBoard(page: Page, en: boolean, cards: string[]) {
  await page.goto('/tracker/')
  if (en) await selectLanguage(page, 'en')
  await page.getByRole('button', { name: t(en, 'Создать проект', 'Create project'), exact: true }).click()
  await page.getByRole('dialog').getByRole('textbox').fill('Order project')
  await page.getByRole('dialog').getByRole('combobox', { name: t(en, 'Набор статусов', 'Status set') }).selectOption('empty')
  await page.getByRole('dialog').getByRole('button', { name: t(en, 'Создать проект', 'Create project'), exact: true }).click()
  await page.getByRole('button', { name: t(en, 'Добавить статус', 'Add status'), exact: true }).click()
  await page.getByRole('dialog').getByRole('textbox').fill('Todo')
  await page.getByRole('dialog').getByRole('button', { name: t(en, 'Создать статус', 'Create status'), exact: true }).click()
  await expect(page.getByRole('dialog')).toBeHidden()
  for (const name of cards) {
    await page.locator('.status-column').first().locator('.add-card-header').click()
    const dialog = page.getByRole('dialog'); await dialog.getByRole('textbox').fill(name)
    await dialog.getByRole('button', { name: t(en, 'Создать карточку', 'Create card'), exact: true }).click()
    await expect(dialog).toBeHidden()
  }
  await expect(page.locator('[data-card-id]')).toHaveCount(cards.length)
  // Seed eight notes per card straight into Dexie so ordering checks do not depend on the editor.
  await page.evaluate(async () => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => { const r = indexedDB.open('personal-project-tracker'); r.onsuccess = () => resolve(r.result); r.onerror = () => reject(r.error) })
    const cardIds = Array.from(document.querySelectorAll<HTMLElement>('[data-card-id]'), card => card.dataset.cardId!)
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction('notes', 'readwrite')
      for (const cardId of cardIds) for (const n of [1, 2, 3, 4, 5, 6, 7, 8]) tx.objectStore('notes').put({ id: `${cardId}-${n}`, cardId, text: `Note ${n}`, createdAt: `2026-11-02T00:00:0${n}.000Z` })
      tx.oncomplete = () => resolve(); tx.onerror = () => reject(tx.error)
    })
    db.close()
  })
  await page.reload()
}

const history = (page: Page) => page.locator('.note-list .note .detail-text')
const notes = (...ns: number[]) => ns.map(n => `Note ${n}`)

for (const en of [false, true]) {
  test(`note order toggle fits a 320px screen ${en ? 'en' : 'ru'}`, async ({ page }, info) => {
    await page.setViewportSize(viewportFor(320))
    await createBoard(page, en, ['Order card'])
    await page.getByRole('link', { name: 'Order card', exact: true }).click()
    await expect(history(page)).toHaveText(notes(8, 7, 6, 5, 4, 3, 2, 1))
    // The accessible name changes with the order, so locate the toggle by its place.
    const toggle = page.locator('.note-history-header').getByRole('button')
    await expect(toggle).toHaveAccessibleName(t(en, 'Порядок заметок: сначала новые', 'Note order: newest first'))
    const heading = page.getByRole('heading', { name: t(en, 'История заметок', 'Note history'), exact: true })
    const box = (await toggle.boundingBox())!, icon = (await toggle.locator('svg').boundingBox())!, title = (await heading.boundingBox())!
    expect(box.width).toBeGreaterThanOrEqual(44); expect(box.height).toBeGreaterThanOrEqual(44)
    expect(Math.round(icon.width)).toBe(16); expect(Math.round(icon.height)).toBe(16)
    expect(title.x + title.width).toBeLessThanOrEqual(box.x)
    expect(box.x + box.width).toBeLessThanOrEqual(320)
    // The add action sits on the newest side, above the history.
    const add = (await page.getByRole('button', { name: t(en, 'Добавить заметку', 'Add note'), exact: true }).boundingBox())!
    expect(add.y).toBeLessThan((await page.locator('.note-list').boundingBox())!.y)
    await page.screenshot({ path: info.outputPath(`note-order-newest-${en ? 'en' : 'ru'}-320.png`), fullPage: true })
    await toggle.focus()
    await page.keyboard.press('Enter')
    await expect(history(page)).toHaveText(notes(1, 2, 3, 4, 5, 6, 7, 8))
    await expect(toggle).toHaveAccessibleName(t(en, 'Порядок заметок: сначала старые', 'Note order: oldest first'))
    await expect(toggle).toBeFocused()
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    await page.screenshot({ path: info.outputPath(`note-order-${en ? 'en' : 'ru'}-320.png`), fullPage: true })
  })
}

test('note order rebuilds collapsed and expanded board cards at once and after reload', async ({ page }, info) => {
  await page.setViewportSize(viewportFor(1280))
  await createBoard(page, false, ['First card', 'Second card', 'Third card'])
  const boardCard = (name: string) => page.locator('.work-card', { has: page.getByRole('link', { name, exact: true }) })
  const expanded = boardCard('Second card').locator('.card-note'), collapsed = boardCard('Third card').locator('.card-note')
  await expect(collapsed).toHaveText(notes(8))
  await boardCard('Second card').getByRole('button', { name: 'Последние заметки: Second card' }).click()
  await expect(expanded).toHaveText(notes(8, 7, 6, 5, 4))
  await page.getByRole('link', { name: 'First card', exact: true }).click()
  const panel = page.getByRole('region', { name: 'Подробности карточки' })
  await panel.getByRole('button', { name: 'Порядок заметок: сначала новые', exact: true }).click()
  await expect(history(page)).toHaveText(notes(1, 2, 3, 4, 5, 6, 7, 8))
  // The board beside the panel shows the start of the same history immediately.
  await expect(expanded).toHaveText(notes(1, 2, 3, 4, 5))
  await expect(collapsed).toHaveText(notes(1))
  await page.screenshot({ path: info.outputPath('note-order-board-oldest-1280.png') })
  await panel.getByRole('button', { name: 'Закрыть карточку', exact: true }).click()
  await expect(panel).toBeHidden()
  await page.reload()
  await expect(collapsed).toHaveText(notes(1))
  await boardCard('Third card').getByRole('button', { name: 'Последние заметки: Third card' }).click()
  await expect(collapsed).toHaveText(notes(1, 2, 3, 4, 5))
  await page.getByRole('link', { name: 'Second card', exact: true }).click()
  await expect(page.getByRole('region', { name: 'Подробности карточки' }).getByRole('button', { name: 'Порядок заметок: сначала старые', exact: true })).toBeVisible()
  await expect(history(page)).toHaveText(notes(1, 2, 3, 4, 5, 6, 7, 8))
  // The add action follows to the newest side, below the history.
  const list = (await page.locator('.note-list').boundingBox())!
  expect((await page.getByRole('button', { name: 'Добавить заметку', exact: true }).boundingBox())!.y).toBeGreaterThan(list.y + list.height - 1)
  await page.screenshot({ path: info.outputPath('note-order-board-oldest-reload-1280.png') })
})
