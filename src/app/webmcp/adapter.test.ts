import { afterEach, expect, it, vi } from 'vitest'
import { createBrowserAdapter } from './adapter'
import { createToolRuntime } from './runtime'
import { createProjectBoardStore, createProjectBoardUseCases, DexieProjectBoardRepository, ProjectBoardDatabase } from '../../features/project-board'
const databases: ProjectBoardDatabase[] = []
afterEach(async () => { await Promise.all(databases.splice(0).map(db => db.delete())) })
function deferred<T>() { let resolve!: (value: T) => void; const promise = new Promise<T>(yes => { resolve = yes }); return { promise, resolve } }
async function setup() {
  const db = new ProjectBoardDatabase(`adapter-${crypto.randomUUID()}`); databases.push(db)
  const repo = new DexieProjectBoardRepository(db)
  let id = 0, current = true, dirty = false
  const api = createProjectBoardUseCases({ repository: repo, createId: () => `id-${++id}`, now: () => 'now' })
  const store = createProjectBoardStore(api, () => current)
  await store.getState().openStorage()
  const project = await api.createProject({ name: 'Project', initialStatusNames: ['Only'] })
  const status = (await api.board(project.id))!.statuses[0]
  const card = await api.createCard(status.id, { name: 'Card', description: 'Description', important: false, urgent: false })
  await store.getState().showBoard(project.id)
  const onSaved = vi.fn(), showWorkspace = vi.fn(async () => ({ route: '', url: 'https://example.test/tracker/' }))
  const adapter = createBrowserAdapter({ store, state: () => current ? store.getState().storageState : 'restart_required', route: () => '', reads: api, isDirty: () => dirty, showWorkspace, onSaved })
  const runtime = createToolRuntime(adapter, { sessionId: 'session' })
  return { db, api, repo, store, runtime, project, status, card, onSaved, showWorkspace, stale: () => { current = false }, dirty: () => { dirty = true } }
}
it('refreshes the current board after commit and preserves catalogue/other-board context and preferences', async () => {
  const { runtime, store, project, status, api, onSaved } = await setup()
  const sessionId = runtime.sessionId
  expect(await runtime.call('create_card', { sessionId, requestId: 1, statusId: status.id, name: 'Agent' })).toMatchObject({ ok: true, data: { saved: true, card: { name: 'Agent', description: '', important: false, urgent: false } } })
  expect(store.getState().workspace).toMatchObject({ kind: 'board', board: { statuses: [{ cards: [{ name: 'Card' }, { name: 'Agent' }] }] } })
  expect(await runtime.call('create_project', { sessionId, requestId: 2, name: 'Background' })).toMatchObject({ ok: true })
  expect(store.getState().workspace).toMatchObject({ kind: 'board', board: { id: project.id } })
  expect((await api.preference())?.lastProjectId).toBe(project.id)
  await store.getState().showCatalogue(); await store.getState().clearLastProject()
  expect(await runtime.call('create_project', { sessionId, requestId: 3, name: 'From catalogue' })).toMatchObject({ ok: true })
  expect(store.getState().workspace).toMatchObject({ kind: 'catalogue', projects: [{}, {}, { name: 'From catalogue' }] })
  expect((await api.preference())?.lastProjectId).toBeUndefined()
  expect(onSaved).toHaveBeenCalledTimes(3)
})
it('retains the confirmed snapshot on commit failure and reports saved:true with read-only recovery after refresh failure', async () => {
  const { runtime, repo, store, status, onSaved } = await setup(), sessionId = runtime.sessionId
  vi.spyOn(repo, 'executeAgentCommand').mockRejectedValueOnce(Error('quota'))
  expect(await runtime.call('create_card', { sessionId, requestId: 1, statusId: status.id, name: 'Rejected' })).toMatchObject({ error: { code: 'storage_unavailable' } })
  expect(onSaved).not.toHaveBeenCalled()
  const committed = vi.spyOn(repo, 'createCard')
  vi.spyOn(repo, 'board').mockRejectedValueOnce(Error('view failed'))
  const result = await runtime.call('create_card', { sessionId, requestId: 2, statusId: status.id, name: 'Saved' })
  expect(result).toMatchObject({ ok: true, data: { saved: true, card: { name: 'Saved' }, warning: { code: 'view_refresh_failed' } } })
  expect(store.getState().workspace).toMatchObject({ kind: 'board', board: { statuses: [{ cards: [{ name: 'Card' }] }] } })
  expect(await runtime.call('create_card', { sessionId, requestId: 3, statusId: status.id, name: 'Blocked' })).toMatchObject({ error: { code: 'conflict' } })
  expect(await store.getState().deleteProject(status.projectId)).toBe(false)
  expect(await store.getState().retryAgentRefresh()).toBe(true)
  expect(committed).toHaveBeenCalledOnce()
  expect(onSaved).toHaveBeenCalledOnce()
})
it('shares pending protection with ordinary UI writes through commit and refresh and refuses stale connections', async () => {
  const { runtime, repo, store, status, stale } = await setup(), sessionId = runtime.sessionId
  const commit = deferred<void>(), read = deferred<Awaited<ReturnType<typeof repo.board>>>()
  const actual = repo.createCard.bind(repo)
  vi.spyOn(repo, 'createCard').mockImplementationOnce(async card => { await commit.promise; return actual(card) })
  const board = await repo.board(status.projectId)
  vi.spyOn(repo, 'board').mockImplementationOnce(() => read.promise)
  const pending = store.getState().createCard(status.projectId, status.id, { name: 'UI', description: '', important: false, urgent: false })
  const input = { sessionId, requestId: 1, statusId: status.id, name: 'Agent' }
  expect(await runtime.call('create_card', input)).toMatchObject({ error: { code: 'conflict' } })
  commit.resolve(); await vi.waitFor(() => expect(repo.board).toHaveBeenCalled())
  expect(await runtime.call('create_card', input)).toMatchObject({ error: { code: 'conflict' } })
  read.resolve(board); await pending
  stale()
  expect(await runtime.call('create_card', input)).toMatchObject({ error: { code: 'restart_required' } })
  expect(await store.getState().createCard(status.projectId, status.id, { name: 'UI blocked', description: '', important: false, urgent: false })).toBe(false)
})
it('protects a dirty target card and show requests but permits unrelated background edits without replacing the editor', async () => {
  const { runtime, store, repo, project, card, dirty } = await setup(), sessionId = runtime.sessionId
  await store.getState().showCard(project.id, card.id)
  dirty()
  for (const [requestId, tool, fields] of [[1, 'update_card', { cardId: card.id, name: 'Bad', important: true, urgent: true }], [2, 'delete_card', { cardId: card.id, confirm: true }], [3, 'move_card', { cardId: card.id, statusId: card.statusId, expected: { statusId: card.statusId, important: false, urgent: false } }], [4, 'show_workspace', {}]] as const) expect(await runtime.call(tool, { sessionId, requestId, ...fields })).toMatchObject({ error: { code: 'conflict' } })
  vi.spyOn(repo, 'cardDetails').mockRejectedValueOnce(Error('read failure'))
  expect(await runtime.call('rename_project', { sessionId, requestId: 5, projectId: project.id, name: 'New project name' })).toMatchObject({ ok: true, data: { saved: true, warning: { code: 'view_refresh_failed' } } })
  expect(store.getState().workspace).toMatchObject({ kind: 'card', details: { card: { id: card.id, description: 'Description' } } })
})
it('holds the shared store lease across runtime replacement until the dispatched operation actually ends', async () => {
  const { runtime, repo, store, status, api } = await setup(), sessionId = runtime.sessionId
  const pending = deferred<void>(), actual = repo.executeAgentCommand.bind(repo)
  vi.spyOn(repo, 'executeAgentCommand').mockImplementationOnce(async command => { await pending.promise; return actual(command) })
  const first = runtime.call('create_card', { sessionId, requestId: 1, statusId: status.id, name: 'Old lifetime' })
  await vi.waitFor(() => expect(store.getState().agentPending).toBe(true))
  runtime.close()
  const next = createToolRuntime(createBrowserAdapter({ store, state: () => 'ready', route: () => '', reads: api, isDirty: () => false, showWorkspace: vi.fn(), onSaved: vi.fn() }), { sessionId: 'fresh' })
  expect(await next.call('create_card', { sessionId: 'fresh', requestId: 1, statusId: status.id, name: 'New lifetime' })).toMatchObject({ error: { code: 'conflict' } })
  expect(await store.getState().deleteProject(status.projectId)).toBe(false)
  pending.resolve(); expect(await first).toMatchObject({ ok: true })
  expect(await next.call('create_card', { sessionId: 'fresh', requestId: 1, statusId: status.id, name: 'New lifetime' })).toMatchObject({ ok: true })
  expect(repo.executeAgentCommand).toHaveBeenCalledTimes(2)
})
it('does not cancel a newer navigation read when a background commit completes', async () => {
  const { runtime, repo, store, status, api } = await setup(), sessionId = runtime.sessionId
  const other = await api.createProject({ name: 'Other', initialStatusNames: [] })
  const board = (await repo.board(other.id))!
  const pending = deferred<void>(), read = deferred<typeof board>(), actual = repo.executeAgentCommand.bind(repo)
  vi.spyOn(repo, 'executeAgentCommand').mockImplementationOnce(async command => { await pending.promise; return actual(command) })
  const first = runtime.call('create_card', { sessionId, requestId: 1, statusId: status.id, name: 'Background' })
  await vi.waitFor(() => expect(store.getState().agentPending).toBe(true))
  vi.spyOn(repo, 'board').mockImplementationOnce(() => read.promise)
  const navigation = store.getState().showBoard(other.id)
  pending.resolve(); expect(await first).toMatchObject({ ok: true })
  read.resolve(board)
  expect(await navigation).toBe(true)
  expect(store.getState().workspace).toEqual({ kind: 'board', board })
})
