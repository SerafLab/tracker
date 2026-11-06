import { expect, test, type Page } from '@playwright/test'
import { enterEdit, saveEdit } from './card-helpers'
import { dismissedInstallInvitation } from './storage-state'
import { viewportFor } from './viewports'

// A deterministic host contract fixture, NOT proof of native WebMCP availability.
async function fixture(page: Page) {
  await page.addInitScript(() => {
    let loseReply = false
    const tools = new Map<string, { name: string; execute(input: unknown, context?: { signal?: AbortSignal }): Promise<unknown> }>()
    Object.defineProperty(document, 'modelContext', { configurable: true, value: {
      registerTool(tool: { name: string; execute(input: unknown): Promise<unknown> }, { signal }: { signal: AbortSignal }) {
        if (signal.aborted) return
        tools.set(tool.name, tool)
        signal.addEventListener('abort', () => { if (tools.get(tool.name) === tool) tools.delete(tool.name) })
      },
    } })
    Object.assign(window, { webmcpFixture: { names: () => [...tools.keys()], capture: (name: string) => tools.get(name)!.execute, loseNextReply: () => { loseReply = true }, async call(name: string, input: unknown) { const lose = loseReply; loseReply = false; const result = await tools.get(name)!.execute(input); if (lose) throw Error('Injected lost host reply after execution'); return result } } })
  })
  await page.goto('/tracker/')
  await expect.poll(() => page.evaluate(() => (window as any).webmcpFixture.names().length)).toBe(15)
  await expect.poll(async () => (await connection(page)).data.state).toBe('ready')
  let sessionId = (await connection(page)).sessionId, requestId = 0
  return {
    async call(name: string, fields: object = {}, explicitId?: number) {
      return raw(page, name, { sessionId, ...(['list_projects', 'get_board'].includes(name) ? {} : { requestId: explicitId ?? ++requestId }), ...fields })
    },
    session: () => sessionId,
    async rebind() { sessionId = (await connection(page)).sessionId; requestId = 0 },
  }
}
const raw = (page: Page, name: string, input: unknown): Promise<any> => page.evaluate(({ name, input }) => (window as any).webmcpFixture.call(name, input), { name, input })
const connection = (page: Page) => raw(page, 'get_connection', {})

