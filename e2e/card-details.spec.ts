import { expect, test, type Page } from '@playwright/test'
import { enterEdit, leaveCard, saveEdit, summaryOf } from './card-helpers'
import { selectLanguage } from './language'
import { viewportFor } from './viewports'

async function createBoard(page: Page, en = false) {
  await page.goto('/tracker/')
  if (en) { await selectLanguage(page, 'en') }
  await page.getByRole('banner').getByRole('button', { name: en ? 'Create project' : 'Создать проект', exact: true }).click()
  await page.getByRole('dialog').getByRole('textbox').fill('Detail project')
  await page.getByRole('dialog').getByRole('combobox', { name: en ? 'Status set' : 'Набор статусов' }).selectOption('empty')
  await page.getByRole('dialog').getByRole('button', { name: en ? 'Create project' : 'Создать проект', exact: true }).click()
  for (const name of ['Todo', 'Done']) {
    await page.getByRole('button', { name: en ? 'Add status' : 'Добавить статус', exact: true }).click()
    await page.getByRole('dialog').getByRole('textbox').fill(name)
    await page.getByRole('dialog').getByRole('button', { name: en ? 'Create status' : 'Создать статус', exact: true }).click()
    await expect(page.getByRole('dialog')).toBeHidden()
  }
  await page.locator('.status-column').filter({ has: page.getByRole('heading', { name: 'Todo', exact: true }) }).locator('.add-card-header').click()
  const dialog = page.getByRole('dialog'); await dialog.getByRole('textbox').fill('Detail card')
  await dialog.getByRole('checkbox', { name: en ? 'Important' : 'Важная', exact: true }).check()
  await dialog.getByRole('button', { name: en ? 'Create card' : 'Создать карточку', exact: true }).click()
  await expect(dialog).toBeHidden()
  return page.url()
}

