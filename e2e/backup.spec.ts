import { expect, test, type Page } from '@playwright/test'
import { readFile, writeFile } from 'node:fs/promises'
import { summaryOf } from './card-helpers'
import { selectLanguage } from './language'
import { viewportFor } from './viewports'

const t = (en: boolean, ru: string, enText: string) => en ? enText : ru
type Data = { projects: object[]; statuses: object[]; cards: object[]; notes: object[] }
const tables = ['projects', 'statuses', 'cards', 'notes'] as const

const original: Data = {
  projects: [{ id: 'pa', name: 'Alpha', createdAt: '2026-10-01T08:00:00.000Z' }, { id: 'pb', name: 'Beta', createdAt: '2026-10-02T08:00:00.000Z' }],
  statuses: [
    { id: 's1', projectId: 'pa', name: 'Todo', position: 0 }, { id: 's2', projectId: 'pa', name: 'Done', position: 1 }, { id: 's3', projectId: 'pb', name: 'Backlog', position: 0 },
  ],
  cards: [
    { id: 'c1', statusId: 's1', name: 'Urgent and important', description: '', position: 0, important: true, urgent: true },
    { id: 'c2', statusId: 's1', name: 'Important only', description: 'Line one\nLine two', position: 1, important: true, urgent: false },
    { id: 'c3', statusId: 's1', name: 'Plain', description: 'Plain description', position: 2, important: false, urgent: false },
    { id: 'c4', statusId: 's2', name: 'Finished', description: '', position: 0, important: false, urgent: false },
  ],
  notes: [
    { id: 'n1', cardId: 'c1', text: 'First note', createdAt: '2026-10-01T08:00:00.000Z' },
    { id: 'n2', cardId: 'c1', text: 'Second note', createdAt: '2026-10-02T09:30:00.000Z', updatedAt: '2026-10-03T10:00:00.000Z' },
  ],
}
const replacement: Data = {
  projects: [{ id: 'pz', name: 'Gamma', createdAt: '2026-10-05T08:00:00.000Z' }],
  statuses: [{ id: 'sz', projectId: 'pz', name: 'Only', position: 0 }],
  cards: [{ id: 'cz', statusId: 'sz', name: 'Lone card', description: '', position: 0, important: false, urgent: false }],
  notes: [],
}

async function writeData(page: Page, data: Data) {
  await page.evaluate(async ({ data, tables }) => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => { const r = indexedDB.open('personal-project-tracker'); r.onsuccess = () => resolve(r.result); r.onerror = () => reject(r.error) })
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction([...tables, 'workspace'], 'readwrite')
      tx.objectStore('workspace').clear()
      for (const table of tables) { tx.objectStore(table).clear(); for (const row of data[table]) tx.objectStore(table).put(row) }
      tx.oncomplete = () => resolve(); tx.onerror = () => reject(tx.error)
    })
    db.close()
  }, { data, tables })
  await page.reload()
}

async function readData(page: Page): Promise<Data> {
  return page.evaluate(async tables => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => { const r = indexedDB.open('personal-project-tracker'); r.onsuccess = () => resolve(r.result); r.onerror = () => reject(r.error) })
    const result: Record<string, object[]> = {}
    for (const table of tables) {
      result[table] = await new Promise<object[]>((resolve, reject) => { const r = db.transaction(table).objectStore(table).getAll(); r.onsuccess = () => resolve(r.result); r.onerror = () => reject(r.error) })
      result[table].sort((a, b) => (a as { id: string }).id.localeCompare((b as { id: string }).id))
    }
    db.close()
    return result as Data
  }, tables)
}

async function start(page: Page, data: Data, en = false) {
  await page.goto('/tracker/')
  await expect(page.locator('.app-bar')).toBeVisible()
  if (en) await selectLanguage(page, 'en')
  await writeData(page, data)
  await expect(page.locator('.project-card')).toHaveCount(data.projects.length)
}

async function chooseEntry(page: Page, name: string) {
  await page.getByRole('button', { name: /^(Настройки|Settings)$/ }).click()
  await page.getByRole('menuitem', { name, exact: true }).click()
}

async function restoreFile(page: Page, en: boolean, path: string) {
  const chooser = page.waitForEvent('filechooser')
  await chooseEntry(page, t(en, 'Восстановить из резервной копии', 'Restore from backup'))
  await (await chooser).setFiles(path)
}