for (const locale of ['ru', 'en']) test(`native-contract fixture covers every task tool, UI agreement and offline reload in ${locale}`, async ({ page, context }) => {
  await page.addInitScript(locale => localStorage.setItem('easytrack.locale', locale), locale)
  const host = await fixture(page)
  expect((await host.call('list_projects')).data.projects).toEqual([])
  const first = await host.call('create_project', { name: 'Same', statusSetId: 'none' }), projectId = first.data.project.id
  expect(first).toMatchObject({ ok: true, data: { saved: true } })
  expect(page.url()).not.toContain('#project')
  const other = await host.call('create_project', { name: 'Same', statusSetId: 'none' })
  const set = await host.call('create_project', { name: 'Set', statusSetId: 'simple' })
  expect(set.data.project.statuses.map((status: { name: string }) => status.name)).toEqual(locale === 'en' ? ['To do', 'In progress', 'Done'] : ['Нужно сделать', 'В процессе', 'Готово'])
  expect(page.url()).not.toContain('#project')
  expect(other.data.project.id).not.toBe(projectId)
  expect((await host.call('apply_status_set', { projectId: other.data.project.id, statusSetId: 'search' })).data.board.statuses).toHaveLength(4)
  expect(await host.call('apply_status_set', { projectId: other.data.project.id, statusSetId: 'search' })).toMatchObject({ error: { code: 'conflict' } })
  expect(await host.call('apply_status_set', { projectId: other.data.project.id, statusSetId: 'none' })).toMatchObject({ error: { code: 'invalid_argument' } })
  expect((await host.call('get_board', { projectId })).data.board.statuses).toEqual([])
  const one = (await host.call('create_status', { projectId, name: 'One' })).data.status
  const two = (await host.call('create_status', { projectId, name: 'Two' })).data.status
  const empty = (await host.call('create_status', { projectId, name: 'Empty' })).data.status
  expect((await host.call('rename_project', { projectId, name: 'Board' })).data.project.name).toBe('Board')
  expect((await host.call('rename_status', { statusId: one.id, name: 'Start' })).data.status.name).toBe('Start')
  expect((await host.call('move_status', { statusId: two.id, direction: 'left' })).data.board.statuses[0].id).toBe(two.id)
  expect((await host.call('move_status', { statusId: two.id, direction: 'left' })).data.outcome).toBe('unchanged')
  expect(await host.call('show_workspace', { projectId })).toMatchObject({ ok: true, data: { route: `#project/${projectId}` } })
  await expect(page.getByRole('heading', { name: 'Board', exact: true })).toBeVisible()
  const created = await host.call('create_card', { statusId: one.id, name: 'Source' }), card = created.data.card
  expect(card).toMatchObject({ description: '', important: false, urgent: false })
  await expect(page.locator('.card-name').filter({ hasText: 'Source' })).toBeVisible()
  await page.getByRole('link', { name: 'Source', exact: true }).click()
  const form = await enterEdit(page, locale === 'en')
  await form.getByLabel(locale === 'en' ? 'Card description' : 'Описание карточки').fill('Saved detailed text')
  await saveEdit(page, form, locale === 'en')
  await page.getByRole('button', { name: locale === 'en' ? 'Add note' : 'Добавить заметку', exact: true }).click()
  await page.getByLabel(locale === 'en' ? 'New note' : 'Новая заметка').fill('Personal note')
  await page.getByRole('button', { name: locale === 'en' ? 'Add note' : 'Добавить заметку', exact: true }).click()
  await expect(page.locator('.note-list')).toContainText('Personal note')
  // The confirmed note write keeps UI mutations pending until the board preview is reread.
  await expect(page.locator('.card-note-list')).toContainText('Personal note')
  const updated = await host.call('update_card', { cardId: card.id, name: 'Updated', important: true, urgent: false })
  expect(updated.data.card.description).toBe('Saved detailed text')
  await expect(page.getByRole('heading', { name: 'Updated', exact: true })).toBeVisible()
  await expect(page.locator('.note-list')).toContainText('Personal note')
  await host.call('create_card', { statusId: two.id, name: 'Peer', important: true })
  await host.call('create_card', { statusId: two.id, name: 'Lower' })
  const expected = { statusId: one.id, important: true, urgent: false }
  const moved = await host.call('move_card', { cardId: card.id, statusId: two.id, expected })
  expect(moved.data).toMatchObject({ outcome: 'saved', card: { id: card.id, description: 'Saved detailed text', position: 1 } })
  expect((await host.call('move_card', { cardId: card.id, statusId: two.id, expected })).error.code).toBe('conflict')
  const board = (await host.call('get_board', { projectId })).data.board
  expect(board.statuses.find((s: any) => s.id === two.id).cards.map((c: any) => c.name)).toEqual(['Peer', 'Updated', 'Lower'])
  expect((await host.call('delete_status', { statusId: two.id, confirm: true })).error.code).toBe('status_not_empty')
  expect(await host.call('delete_status', { statusId: empty.id, confirm: true })).toMatchObject({ ok: true, data: { deletedId: empty.id } })
  const before = page.url()
  await host.call('rename_project', { projectId: other.data.project.id, name: 'Other' })
  expect(page.url()).toBe(before)
  await host.call('show_workspace', { projectId })
  const source = page.locator(`[data-card-id="${card.id}"]`)
  await expect(source).toContainText('Updated')
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready
  })
  const oldSession = host.session()
  await context.setOffline(true); await page.reload()
  await expect.poll(() => page.evaluate(() => (window as any).webmcpFixture.names().length)).toBe(15)
  await expect.poll(async () => (await connection(page)).data.state).toBe('ready')
  expect((await raw(page, 'list_projects', { sessionId: oldSession })).error.code).toBe('disconnected')
  await host.rebind()
  expect((await host.call('get_board', { projectId })).data.board.statuses.find((s: any) => s.id === two.id).cards[1].description).toBe('Saved detailed text')
  await expect(source).toContainText('Updated')
  expect(await host.call('delete_card', { cardId: card.id, confirm: true })).toMatchObject({ ok: true, data: { deletedId: card.id } })
  await expect(source).toHaveCount(0)
  expect((await host.call('delete_card', { cardId: card.id, confirm: true })).error.code).toBe('not_found')
  await host.call('show_workspace')
  expect(page.url()).not.toContain('#project')
  await context.setOffline(false)
})