for (const width of [320, 390, 1280]) for (const en of [false, true]) {
  test(`card descriptions, note history and offline detail route ${en ? 'en' : 'ru'} ${width}px`, async ({ page, context }, info) => {
    await page.setViewportSize(viewportFor(width)); await createBoard(page, en)
    const card = page.locator('.work-card')
    await card.getByRole('button', { name: en ? 'Card actions for Detail card' : 'Действия карточки Detail card', exact: true }).click()
    await expect(page.locator('.card-detail')).toBeHidden()
    await page.keyboard.press('Escape')
    const free = await card.boundingBox()
    await page.mouse.click(free!.x + 12, free!.y + free!.height - 8)
    await expect(page.locator('.card-detail')).toBeVisible()
    await leaveCard(page, en)
    // A badge belongs to the free card surface, above the independent controls.
    const badge = await card.locator('.card-badge').boundingBox(); expect(badge).toBeTruthy()
    await page.mouse.click(badge!.x + badge!.width / 2, badge!.y + badge!.height / 2)
    const summary = summaryOf(page, en)
    await expect(summary).toBeVisible(); await expect(page.locator('.card-detail')).toBeFocused()
    // Opening a card shows the read-only summary with the same badge as on the board.
    await expect(summary.locator('.card-badge-important')).toBeVisible()
    await expect(summary.getByRole('textbox')).toHaveCount(0)
    await expect(summary.getByText(en ? 'No description' : 'Нет описания', { exact: true })).toBeVisible()
    const detailUrl = page.url()
    const description = 'Line one\nhttps://example.com/' + 'long-path-'.repeat(22) + '\n<script>literal</script> [text](javascript:alert(1))'
    const form = await enterEdit(page, en)
    await form.getByLabel(en ? 'Card description' : 'Описание карточки', { exact: true }).fill(description)
    await saveEdit(page, form, en)
    const saved = summary
    await expect(saved.getByRole('link')).toHaveAttribute('target', '_blank')
    await expect(saved.getByRole('link')).toHaveAttribute('rel', 'noopener noreferrer')
    expect(await saved.locator('script').count()).toBe(0)
    await page.getByRole('button', { name: en ? 'Add note' : 'Добавить заметку', exact: true }).click()
    await page.getByLabel(en ? 'New note' : 'Новая заметка').fill('Agreement\nhttps://example.org/notes')
    await page.getByRole('button', { name: en ? 'Add note' : 'Добавить заметку', exact: true }).click()
    await expect(page.locator('.note')).toHaveCount(1)
    const created = await page.locator('.note time').first().getAttribute('datetime')
    await page.getByRole('button', { name: en ? 'Edit note' : 'Редактировать заметку', exact: true }).click()
    await page.getByRole('textbox', { name: en ? 'Edit note' : 'Редактировать заметку', exact: true }).fill('Edited agreement\nhttps://example.org/notes')
    await page.getByRole('button', { name: en ? 'Save note' : 'Сохранить заметку', exact: true }).click()
    await expect(page.locator('.note time')).toHaveCount(2)
    await expect(page.locator('.note time').first()).toHaveAttribute('datetime', created!)
    const localDate = await page.evaluate(({ language, created }) => new Intl.DateTimeFormat(language, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(created)), { language: en ? 'en' : 'ru', created: created! })
    await expect(page.locator('.note time').first()).toHaveText(localDate)
    await page.getByRole('button', { name: en ? 'Edit overview' : 'Редактировать основное', exact: true }).focus()
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    await page.screenshot({ path: info.outputPath(`details-${en ? 'en' : 'ru'}-${width}.png`), fullPage: true })
    await leaveCard(page, en)
    await card.getByRole('button', { name: en ? 'Card actions for Detail card' : 'Действия карточки Detail card', exact: true }).click()
    await page.getByRole('menuitem', { name: en ? 'Move to…' : 'Переместить в…', exact: true }).click()
    await page.getByRole('dialog').getByRole('button', { name: en ? 'Move' : 'Переместить', exact: true }).click()
    await expect(page.locator('.status-column').last().locator('.work-card')).toHaveCount(1)
    await page.getByRole('link', { name: 'Detail card', exact: true }).focus(); await page.keyboard.press('Enter')
    await expect(summary).toBeVisible(); await expect(summary.locator('.detail-text')).toHaveText(description)
    await expect(page.locator('.note')).toHaveCount(1)
    await page.reload(); await expect(summary).toBeVisible(); expect(page.url()).toBe(detailUrl)
    await page.evaluate(async () => { await navigator.serviceWorker.ready })
    await context.setOffline(true); await page.reload()
    await expect(summary.locator('.detail-text')).toHaveText(description)
    await expect(page.locator('.note')).toHaveCount(1)
    await page.getByRole('button', { name: en ? 'Delete note' : 'Удалить заметку', exact: true }).click()
    const confirm = page.getByRole('dialog', { name: en ? 'Delete note' : 'Удалить заметку', exact: true }); await expect(confirm.getByRole('button', { name: en ? 'Cancel' : 'Отмена', exact: true })).toBeFocused()
    await page.keyboard.press('Escape'); await expect(page.getByRole('button', { name: en ? 'Delete note' : 'Удалить заметку', exact: true })).toBeFocused()
    await page.getByRole('button', { name: en ? 'Delete note' : 'Удалить заметку', exact: true }).click()
    await confirm.getByRole('button', { name: en ? 'Delete' : 'Удалить', exact: true }).click()
    await expect(confirm).toBeHidden(); await expect(page.locator('.note')).toHaveCount(0)
    await expect(page.getByRole('button', { name: en ? 'Add note' : 'Добавить заметку', exact: true })).toBeFocused()
    await page.reload(); await expect(summary).toBeVisible(); await expect(page.locator('.note')).toHaveCount(0)
    await context.setOffline(false)
  })
}

