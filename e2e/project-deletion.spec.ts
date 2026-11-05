import { expect, test, type Page } from '@playwright/test'
import { leaveCard } from './card-helpers'

async function createProject(page: Page, name: string, en: boolean, empty = false) {
  const create = en ? 'Create project' : 'Создать проект'
  await page.getByRole('button', { name: create, exact: true }).click()
  const dialog = page.getByRole('dialog')
  await dialog.getByRole('textbox').fill(name)
  if (empty) await dialog.getByRole('combobox').selectOption('empty')
  await dialog.getByRole('button', { name: create, exact: true }).click()
  await expect(page.getByRole('heading', { name, level: 1, exact: true })).toBeVisible()
}
async function populate(page: Page, en: boolean) {
  await page.locator('.status-column').first().locator('.add-card-header').click()
  await page.getByRole('dialog').getByRole('textbox').fill('Card with a note')
  await page.getByRole('dialog').getByRole('button', { name: en ? 'Create card' : 'Создать карточку', exact: true }).click()
  await page.getByRole('link', { name: 'Card with a note', exact: true }).click()
  const detailUrl = page.url()
  await page.getByRole('button', { name: en ? 'Add note' : 'Добавить заметку', exact: true }).click()
  await page.getByLabel(en ? 'New note' : 'Новая заметка', { exact: true }).fill('Cascade this note')
  await page.getByRole('button', { name: en ? 'Add note' : 'Добавить заметку', exact: true }).click()
  await expect(page.locator('.note')).toHaveCount(1)
  await leaveCard(page, en)
  await expect(page.locator('.status-columns')).toBeVisible()
  return detailUrl
}
async function counts(page: Page) {
  return page.evaluate(() => new Promise<{ projects: number; statuses: number; cards: number; notes: number; lastProjectId?: string }>((resolve, reject) => {
    const request = indexedDB.open('personal-project-tracker')
    request.onerror = () => reject(request.error)
    request.onsuccess = () => {
      const db = request.result, names = ['projects', 'statuses', 'cards', 'notes', 'workspace']
      const transaction = db.transaction(names)
      const result = { projects: 0, statuses: 0, cards: 0, notes: 0, lastProjectId: undefined as string | undefined }
      for (const name of ['projects', 'statuses', 'cards', 'notes'] as const) {
        const count = transaction.objectStore(name).count()
        count.onsuccess = () => { result[name] = count.result }
      }
      const preference = transaction.objectStore('workspace').get('workspace')
      preference.onsuccess = () => { result.lastProjectId = preference.result?.lastProjectId }
      transaction.oncomplete = () => { db.close(); resolve(result) }
      transaction.onerror = () => { db.close(); reject(transaction.error) }
    }
  }))
}