test('native-contract fixture protects dirty drafts, retains mounted editor on refresh failure and recovers only by reading', async ({ page }) => {
  const host = await fixture(page)
  const projectId = (await host.call('create_project', { name: 'Project', statusSetId: 'none' })).data.project.id
  const statusId = (await host.call('create_status', { projectId, name: 'Status' })).data.status.id
  const cardId = (await host.call('create_card', { statusId, name: 'Card' })).data.card.id
  await host.call('show_workspace', { projectId })
  await page.getByRole('link', { name: 'Card', exact: true }).click()
  await enterEdit(page)
  const description = page.getByLabel('Описание карточки')
  await description.fill('Dirty description')
  await page.getByRole('button', { name: 'Добавить заметку', exact: true }).click()
  const note = page.getByLabel('Новая заметка'); await note.fill('Dirty note')
  const route = page.url()
  expect((await host.call('update_card', { cardId, name: 'Blocked', important: false, urgent: false })).error.code).toBe('conflict')
  expect((await host.call('show_workspace')).error.code).toBe('conflict')
  expect(page.url()).toBe(route)
  await page.evaluate(() => {
    const get = IDBObjectStore.prototype.get
    let fail = true
    IDBObjectStore.prototype.get = function(key) { if (fail && this.name === 'cards') { fail = false; throw new DOMException('Injected view read failure', 'UnknownError') }; return get.call(this, key) }
  })
  expect(await host.call('rename_project', { projectId, name: 'Saved project name' })).toMatchObject({ ok: true, data: { saved: true, warning: { code: 'view_refresh_failed' } } })
  await expect(description).toHaveValue('Dirty description'); await expect(note).toHaveValue('Dirty note')
  await expect(page.getByRole('alert')).toContainText('Изменения сохранены')
  await page.getByRole('button', { name: 'Обновить доску' }).click()
  await expect(description).toBeEnabled()
  await expect(description).toHaveValue('Dirty description'); await expect(note).toHaveValue('Dirty note')
  expect(page.url()).toBe(route)
  expect((await host.call('get_board', { projectId })).data.board.name).toBe('Saved project name')
})

test('native-contract fixture isolates tabs/sessions and deduplicates identical requests without another history entry', async ({ page, context }) => {
  const host = await fixture(page)
  const projectId = (await host.call('create_project', { name: 'P', statusSetId: 'none' })).data.project.id
  const second = await context.newPage(), other = await fixture(second)
  expect((await raw(second, 'list_projects', { sessionId: host.session() })).error.code).toBe('disconnected')
  const args = { sessionId: host.session(), requestId: 20, projectId }
  expect(await raw(page, 'show_workspace', args)).toMatchObject({ ok: true })
  const before = await page.evaluate(() => history.length)
  expect(await raw(page, 'show_workspace', args)).toMatchObject({ ok: true })
  expect(await page.evaluate(() => history.length)).toBe(before)
  expect((await raw(page, 'show_workspace', { ...args, projectId: 'other' })).error.code).toBe('conflict')
  expect((await other.call('list_projects')).data.projects[0].id).toBe(projectId)
  await page.evaluate(() => (window as any).webmcpFixture.loseNextReply())
  const lost = { sessionId: host.session(), requestId: 21, name: 'Lost acknowledgement', statusSetId: 'none' }
  await expect(raw(page, 'create_project', lost)).rejects.toThrow('Injected lost host reply')
  const saved = (await raw(page, 'list_projects', { sessionId: host.session() })).data.projects
  expect(saved.filter((project: any) => project.name === 'Lost acknowledgement')).toHaveLength(1)
  expect(await raw(page, 'create_project', lost)).toMatchObject({ ok: true, data: { saved: true } })
  expect((await raw(page, 'list_projects', { sessionId: host.session() })).data.projects).toHaveLength(2)
  const isolated = await context.browser()!.newContext({ storageState: dismissedInstallInvitation }), isolatedPage = await isolated.newPage()
  const isolatedHost = await fixture(isolatedPage)
  expect((await isolatedHost.call('list_projects')).data.projects).toEqual([])
  await isolated.close()
})