test('restores indexed Back/Forward before asking about drafts and applies the chosen destination once', async ({ page }) => {
  const boardUrl = await createBoard(page)
  await page.getByRole('link', { name: 'Detail card', exact: true }).click()
  const detailUrl = page.url()
  const input = page.getByLabel('Описание карточки', { exact: true })
  await enterEdit(page)
  await input.fill('Draft')
  const length = await page.evaluate(() => history.length)
  await page.goBack()
  const guard = page.getByRole('dialog', { name: 'Несохранённые изменения' })
  await expect(guard).toBeVisible(); await expect(page).toHaveURL(detailUrl)
  await guard.getByRole('button', { name: 'Остаться', exact: true }).click()
  await expect(input).toHaveValue('Draft'); expect(await page.evaluate(() => history.length)).toBe(length)
  await page.goBack(); await expect(guard).toBeVisible()
  await guard.getByRole('button', { name: 'Сохранить и выйти', exact: true }).click()
  // The card is a panel beside the board, so the URL and columns change before the panel closes.
  // Going Forward earlier supersedes the board route and keeps the still-mounted editor.
  await expect(page).toHaveURL(boardUrl); await expect(page.locator('.card-detail')).toBeHidden()
  await page.goForward(); await expect(summaryOf(page).locator('.detail-text')).toHaveText('Draft')
  await enterEdit(page)
  await input.fill('Discarded')
  await page.getByRole('button', { name: 'EasyTrack — Все проекты', exact: true }).click()
  await expect(guard).toBeVisible(); await page.keyboard.press('Escape'); await expect(input).toHaveValue('Discarded')
  await page.goBack(); await expect(guard).toBeVisible()
  await guard.getByRole('button', { name: 'Выйти без сохранения', exact: true }).click()
  await expect(page).toHaveURL(boardUrl); await expect(page.locator('.card-detail')).toBeHidden()
  await page.goForward(); await expect(summaryOf(page).locator('.detail-text')).toHaveText('Draft')
  expect(await page.evaluate(() => history.length)).toBe(length)
})

const guardOf = (page: Page) => page.getByRole('dialog', { name: 'Несохранённые изменения' })
// Playwright's page.url() lags renderer navigations; the location read inside the page is authoritative.
const locationIs = (page: Page, url: string) => expect.poll(() => page.evaluate(() => location.href)).toBe(url)
const rapidBack = (page: Page) => page.evaluate(() => { history.back(); history.back() })

/** Opens the card panel from its board and types an unsaved description. */
async function openDraft(page: Page, text = 'Native draft') {
  const boardUrl = await createBoard(page)
  await page.getByRole('link', { name: 'Detail card', exact: true }).click()
  const detailUrl = page.url(), description = page.getByLabel('Описание карточки', { exact: true })
  await enterEdit(page)
  await description.fill(text)
  return { boardUrl, detailUrl, description }
}

/** Two rapid Back steps raise exactly one guard and settle on the card before it is answered. */
async function guardedRapidBack(page: Page, detailUrl: string) {
  await rapidBack(page)
  const guard = guardOf(page)
  await expect(guard).toHaveCount(1); await locationIs(page, detailUrl)
  return guard
}

/** The end state of leaving the card: board route, panel gone, board rendered, no guard left. */
async function expectLeft(page: Page, boardUrl: string) {
  await locationIs(page, boardUrl)
  await expect(guardOf(page)).toHaveCount(0); await expect(page.locator('.card-detail')).toBeHidden()
  await expect(page.getByRole('link', { name: 'Detail card', exact: true })).toBeVisible()
}

test('native close of a pending draft can be cancelled and keeps the card and draft', async ({ page }) => {
  const { detailUrl, description } = await openDraft(page)
  const dialog = page.waitForEvent('dialog')
  const close = page.close({ runBeforeUnload: true })
  const warning = await dialog
  expect(warning.type()).toBe('beforeunload'); await warning.dismiss(); await close
  expect(page.isClosed()).toBe(false)
  await locationIs(page, detailUrl); await expect(description).toHaveValue('Native draft'); await expect(guardOf(page)).toHaveCount(0)
})

test('rapid Back asks once and Stay keeps the card, draft and history', async ({ page }) => {
  const { detailUrl, description } = await openDraft(page)
  const length = await page.evaluate(() => history.length)
  const guard = await guardedRapidBack(page, detailUrl)
  await guard.getByRole('button', { name: 'Остаться', exact: true }).click()
  await expect(guard).toHaveCount(0); await locationIs(page, detailUrl)
  await expect(description).toHaveValue('Native draft'); await expect(page.locator('.card-detail')).toBeVisible()
  expect(await page.evaluate(() => history.length)).toBe(length)
})

