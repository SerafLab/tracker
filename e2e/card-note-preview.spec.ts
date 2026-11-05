import { expect, test, type Page } from '@playwright/test'
import { leaveCard } from './card-helpers'
import { selectLanguage } from './language'

async function createBoard(page: Page, en = false, statuses = ['Todo', 'Done']) {
  await page.goto('/tracker/')
  if (en) { await selectLanguage(page, 'en') }
  await page.getByRole('button', { name: en ? 'Create project' : 'Создать проект', exact: true }).click()
  await page.getByRole('dialog').getByRole('textbox').fill('Preview project')
  await page.getByRole('dialog').getByRole('combobox', { name: en ? 'Status set' : 'Набор статусов' }).selectOption('empty')
  await page.getByRole('dialog').getByRole('button', { name: en ? 'Create project' : 'Создать проект', exact: true }).click()
  for (const name of statuses) {
    await page.getByRole('button', { name: en ? 'Add status' : 'Добавить статус', exact: true }).click()
    await page.getByRole('dialog').getByRole('textbox').fill(name)
    await page.getByRole('dialog').getByRole('button', { name: en ? 'Create status' : 'Создать статус', exact: true }).click()
    await expect(page.getByRole('dialog')).toBeHidden()
  }
  await page.locator('.status-column').first().locator('.add-card-header').click()
  const dialog = page.getByRole('dialog'); await dialog.getByRole('textbox').fill('Preview card')
  await dialog.getByRole('button', { name: en ? 'Create card' : 'Создать карточку', exact: true }).click()
  await expect(dialog).toBeHidden()
}

/** Writes notes straight into the Dexie database so layout checks do not depend on the editor. */
async function seed(page: Page, count: number, description = '') {
  await page.evaluate(async ({ count, description }) => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => { const r = indexedDB.open('personal-project-tracker'); r.onsuccess = () => resolve(r.result); r.onerror = () => reject(r.error) })
    const cardId = document.querySelector<HTMLElement>('[data-card-id]')!.dataset.cardId!
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(['notes', 'cards'], 'readwrite')
      for (let n = 1; n <= count; n++) tx.objectStore('notes').put({ id: `n${n}`, cardId, text: `Note ${n} https://example.com/${'long-path-'.repeat(12)}\nsecond line\nthird line\nfourth line\nfifth line`, createdAt: `2026-11-02T00:00:0${n}.000Z` })
      const cards = tx.objectStore('cards'); const get = cards.get(cardId)
      get.onsuccess = () => cards.put({ ...get.result, description })
      tx.oncomplete = () => resolve(); tx.onerror = () => reject(tx.error)
    })
    db.close()
  }, { count, description })
  await page.reload()
}

for (const width of [320, 390, 1280, 1440]) test(`board preview of five long notes stays contained and operable at ${width}px`, async ({ page }, info) => {
  await page.setViewportSize({ width, height: 900 })
  await createBoard(page, false, ['Todo', 'Doing', 'Review', 'Done'])
  await seed(page, 6, 'Длинное описание '.repeat(30))
  const card = page.locator('.work-card')
  const toggle = card.getByRole('button', { name: 'Последние заметки: Preview card' })
  await expect(card.locator('.card-note')).toHaveCount(1)
  await expect(card.locator('.card-note')).toContainText('Note 6')
  await expect(card.locator('.card-notes a')).toHaveCount(0)
  await toggle.click()
  await expect(toggle).toHaveAttribute('aria-expanded', 'true')
  await expect(card.locator('.card-note')).toHaveText([/Note 2 /, /Note 3 /, /Note 4 /, /Note 5 /, /Note 6 /])
  const clamps = await card.locator('.card-note, .card-description-preview').evaluateAll(items => items.map(item => { const style = getComputedStyle(item); return item.getBoundingClientRect().height <= parseFloat(style.lineHeight) * 3 + 1 }))
  expect(clamps.every(Boolean)).toBe(true)
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await card.scrollIntoViewIfNeeded()
  for (const control of [card.getByRole('link', { name: 'Preview card', exact: true }), card.getByRole('button', { name: 'Действия карточки Preview card' }), toggle]) {
    await expect(control).toBeVisible()
    const box = (await control.boundingBox())!
    expect(box.width).toBeGreaterThan(0)
  }
  const menuBox = (await card.getByRole('button', { name: 'Действия карточки Preview card' }).boundingBox())!, toggleBox = (await toggle.boundingBox())!
  expect(menuBox.y + menuBox.height <= toggleBox.y || toggleBox.y + toggleBox.height <= menuBox.y).toBe(true)
  await expect(card.getByRole('button', { name: 'Действия карточки Preview card' })).toBeEnabled()
  const cardBox = (await card.boundingBox())!, viewport = page.viewportSize()!
  expect(cardBox.x + cardBox.width).toBeLessThanOrEqual(viewport.width + 1)
  await page.screenshot({ path: info.outputPath(`notes-${width}.png`), fullPage: true })
  // The toggle neither opens the card nor opens menus; the note text and the card link do open it.
  const hash = new URL(page.url()).hash
  await toggle.focus(); await page.keyboard.press('Enter'); await expect(toggle).toHaveAttribute('aria-expanded', 'false')
  await page.keyboard.press('Space'); await expect(toggle).toHaveAttribute('aria-expanded', 'true')
  expect(new URL(page.url()).hash).toBe(hash)
  await expect(page.getByRole('menu')).toHaveCount(0)
  const lastNote = (await card.locator('.card-note').last().boundingBox())!
  await page.mouse.click(lastNote.x + 20, lastNote.y + 8)
  await expect(page.locator('.card-detail')).toBeVisible()
  expect(new URL(page.url()).hash).not.toBe(hash)
})