test('native-contract fixture revokes old handles and blocks both tool and UI writes after storage versionchange', async ({ page }) => {
  const host = await fixture(page), oldSession = host.session()
  await host.call('create_project', { name: 'Retained', statusSetId: 'none' })
  await page.evaluate(() => { (window as any).oldFixtureCall = (window as any).webmcpFixture.capture('create_project') })
  await page.evaluate(() => new Promise<void>((resolve, reject) => {
    const request = indexedDB.open('personal-project-tracker', 40)
    request.onsuccess = () => { request.result.close(); resolve() }
    request.onerror = () => reject(request.error)
  }))
  await expect(page.getByRole('heading', { name: 'Нужно перезапустить EasyTrack' })).toBeVisible()
  await expect.poll(async () => (await connection(page)).data.state).toBe('restart_required')
  expect(await page.evaluate(input => (window as any).oldFixtureCall(input), { sessionId: oldSession, requestId: 2, name: 'Blocked old handle', statusSetId: 'none' })).toMatchObject({ error: { code: 'disconnected' } })
  await host.rebind()
  expect(await host.call('create_project', { name: 'Blocked fresh handle', statusSetId: 'none' })).toMatchObject({ error: { code: 'restart_required' } })
  await expect(page.getByRole('banner').getByRole('button', { name: 'Создать проект', exact: true })).toHaveCount(0)
})

test('native-contract fixture: delete_card on the open panel card closes the panel to the board, and is refused with a dirty draft', async ({ page }) => {
  await page.setViewportSize(viewportFor(1280))
  const host = await fixture(page)
  const projectId = (await host.call('create_project', { name: 'Project', statusSetId: 'none' })).data.project.id
  const statusId = (await host.call('create_status', { projectId, name: 'Status' })).data.status.id
  const firstId = (await host.call('create_card', { statusId, name: 'First' })).data.card.id
  const secondId = (await host.call('create_card', { statusId, name: 'Second' })).data.card.id
  await host.call('show_workspace', { projectId })
  const boardIndex = await page.evaluate(() => history.state?.easyTrackIndex)
  await page.getByRole('link', { name: 'First', exact: true }).click()
  const panel = page.locator('.card-panel')
  await expect(panel).toBeVisible()
  await enterEdit(page)
  const description = page.getByLabel('Описание карточки')
  await description.fill('Kept draft')
  expect((await host.call('delete_card', { cardId: firstId, confirm: true })).error.code).toBe('conflict')
  await expect(description).toHaveValue('Kept draft')
  await expect(panel).toBeVisible()
  await page.getByRole('form', { name: 'Редактировать основное' }).getByRole('button', { name: 'Сохранить', exact: true }).click()
  await expect(page.locator('.card-description-preview').first()).toHaveText('Kept draft')
  expect(await host.call('delete_card', { cardId: firstId, confirm: true })).toMatchObject({ ok: true, data: { deletedId: firstId } })
  await expect(panel).toHaveCount(0)
  await expect(page).toHaveURL(new RegExp(`#project/${projectId}$`))
  await expect.poll(() => page.evaluate(() => history.state?.easyTrackIndex)).toBe(boardIndex)
  await expect(page.getByRole('link', { name: 'Second', exact: true })).toBeVisible()
  expect(secondId).toBeTruthy()
  await expect.poll(() => page.evaluate(() => !!document.activeElement?.closest('.board-workspace, header'))).toBe(true)
  await expect(page.getByRole('link', { name: 'First', exact: true })).toHaveCount(0)
})