test('rapid Back with Save and leave persists the draft once and Forward reopens the card', async ({ page }) => {
  const { boardUrl, detailUrl } = await openDraft(page)
  const guard = await guardedRapidBack(page, detailUrl)
  await guard.getByRole('button', { name: 'Сохранить и выйти', exact: true }).click()
  await expectLeft(page, boardUrl)
  await page.goForward(); await locationIs(page, detailUrl)
  await expect(summaryOf(page).locator('.detail-text')).toHaveText('Native draft')
  await page.reload(); await expect(summaryOf(page).locator('.detail-text')).toHaveText('Native draft')
})

test('rapid Back with Discard drops the draft and Forward reopens the saved card', async ({ page }) => {
  const { boardUrl, detailUrl } = await openDraft(page)
  const guard = await guardedRapidBack(page, detailUrl)
  await guard.getByRole('button', { name: 'Выйти без сохранения', exact: true }).click()
  await expectLeft(page, boardUrl)
  await page.goForward(); await locationIs(page, detailUrl)
  await expect(summaryOf(page).getByText('Нет описания', { exact: true })).toBeVisible()
  await page.reload(); await expect(summaryOf(page).getByText('Нет описания', { exact: true })).toBeVisible()
})

test('rapid Back with a failed save stays on the card with the draft and saves after the error is gone', async ({ page }) => {
  await page.addInitScript(() => {
    const put = IDBObjectStore.prototype.put
    IDBObjectStore.prototype.put = function (...args) {
      if (this.name === 'cards' && (window as unknown as { failCardWrites?: boolean }).failCardWrites) throw new DOMException('Injected card write failure', 'UnknownError')
      return put.apply(this, args)
    }
  })
  const { detailUrl, description } = await openDraft(page)
  await page.evaluate(() => { (window as unknown as { failCardWrites: boolean }).failCardWrites = true })
  const guard = await guardedRapidBack(page, detailUrl)
  await guard.getByRole('button', { name: 'Сохранить и выйти', exact: true }).click()
  await expect(guard).toHaveCount(0); await locationIs(page, detailUrl)
  await expect(summaryOf(page).getByRole('alert').filter({ hasText: 'Не удалось сохранить' })).toBeVisible()
  await expect(description).toHaveValue('Native draft')
  await page.evaluate(() => { (window as unknown as { failCardWrites: boolean }).failCardWrites = false })
  await saveEdit(page, page.getByRole('form', { name: 'Редактировать основное', exact: true }))
  await page.reload(); await expect(summaryOf(page).locator('.detail-text')).toHaveText('Native draft')
})

test('native close warns for pending drafts and rapid Back preserves one guarded transition', async ({ page }) => {
  const boardUrl = await createBoard(page)
  await page.getByRole('link', { name: 'Detail card', exact: true }).click()
  const detailUrl = page.url(), description = page.getByLabel('Описание карточки', { exact: true })
  await enterEdit(page)
  await description.fill('Native draft')
  const dialog = page.waitForEvent('dialog')
  const close = page.close({ runBeforeUnload: true })
  const warning = await dialog
  expect(warning.type()).toBe('beforeunload'); await warning.dismiss(); await close
  expect(page.isClosed()).toBe(false)
  await locationIs(page, detailUrl); await expect(description).toHaveValue('Native draft')
  await page.evaluate(() => { history.back(); history.back() })
  const guard = page.getByRole('dialog', { name: 'Несохранённые изменения' })
  await expect(guard).toHaveCount(1); await locationIs(page, detailUrl)
  await guard.getByRole('button', { name: 'Остаться', exact: true }).click()
  await expect(guard).toHaveCount(0); await locationIs(page, detailUrl); await expect(description).toHaveValue('Native draft')
  await page.evaluate(() => { history.back(); history.back() })
  await expect(guard).toHaveCount(1); await locationIs(page, detailUrl)
  await guard.getByRole('button', { name: 'Сохранить и выйти', exact: true }).click()
  await expectLeft(page, boardUrl)
  await page.goForward(); await locationIs(page, detailUrl)
  await expect(summaryOf(page).locator('.detail-text')).toHaveText('Native draft')
  await page.reload(); await expect(summaryOf(page).locator('.detail-text')).toHaveText('Native draft')
})