test.describe('backup', () => {
  test('exports, replaces and restores all data, including after a reload', async ({ page }, info) => {
    await start(page, original)
    const exporting = page.waitForEvent('download')
    await chooseEntry(page, 'Выгрузить резервную копию')
    const download = await exporting
    expect(download.suggestedFilename()).toMatch(/^easytrack-backup-\d{4}-\d{2}-\d{2}-\d{4}\.json$/)
    const path = info.outputPath('backup.json')
    await download.saveAs(path)
    const file = JSON.parse(await readFile(path, 'utf8'))
    expect(file).toMatchObject({ format: 'easytrack-backup', formatVersion: 1, app: { version: expect.any(String), commit: expect.any(String) } })
    await expect(page.getByRole('button', { name: /^Настройки$/ })).toBeFocused()
    const before = await readData(page)

    await writeData(page, replacement)
    await expect(page.locator('.project-card')).toHaveText([/Gamma/])
    await restoreFile(page, false, path)
    const dialog = page.getByRole('dialog', { name: 'Заменить данные резервной копией?' })
    await expect(dialog).toContainText('Проекты: 1 → 2')
    await expect(dialog).toContainText('Карточки: 1 → 4')
    await expect(dialog).toContainText('Заметки: 0 → 2')
    await dialog.getByRole('button', { name: 'Заменить' }).click()
    await expect(page.locator('.notification-transient .toast')).toHaveText('Данные восстановлены из резервной копии')
    await expect(page.locator('.project-card')).toHaveCount(2)
    expect(new URL(page.url()).hash).toBe('')
    expect(await readData(page)).toEqual(before)

    await page.reload()
    await expect(page.locator('.project-card')).toHaveCount(2)
    expect(await readData(page)).toEqual(before)
    await page.getByRole('button', { name: 'Alpha', exact: true }).click()
    await expect(page.locator('[data-card-id]')).toHaveText([/Urgent and important/, /Important only/, /Plain/, /Finished/])
    await page.getByRole('link', { name: 'Important only', exact: true }).click()
    await expect(summaryOf(page)).toContainText('Line one\nLine two')
    await page.goBack()
    await page.getByRole('link', { name: 'Urgent and important', exact: true }).click()
    await expect(page.locator('.note-list .note .detail-text')).toHaveText(['Second note', 'First note'])
    await expect(page.locator('.note-list time')).toHaveCount(3)
  })

  test('restoring on an open board shows the restored catalogue, also after a reload', async ({ page }, info) => {
    await start(page, original)
    const path = info.outputPath('open-board.json')
    const exporting = page.waitForEvent('download')
    await chooseEntry(page, 'Выгрузить резервную копию')
    await (await exporting).saveAs(path)
    await writeData(page, replacement)
    await page.getByRole('button', { name: 'Gamma', exact: true }).click()
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Gamma')
    await restoreFile(page, false, path)
    await page.getByRole('dialog').getByRole('button', { name: 'Заменить' }).click()
    await expect(page.locator('.project-card')).toHaveCount(2)
    await page.reload()
    await expect(page.locator('.project-card')).toHaveCount(2)
    expect(new URL(page.url()).hash).toBe('')
    expect(await readData(page)).toEqual(original)
  })

  test('the full card page offers both backup entries', async ({ page }) => {
    await start(page, original)
    await page.goto('/tracker/#project/pa/card/c1')
    await page.reload()
    await expect(page.getByRole('button', { name: 'Назад к доске' })).toBeVisible()
    await page.getByRole('button', { name: 'Настройки' }).click()
    await expect(page.getByRole('menuitem').filter({ hasText: /резервн/ })).toHaveText(['Выгрузить резервную копию', 'Восстановить из резервной копии'])
  })

  test('rejects damaged and unrelated files without changing data', async ({ page }, info) => {
    await start(page, original)
    const before = await readData(page)
    const cases: [string, string, string][] = [
      ['unrelated.json', '{"hello":"world"}', 'Файл не является резервной копией EasyTrack или повреждён'],
      ['broken.json', '{not json', 'Файл не является резервной копией EasyTrack или повреждён'],
      ['newer.json', JSON.stringify({ format: 'easytrack-backup', formatVersion: 99 }), 'Копия создана более новой версией EasyTrack — обновите приложение'],
    ]
    for (const [name, text, message] of cases) {
      const path = info.outputPath(name)
      await writeFile(path, text)
      await restoreFile(page, false, path)
      const dialog = page.getByRole('dialog', { name: message })
      await expect(dialog).toBeVisible()
      await dialog.getByRole('button', { name: 'Закрыть' }).last().click()
      await expect(dialog).toBeHidden()
      await expect(page.getByRole('button', { name: 'Настройки' })).toBeFocused()
    }
    expect(await readData(page)).toEqual(before)
  })

  for (const en of [false, true]) test(`menu and comparison dialog fit 320px in ${en ? 'en' : 'ru'}`, async ({ page }, info) => {
    await page.setViewportSize(viewportFor(320))
    await start(page, original, en)
    const exporting = page.waitForEvent('download')
    await chooseEntry(page, t(en, 'Выгрузить резервную копию', 'Export backup'))
    const path = info.outputPath('narrow.json')
    await (await exporting).saveAs(path)
    await page.getByRole('button', { name: 'Alpha', exact: true }).click()
    await page.getByRole('button', { name: t(en, 'Настройки', 'Settings') }).click()
    const menu = page.getByRole('menu')
    const labels = en ? ['Rename project', 'Delete project', 'Export backup', 'Restore from backup', 'How to install EasyTrack'] : ['Переименовать проект', 'Удалить проект', 'Выгрузить резервную копию', 'Восстановить из резервной копии', 'Как установить EasyTrack']
    for (const label of labels) await expect(menu.getByRole('menuitem', { name: label, exact: true })).toBeVisible()
    const box = (await menu.boundingBox())!
    expect(box.x).toBeGreaterThanOrEqual(0)
    expect(box.x + box.width).toBeLessThanOrEqual(320)
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    await page.keyboard.press('Escape')
    await restoreFile(page, en, path)
    const dialog = page.getByRole('dialog', { name: t(en, 'Заменить данные резервной копией?', 'Replace data with the backup?') })
    await expect(dialog).toContainText(t(en, 'Проекты: 2 → 2', 'Projects: 2 → 2'))
    const dialogBox = (await dialog.boundingBox())!
    expect(dialogBox.x).toBeGreaterThanOrEqual(0)
    expect(dialogBox.x + dialogBox.width).toBeLessThanOrEqual(320)
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    await page.screenshot({ path: info.outputPath(`backup-dialog-${en ? 'en' : 'ru'}-320.png`) })
    await dialog.getByRole('button', { name: t(en, 'Отмена', 'Cancel') }).click()
    await expect(dialog).toBeHidden()
    await expect(page.getByRole('button', { name: t(en, 'Настройки', 'Settings') })).toBeFocused()
  })
})