for (const width of [320, 390, 1280]) for (const en of [false, true]) {
  test(`confirmed project deletion from catalogue and board persists offline in ${en ? 'en' : 'ru'} at ${width}px`, async ({ page, context }, info) => {
    await page.setViewportSize({ width, height: 844 })
    await page.addInitScript(en => localStorage.setItem('easytrack.locale', en ? 'en' : 'ru'), en)
    await page.goto('/tracker/')
    const longName = 'ОченьДлинноеНазваниеПроектаБезПробелов'.repeat(3), deletion = en ? 'Delete project' : 'Удалить проект'
    await createProject(page, longName, en)
    const oldBoardUrl = page.url(), oldDetailUrl = await populate(page, en)
    await page.getByRole('button', { name: /^EasyTrack —/ }).click()
    await createProject(page, 'Other project', en, true)
    const otherBoardUrl = page.url()
    await page.getByRole('button', { name: /^EasyTrack —/ }).click()
    const project = page.locator('.project-card').filter({ has: page.getByRole('button', { name: longName, exact: true }) })
    const menu = project.getByRole('button', { name: /^(Project actions|Действия проекта)/ })
    await menu.focus(); await page.keyboard.press('Enter')
    await page.getByRole('menuitem', { name: deletion, exact: true }).click()
    const dialog = page.getByRole('dialog', { name: deletion, exact: true })
    await expect(dialog.getByRole('button', { name: en ? 'Cancel' : 'Отмена', exact: true })).toBeFocused()
    await expect(dialog).toContainText(en ? 'Statuses: 3. Cards: 1.' : 'Статусов: 3. Карточек: 1.')
    await expect(dialog).toContainText(longName)
    await expect(dialog.getByRole('textbox')).toHaveCount(0)
    expect(await dialog.evaluate(element => element.scrollWidth <= element.clientWidth)).toBe(true)
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    await expect(dialog.getByRole('button', { name: deletion, exact: true })).toBeEnabled()
    await page.screenshot({ path: info.outputPath(`project-delete-catalogue-${en ? 'en' : 'ru'}-${width}.png`), animations: 'disabled' })
    await page.keyboard.press('Escape'); await expect(menu).toBeFocused()
    await menu.click(); await page.getByRole('menuitem', { name: deletion, exact: true }).click()
    await expect(dialog.getByRole('button', { name: deletion, exact: true })).toBeEnabled()
    await dialog.getByRole('button', { name: deletion, exact: true }).click()
    await expect(dialog).toBeHidden()
    await expect(page.getByRole('button', { name: 'Other project', exact: true })).toBeFocused()
    expect(await counts(page)).toEqual({ projects: 1, statuses: 0, cards: 0, notes: 0, lastProjectId: undefined })
    await page.reload()
    await expect(page.getByRole('button', { name: 'Other project', exact: true })).toBeVisible()
    await page.goto(oldBoardUrl)
    await expect(page.getByRole('button', { name: 'Other project', exact: true })).toBeVisible()
    await expect(page).toHaveURL(/\/tracker\/$/)
    await page.goto(oldDetailUrl)
    await expect(page.getByRole('button', { name: 'Other project', exact: true })).toBeVisible()
    await expect(page).toHaveURL(/\/tracker\/$/)
    await page.getByRole('button', { name: 'Other project', exact: true }).click()
    await expect(page).toHaveURL(otherBoardUrl)
    const gear = page.getByRole('button', { name: en ? 'Settings' : 'Настройки', exact: true })
    await gear.click(); await page.getByRole('button', { name: deletion, exact: true }).click()
    await expect(page.locator('.settings-panel')).toHaveCount(0)
    await expect(dialog).toContainText(en ? 'Statuses: 0. Cards: 0.' : 'Статусов: 0. Карточек: 0.')
    await page.keyboard.press('Escape'); await expect(gear).toBeFocused()
    await page.evaluate(() => navigator.serviceWorker.ready)
    await page.reload()
    await expect(page.getByRole('heading', { name: 'Other project', exact: true })).toBeVisible()
    await context.setOffline(true)
    await gear.click(); await page.getByRole('button', { name: deletion, exact: true }).click()
    await page.screenshot({ path: info.outputPath(`project-delete-board-${en ? 'en' : 'ru'}-${width}.png`), animations: 'disabled' })
    await expect(dialog.getByRole('button', { name: en ? 'Cancel' : 'Отмена', exact: true })).toBeFocused()
    await page.keyboard.press('Tab'); await page.keyboard.press('Space')
    await expect(page.getByRole('heading', { name: en ? 'Start with your first project' : 'Начните с первого проекта', exact: true })).toBeVisible()
    await expect(page.getByRole('button', { name: en ? 'Create project' : 'Создать проект', exact: true })).toBeFocused()
    await expect(page).toHaveURL(/\/tracker\/$/)
    await page.goBack()
    await expect(page.getByRole('heading', { name: en ? 'Start with your first project' : 'Начните с первого проекта', exact: true })).toBeVisible()
    await expect(page).toHaveURL(/\/tracker\/$/)
    await page.reload()
    await expect(page.getByRole('heading', { name: en ? 'Start with your first project' : 'Начните с первого проекта', exact: true })).toBeVisible()
    expect(await counts(page)).toEqual({ projects: 0, statuses: 0, cards: 0, notes: 0, lastProjectId: undefined })
    await context.setOffline(false)
  })
}

for (const en of [false, true]) {
  test(`project cascade rolls back in the browser and permits an explicit retry in ${en ? 'en' : 'ru'}`, async ({ page }, info) => {
    await page.setViewportSize({ width: 320, height: 844 })
    await page.addInitScript(en => {
      localStorage.setItem('easytrack.locale', en ? 'en' : 'ru')
      const remove = IDBObjectStore.prototype.delete
      ;(window as unknown as { failProjectDeletion: boolean }).failProjectDeletion = false
      IDBObjectStore.prototype.delete = function (...args) {
        if (this.name === 'projects' && (window as unknown as { failProjectDeletion: boolean }).failProjectDeletion) throw Error('Injected intermediate deletion failure')
        return remove.apply(this, args)
      }
    }, en)
    await page.goto('/tracker/')
    await createProject(page, 'Rollback project', en)
    await populate(page, en)
    const before = await counts(page), route = page.url(), deletion = en ? 'Delete project' : 'Удалить проект'
    await page.getByRole('button', { name: en ? 'Settings' : 'Настройки', exact: true }).click()
    await page.getByRole('button', { name: deletion, exact: true }).click()
    const dialog = page.getByRole('dialog', { name: deletion, exact: true })
    await page.evaluate(() => { (window as unknown as { failProjectDeletion: boolean }).failProjectDeletion = true })
    await dialog.getByRole('button', { name: deletion, exact: true }).click()
    await expect(dialog.getByRole('alert')).toContainText(en ? 'Could not save changes' : 'Не удалось сохранить')
    await expect(dialog.getByRole('button', { name: en ? 'Cancel' : 'Отмена', exact: true })).toBeFocused()
    await expect(page).toHaveURL(route)
    expect(await counts(page)).toEqual(before)
    expect(await dialog.evaluate(element => element.scrollWidth <= element.clientWidth)).toBe(true)
    await page.screenshot({ path: info.outputPath(`project-delete-failure-${en ? 'en' : 'ru'}-320.png`), animations: 'disabled' })
    await page.evaluate(() => { (window as unknown as { failProjectDeletion: boolean }).failProjectDeletion = false })
    await dialog.getByRole('button', { name: deletion, exact: true }).click()
    await expect(dialog).toBeHidden()
    expect(await counts(page)).toEqual({ projects: 0, statuses: 0, cards: 0, notes: 0, lastProjectId: undefined })
  })
}