test('card remains draggable by its note text and the expand button does not start a drag', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 })
  await createBoard(page, false, ['Todo', 'Done'])
  await seed(page, 3)
  const card = page.locator('.work-card')
  const toggle = card.getByRole('button', { name: 'Последние заметки: Preview card' })
  const from = (await toggle.boundingBox())!, target = (await page.locator('.status-column').last().boundingBox())!
  await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2); await page.mouse.down()
  await page.mouse.move(target.x + target.width / 2, target.y + 120, { steps: 12 }); await page.mouse.up()
  await expect(page.locator('.status-column').first().locator('.work-card')).toHaveCount(1)
  await expect(toggle).toHaveAttribute('aria-expanded', 'false')
  const note = (await card.locator('.card-note').boundingBox())!
  await page.mouse.move(note.x + 20, note.y + 10); await page.mouse.down()
  await page.mouse.move(target.x + target.width / 2, target.y + 120, { steps: 12 }); await page.mouse.up()
  await expect(page.locator('.status-column').last().locator('.work-card')).toHaveCount(1)
})

for (const en of [false, true]) test(`note add, edit and delete are reflected on the board and offline (${en ? 'en' : 'ru'})`, async ({ page, context }) => {
  await page.setViewportSize({ width: 390, height: 900 })
  await createBoard(page, en)
  const t = (ru: string, enText: string) => en ? enText : ru
  const card = page.locator('.work-card')
  await page.getByRole('link', { name: 'Preview card', exact: true }).click()
  const add = async (text: string) => {
    await page.getByRole('button', { name: t('Добавить заметку', 'Add note'), exact: true }).click()
    await page.getByLabel(t('Новая заметка', 'New note')).fill(text)
    await page.getByRole('button', { name: t('Добавить заметку', 'Add note'), exact: true }).click()
    await expect(page.locator('.note', { hasText: text })).toBeVisible()
  }
  await add('First note'); await add('Second note')
  await leaveCard(page, en)
  const toggle = card.getByRole('button', { name: t('Последние заметки: Preview card', 'Recent notes: Preview card') })
  await expect(card.locator('.card-note')).toHaveText('Second note')
  await toggle.click(); await expect(card.locator('.card-note')).toHaveText(['First note', 'Second note'])
  // Editing the older note keeps the creation-ordered last note.
  await page.getByRole('link', { name: 'Preview card', exact: true }).click()
  await page.getByRole('button', { name: t('Редактировать заметку', 'Edit note'), exact: true }).first().click()
  await page.getByRole('textbox', { name: t('Редактировать заметку', 'Edit note'), exact: true }).fill('First note edited')
  await page.getByRole('button', { name: t('Сохранить заметку', 'Save note'), exact: true }).click()
  await expect(page.locator('.note', { hasText: 'First note edited' })).toBeVisible()
  await leaveCard(page, en)
  // The board stays mounted beside the panel, so the local expanded state is kept.
  await expect(toggle).toHaveAttribute('aria-expanded', 'true')
  await expect(card.locator('.card-note')).toHaveText(['First note edited', 'Second note'])
  // Deleting the latest note promotes the previous one and removes the toggle.
  await page.getByRole('link', { name: 'Preview card', exact: true }).click()
  await page.getByRole('button', { name: t('Удалить заметку', 'Delete note'), exact: true }).last().click()
  await page.getByRole('dialog').getByRole('button', { name: t('Удалить', 'Delete'), exact: true }).click()
  await expect(page.locator('.note')).toHaveCount(1)
  await leaveCard(page, en)
  await expect(card.locator('.card-note')).toHaveText('First note edited')
  await expect(toggle).toHaveCount(0)
  await page.evaluate(async () => { await navigator.serviceWorker.ready })
  await context.setOffline(true); await page.reload()
  await expect(card.locator('.card-note')).toHaveText('First note edited')
  await context.setOffline(false)
})
