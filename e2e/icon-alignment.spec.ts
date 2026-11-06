import { expect, test, type Locator, type Page } from '@playwright/test'
import { leaveCard } from './card-helpers'
import { selectLanguage } from './language'
import { viewportFor } from './viewports'

const t = (en: boolean, ru: string, enText: string) => en ? enText : ru
const shortName = 'Short'
const longName = 'A long card name that wraps onto several lines at every reference width'

async function createBoard(page: Page, en: boolean) {
  await page.goto('/tracker/')
  if (en) await selectLanguage(page, 'en')
  await page.getByRole('banner').getByRole('button', { name: t(en, 'Создать проект', 'Create project'), exact: true }).click()
  await page.getByRole('dialog').getByRole('textbox').fill('Icon project')
  await page.getByRole('dialog').getByRole('combobox', { name: t(en, 'Набор статусов', 'Status set') }).selectOption('empty')
  await page.getByRole('dialog').getByRole('button', { name: t(en, 'Создать проект', 'Create project'), exact: true }).click()
  await page.getByRole('button', { name: t(en, 'Добавить статус', 'Add status'), exact: true }).click()
  await page.getByRole('dialog').getByRole('textbox').fill('Todo')
  await page.getByRole('dialog').getByRole('button', { name: t(en, 'Создать статус', 'Create status'), exact: true }).click()
  await expect(page.getByRole('dialog')).toBeHidden()
  for (const name of [shortName, longName]) {
    await page.locator('.status-column').first().locator('.add-card-header').click()
    const dialog = page.getByRole('dialog'); await dialog.getByRole('textbox').fill(name)
    await dialog.getByRole('button', { name: t(en, 'Создать карточку', 'Create card'), exact: true }).click()
    await expect(dialog).toBeHidden()
  }
  await expect(page.locator('[data-card-id]')).toHaveCount(2)
  // An edited note gives the longest localized date line.
  await page.evaluate(async () => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => { const r = indexedDB.open('personal-project-tracker'); r.onsuccess = () => resolve(r.result); r.onerror = () => reject(r.error) })
    const cardIds = Array.from(document.querySelectorAll<HTMLElement>('[data-card-id]'), card => card.dataset.cardId!)
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction('notes', 'readwrite')
      for (const cardId of cardIds) tx.objectStore('notes').put({ id: `${cardId}-note`, cardId, text: 'Edited note', createdAt: '2026-03-01T10:00:00.000Z', updatedAt: '2026-09-01T11:00:00.000Z' })
      tx.oncomplete = () => resolve(); tx.onerror = () => reject(tx.error)
    })
    db.close()
  })
  await page.reload()
  await expect(page.locator('.card-note')).toHaveCount(2)
}

/** The icon sits in the middle of its button, and the button in the middle of the first text line. */
async function expectAligned(button: Locator, text: Locator, container: Locator, iconSize?: number) {
  await expect(button).toBeVisible()
  const box = (await button.boundingBox())!, icon = (await button.locator('svg').boundingBox())!, frame = (await container.boundingBox())!
  const line = await text.evaluate(element => element.getBoundingClientRect().top + parseFloat(getComputedStyle(element).lineHeight) / 2)
  const iconCenter = icon.y + icon.height / 2
  expect(Math.abs(iconCenter - line)).toBeLessThanOrEqual(1.5)
  expect(Math.abs(iconCenter - (box.y + box.height / 2))).toBeLessThanOrEqual(1)
  expect(box.width).toBeGreaterThanOrEqual(44); expect(box.height).toBeGreaterThanOrEqual(44)
  expect(box.y).toBeGreaterThanOrEqual(frame.y); expect(box.y + box.height).toBeLessThanOrEqual(frame.y + frame.height)
  expect(box.x).toBeGreaterThanOrEqual(frame.x); expect(box.x + box.width).toBeLessThanOrEqual(frame.x + frame.width)
  if (iconSize) { expect(Math.round(icon.width)).toBe(iconSize); expect(Math.round(icon.height)).toBe(iconSize) }
}

async function expectDetailAligned(page: Page, en: boolean) {
  const summary = page.locator('.card-summary')
  await expectAligned(summary.getByRole('button', { name: t(en, 'Редактировать основное', 'Edit overview'), exact: true }), summary.locator('.card-summary-title'), summary)
  const note = page.locator('.note').first()
  for (const name of [t(en, 'Редактировать заметку', 'Edit note'), t(en, 'Удалить заметку', 'Delete note')]) {
    await expectAligned(note.getByRole('button', { name, exact: true }), note.locator('.note-date'), note, 16)
  }
}

for (const width of [320, 1280]) for (const en of [false, true]) {
  test(`icon buttons center on their text line ${en ? 'en' : 'ru'} ${width}px`, async ({ page }) => {
    await page.setViewportSize(viewportFor(width))
    await createBoard(page, en)
    for (const name of [shortName, longName]) {
      const card = page.locator('.work-card').filter({ has: page.getByRole('link', { name, exact: true }) })
      const title = card.locator('.card-name')
      await expectAligned(card.getByRole('button', { name: t(en, `Действия карточки ${name}`, `Card actions for ${name}`), exact: true }), title, card, 16)
      if (name === longName) {
        const lineHeight = await title.evaluate(element => parseFloat(getComputedStyle(element).lineHeight))
        expect((await title.boundingBox())!.height).toBeGreaterThan(lineHeight * 1.5)
      }
    }
    for (const name of [shortName, longName]) {
      await page.getByRole('link', { name, exact: true }).click()
      await expect(page.locator('.card-summary-title')).toHaveText(name)
      await expectDetailAligned(page, en)
      await leaveCard(page, en)
      await expect(page.locator('.card-summary')).toBeHidden()
    }
  })
}
