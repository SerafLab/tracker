import { describe, expect, it, vi } from 'vitest'
import { CommandError } from '../application/agent-command'
import { createProjectBoardStore } from './project-board-store'
import type { ProjectBoardUseCases } from '../application/use-cases'

const board = { id: 'project', name: 'Поиск квартиры', createdAt: 'now', statuses: [], previewNotes: {} }
function useCases(overrides: Partial<ProjectBoardUseCases> = {}): ProjectBoardUseCases {
  return {
    executeAgentCommand: vi.fn(), updateCardAttributes: vi.fn(), cardDetails: vi.fn(), createNote: vi.fn(), updateNote: vi.fn(), deleteNote: vi.fn(),
    open: vi.fn(), exportBackup: vi.fn(), summary: vi.fn(), parseBackup: vi.fn(), restoreBackup: vi.fn(), catalogue: vi.fn().mockResolvedValue([]), projects: vi.fn().mockResolvedValue([]), preference: vi.fn(), setLastProject: vi.fn(), board: vi.fn().mockResolvedValue(board), boardView: vi.fn().mockResolvedValue(board),
    applyStatusSet: vi.fn(), createProject: vi.fn(), deleteProject: vi.fn(), renameProject: vi.fn(), createStatus: vi.fn(), renameStatus: vi.fn(), moveStatus: vi.fn(),
    createCard: vi.fn(), updateCard: vi.fn(), moveCard: vi.fn(), deleteCard: vi.fn(), deleteStatus: vi.fn().mockResolvedValue('deleted'), ...overrides,
  }
}

describe('project-board store', () => {
  it('commits a board only after storage and its use case confirm it', async () => {
    const api = useCases()
    const store = createProjectBoardStore(api)
    expect(await store.getState().openStorage()).toBe(true)
    expect(await store.getState().showBoard('project', true)).toBe(true)
    expect(store.getState().workspace).toEqual({ kind: 'board', board })
    expect(api.setLastProject).toHaveBeenCalledWith('project')
  })

  it('keeps the confirmed board when a mutation fails', async () => {
    const api = useCases({ updateCard: vi.fn().mockRejectedValue(new Error('quota')) })
    const store = createProjectBoardStore(api)
    await store.getState().showBoard('project')
    await store.getState().updateCard('project', 'card', { name: 'Новое имя', description: '', important: false, urgent: true })
    expect(store.getState().workspace).toEqual({ kind: 'board', board })
    expect(store.getState().saveError).toBe(true)
  })
})


it.each(['createCard', 'updateCard', 'moveCard'] as const)('preserves confirmed data and skips reload after %s failure', async operation => {
  const api = useCases({ [operation]: vi.fn().mockRejectedValue(new Error('quota')) })
  const store = createProjectBoardStore(api); await store.getState().showBoard('project')
  vi.mocked(api.boardView).mockClear()
  const state = store.getState()
  const input = { name: 'N', description: '', important: true, urgent: true }
  const result = operation === 'createCard' ? await state.createCard('project', 's', input) : operation === 'updateCard' ? await state.updateCard('project', 'c', input) : await state.moveCard('project', 'c', { statusId: 's', beforeCardId: null, expected: { statusId: 's', important: true, urgent: true } })
  expect(result).toBe(operation === 'moveCard' ? 'failed' : false)
  expect(api.boardView).not.toHaveBeenCalled()
  expect(store.getState().workspace).toEqual({ kind: 'board', board })
})
it('reloads the board only after a successful write', async () => {
  let finish!: () => void
  const api = useCases({ updateCard: vi.fn(() => new Promise<void>(resolve => { finish = resolve })) })
  const store = createProjectBoardStore(api); await store.getState().showBoard('project'); vi.mocked(api.boardView).mockClear()
  const saving = store.getState().updateCard('project', 'c', { name: 'N', description: '', important: true, urgent: false })
  expect(api.boardView).not.toHaveBeenCalled(); finish(); expect(await saving).toBe(true)
  expect(api.boardView).toHaveBeenCalledOnce()
})

it.each(['deleteCard', 'deleteStatus'] as const)('keeps confirmed data after %s storage failure', async operation => {
  const api = useCases({ [operation]: vi.fn().mockRejectedValue(new Error('quota')) })
  const store = createProjectBoardStore(api)
  await store.getState().showBoard('project')
  vi.mocked(api.boardView).mockClear()
  const result = await store.getState()[operation]('project', 'selected')
  expect(result).toBe(operation === 'deleteCard' ? false : 'failed')
  expect(api[operation]).toHaveBeenCalledWith('selected')
  expect(api.boardView).not.toHaveBeenCalled()
  expect(store.getState().workspace).toEqual({ kind: 'board', board })
  expect(store.getState().saveError).toBe(true)
})

it('returns nonempty refusal separately and leaves the confirmed board visible', async () => {
  const api = useCases({ deleteStatus: vi.fn().mockResolvedValue('not-empty') })
  const store = createProjectBoardStore(api)
  await store.getState().showBoard('project')
  store.setState({ saveError: true })
  vi.mocked(api.boardView).mockClear()
  expect(await store.getState().deleteStatus('project', 'selected')).toBe('not-empty')
  expect(api.boardView).not.toHaveBeenCalled()
  expect(store.getState().workspace).toEqual({ kind: 'board', board })
  expect(store.getState().saveError).toBe(false)
})

it.each(['deleteCard', 'deleteStatus'] as const)('updates the board only after %s persistence resolves', async operation => {
  let finish!: () => void
  const api = useCases(operation === 'deleteCard'
    ? { deleteCard: vi.fn(() => new Promise<void>(resolve => { finish = resolve })) }
    : { deleteStatus: vi.fn(() => new Promise<'deleted'>(resolve => { finish = () => resolve('deleted') })) })
  const store = createProjectBoardStore(api)
  await store.getState().showBoard('project')
  const saved = { ...board, name: 'Reloaded' }
  vi.mocked(api.boardView).mockClear().mockResolvedValue(saved)
  const deleting = store.getState()[operation]('project', 'selected')
  expect(api.boardView).not.toHaveBeenCalled()
  expect(store.getState().workspace).toEqual({ kind: 'board', board })
  finish()
  expect(await deleting).toBe(operation === 'deleteCard' ? true : 'deleted')
  expect(api.boardView).toHaveBeenCalledOnce()
  expect(store.getState().workspace).toEqual({ kind: 'board', board: saved })
})

it.each(['deleteCard', 'deleteStatus'] as const)('does not perform %s while mutation is disabled', async operation => {
  const api = useCases()
  const store = createProjectBoardStore(api, () => false)
  expect(await store.getState()[operation]('project', 'selected')).toBe(operation === 'deleteCard' ? false : 'failed')
  expect(api[operation]).not.toHaveBeenCalled()
})

it.each(['deleteCard', 'deleteStatus'] as const)('reports the saved %s when reloading storage fails afterward', async operation => {
  const api = useCases()
  const store = createProjectBoardStore(api)
  await store.getState().showBoard('project')
  vi.mocked(api.boardView).mockRejectedValueOnce(new Error('read unavailable'))
  expect(await store.getState()[operation]('project', 'selected')).toBe(operation === 'deleteCard' ? true : 'deleted')
  expect(store.getState().saveError).toBe(false)
  expect(store.getState().workspace).toEqual({ kind: 'unavailable' })
})

function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (error: Error) => void
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no })
  return { promise, resolve, reject }
}

it.each(['resolve', 'reject'] as const)('ignores a stale board %s after opening another board', async finish => {
  const pending = deferred<typeof board | undefined>()
  const next = { ...board, id: 'next' }
  const api = useCases({ boardView: vi.fn().mockReturnValueOnce(pending.promise).mockResolvedValue(next) })
  const store = createProjectBoardStore(api)
  const first = store.getState().showBoard('project', true)
  await store.getState().showBoard('next', true)
  if (finish === 'resolve') pending.resolve(board)
  else pending.reject(new Error('old read failed'))
  expect(await first).toBe(false)
  expect(store.getState().workspace).toEqual({ kind: 'board', board: next })
  expect(api.setLastProject).toHaveBeenCalledExactlyOnceWith('next')
})

it.each(['resolve', 'reject'] as const)('ignores a stale catalogue %s after opening a board', async finish => {
  const pending = deferred<[]>()
  const api = useCases({ catalogue: vi.fn(() => pending.promise) })
  const store = createProjectBoardStore(api)
  const catalogue = store.getState().showCatalogue()
  await store.getState().showBoard('project')
  if (finish === 'resolve') pending.resolve([])
  else pending.reject(new Error('old catalogue failed'))
  await catalogue
  expect(store.getState().workspace).toEqual({ kind: 'board', board })
})

it('ignores a pending board after returning to the catalogue', async () => {
  const pending = deferred<typeof board | undefined>()
  const api = useCases({ boardView: vi.fn(() => pending.promise) })
  const store = createProjectBoardStore(api)
  const loading = store.getState().showBoard('project', true)
  await store.getState().showCatalogue()
  await store.getState().clearLastProject()
  pending.resolve(board)
  await loading
  expect(store.getState().workspace).toEqual({ kind: 'catalogue', projects: [] })
  expect(api.setLastProject).toHaveBeenCalledExactlyOnceWith(undefined)
})

it.each(['board', 'catalogue'] as const)('orders an in-flight preference write before the latest %s preference', async destination => {
  const pending = deferred<void>()
  let saved: string | undefined
  const api = useCases({
    boardView: vi.fn(async id => ({ ...board, id })),
    setLastProject: vi.fn(async id => {
      if (id === 'project') await pending.promise
      saved = id
    }),
  })
  const store = createProjectBoardStore(api)
  const first = store.getState().showBoard('project', true)
  await vi.waitFor(() => expect(api.setLastProject).toHaveBeenCalledWith('project'))
  const latest = destination === 'board'
    ? store.getState().showBoard('next', true)
    : Promise.all([store.getState().showCatalogue(), store.getState().clearLastProject()])
  pending.resolve()
  await Promise.all([first, latest])
  expect(saved).toBe(destination === 'board' ? 'next' : undefined)
  expect(store.getState().workspace.kind).toBe(destination)
})

it('orders a pending preference clear before a newly opened board', async () => {
  const pending = deferred<void>()
  let saved: string | undefined
  const api = useCases({ setLastProject: vi.fn(async id => { if (!id) await pending.promise; saved = id }) })
  const store = createProjectBoardStore(api)
  const clearing = store.getState().clearLastProject()
  await vi.waitFor(() => expect(api.setLastProject).toHaveBeenCalledWith(undefined))
  const opening = store.getState().showBoard('project', true)
  pending.resolve()
  await Promise.all([clearing, opening])
  expect(saved).toBe('project')
})

it('does not reopen a board when a mutation completes after navigating away', async () => {
  const pending = deferred<void>()
  const api = useCases({ updateCard: vi.fn(() => pending.promise) })
  const store = createProjectBoardStore(api)
  await store.getState().showBoard('project')
  const saving = store.getState().updateCard('project', 'card', { name: 'Saved', description: '', important: false, urgent: false })
  await store.getState().showCatalogue()
  vi.mocked(api.boardView).mockClear()
  pending.resolve()
  expect(await saving).toBe(true)
  expect(api.boardView).not.toHaveBeenCalled()
  expect(store.getState().workspace.kind).toBe('catalogue')
})

it('refreshes both writes when concurrent mutations finish on the same board', async () => {
  const first = deferred<void>()
  const second = deferred<void>()
  const api = useCases({ updateCard: vi.fn().mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise) })
  const store = createProjectBoardStore(api)
  await store.getState().showBoard('project')
  vi.mocked(api.boardView).mockClear()
  const input = { name: 'Saved', description: '', important: false, urgent: false }
  const savingFirst = store.getState().updateCard('project', 'first', input)
  const savingSecond = store.getState().updateCard('project', 'second', input)
  first.resolve()
  await savingFirst
  second.resolve()
  await savingSecond
  expect(api.boardView).toHaveBeenCalledTimes(2)
})

it('forwards explicit initial statuses and reports a saved project only after commit', async () => {
  const pending = deferred<typeof board>()
  const api = useCases({ createProject: vi.fn(() => pending.promise) })
  const store = createProjectBoardStore(api)
  const input = { name: 'Project', initialStatusNames: ['One', 'Two'] }
  const saving = store.getState().createProject(input)
  expect(api.createProject).toHaveBeenCalledExactlyOnceWith(input)
  expect(store.getState().workspace.kind).toBe('loading')
  pending.resolve(board)
  expect(await saving).toBe('project')
  expect(store.getState().saveError).toBe(false)
})
it('reports failed initialization without opening a partial board', async () => {
  const api = useCases({ createProject: vi.fn().mockRejectedValue(Error('quota')) })
  const store = createProjectBoardStore(api)
  await store.getState().showCatalogue()
  expect(await store.getState().createProject({ name: 'Project', initialStatusNames: ['One'] })).toBeUndefined()
  expect(store.getState().saveError).toBe(true)
  expect(api.boardView).not.toHaveBeenCalled()
  expect(store.getState().workspace).toEqual({ kind: 'catalogue', projects: [] })
})

it('keeps the detail context and confirmed fields when saving fields and notes, including note failure', async () => {
  const card = { id: 'c', statusId: 's', name: 'Card', description: '', important: false, urgent: false, position: 0 }
  const details = { project: board, status: { id: 's', projectId: board.id, name: 'S', position: 0 }, card, notes: [] }
  const note = { id: 'n', cardId: 'c', text: 'Note', createdAt: 'now' }
  const api = useCases({ cardDetails: vi.fn().mockResolvedValue(details), createNote: vi.fn().mockResolvedValue(note) })
  const store = createProjectBoardStore(api); await store.getState().showCard(board.id, 'c', true)
  expect(await store.getState().updateCard(board.id, 'c', { ...card, name: 'Saved', description: 'Details' })).toBe(true)
  expect(store.getState().workspace).toMatchObject({ kind: 'card', details: { card: { name: 'Saved', description: 'Details' } } })
  await store.getState().createNote(board.id, 'c', 'Note')
  const confirmed = store.getState().workspace
  expect(confirmed).toMatchObject({ kind: 'card', details: { notes: [note] } })
  vi.mocked(api.boardView).mockClear()
  vi.mocked(api.updateNote).mockRejectedValueOnce(new Error('quota'))
  expect(await store.getState().updateNote(board.id, 'c', 'n', 'New')).toBeUndefined()
  expect(store.getState().workspace).toEqual(confirmed)
  expect(api.boardView).not.toHaveBeenCalled()
})

it.each(['resolve', 'reject'] as const)('ignores a stale detail %s after the user opens a board', async finish => {
  const details = { project: board, status: { id: 's', projectId: board.id, name: 'S', position: 0 }, card: { id: 'c', statusId: 's', name: 'C', description: '', important: false, urgent: false, position: 0 }, notes: [] }
  const pending = deferred<typeof details>()
  const api = useCases({ cardDetails: vi.fn(() => pending.promise) })
  const store = createProjectBoardStore(api)
  const first = store.getState().showCard(board.id, 'c', true)
  await store.getState().showBoard('project', true)
  if (finish === 'resolve') pending.resolve(details)
  else pending.reject(new Error('old read failed'))
  expect(await first).toBe('superseded')
  expect(store.getState().workspace).toEqual({ kind: 'board', board })
  expect(api.setLastProject).toHaveBeenCalledExactlyOnceWith('project')
})

it('refreshes board previews after confirmed note add, edit and delete, and keeps the snapshot after failures', async () => {
  const card = { id: 'c', statusId: 's', name: 'Card', description: '', important: false, urgent: false, position: 0 }
  const details = { project: board, status: { id: 's', projectId: board.id, name: 'S', position: 0 }, card, notes: [{ id: 'n', cardId: 'c', text: 'Old', createdAt: 'a' }] }
  const note = { id: 'm', cardId: 'c', text: 'New', createdAt: 'b' }
  const api = useCases({ cardDetails: vi.fn().mockResolvedValue(details), createNote: vi.fn().mockResolvedValue(note), updateNote: vi.fn().mockResolvedValue({ ...note, text: 'Edited' }), deleteNote: vi.fn().mockResolvedValue(undefined) })
  const store = createProjectBoardStore(api); await store.getState().showCard(board.id, 'c', true)
  vi.mocked(api.boardView).mockClear()
  const refreshed = { ...board, previewNotes: { c: [note] } }
  vi.mocked(api.boardView).mockResolvedValue(refreshed)
  await store.getState().createNote(board.id, 'c', 'New')
  expect(store.getState().boardSnapshot).toEqual(refreshed)
  await store.getState().updateNote(board.id, 'c', 'm', 'Edited')
  await store.getState().deleteNote(board.id, 'c', 'm')
  expect(api.boardView).toHaveBeenCalledTimes(3)
  vi.mocked(api.boardView).mockClear()
  vi.mocked(api.createNote).mockRejectedValueOnce(new Error('quota'))
  expect(await store.getState().createNote(board.id, 'c', 'Lost')).toBeUndefined()
  expect(api.boardView).not.toHaveBeenCalled()
  expect(store.getState().boardSnapshot).toEqual(refreshed)
})

it('refuses detail writes through a stale storage connection', async () => {
  const api = useCases(), store = createProjectBoardStore(api, () => false)
  expect(await store.getState().createNote('project', 'c', 'New')).toBeUndefined()
  expect(await store.getState().updateNote('project', 'c', 'n', 'Changed')).toBeUndefined()
  expect(await store.getState().deleteNote('project', 'c', 'n')).toBe(false)
  expect(await store.getState().updateCard('project', 'c', { name: 'Changed', description: 'Draft', important: false, urgent: false })).toBe(false)
  for (const mutation of [api.createNote, api.updateNote, api.deleteNote, api.updateCard]) expect(mutation).not.toHaveBeenCalled()
})

it('keeps the confirmed project while deletion is pending, then refreshes only after commit', async () => {
  const pending = deferred<void>()
  const api = useCases({ deleteProject: vi.fn(() => pending.promise) })
  const store = createProjectBoardStore(api)
  await store.getState().showBoard('project', true)
  vi.mocked(api.setLastProject).mockClear()
  const deleting = store.getState().deleteProject('project')
  expect(store.getState().workspace).toEqual({ kind: 'board', board })
  expect(api.catalogue).not.toHaveBeenCalled()
  pending.resolve()
  expect(await deleting).toBe(true)
  expect(api.deleteProject).toHaveBeenCalledExactlyOnceWith('project')
  expect(store.getState().workspace).toEqual({ kind: 'catalogue', projects: [] })
  expect(api.setLastProject).not.toHaveBeenCalled()
})

it('keeps workspace and error after a rejected project deletion and allows retry', async () => {
  const api = useCases({ deleteProject: vi.fn().mockRejectedValueOnce(Error('quota')).mockResolvedValue(undefined) })
  const store = createProjectBoardStore(api)
  await store.getState().showBoard('project')
  expect(await store.getState().deleteProject('project')).toBe(false)
  expect(store.getState().workspace).toEqual({ kind: 'board', board })
  expect(store.getState().saveError).toBe(true)
  expect(api.catalogue).not.toHaveBeenCalled()
  expect(await store.getState().deleteProject('project')).toBe(true)
  expect(store.getState().saveError).toBe(false)
})

it('refuses project deletion after storage becomes stale', async () => {
  const api = useCases(), store = createProjectBoardStore(api, () => false)
  expect(await store.getState().deleteProject('project')).toBe(false)
  expect(api.deleteProject).not.toHaveBeenCalled()
})

it('reports project deletion as saved when only its catalogue refresh fails, and retries reading without deleting twice', async () => {
  const api = useCases({ catalogue: vi.fn().mockRejectedValueOnce(Error('read unavailable')).mockResolvedValue([]) })
  const store = createProjectBoardStore(api)
  await store.getState().showBoard('project')
  expect(await store.getState().deleteProject('project')).toBe(true)
  expect(store.getState().workspace).toEqual({ kind: 'unavailable' })
  expect(store.getState().saveError).toBe(false)
  await store.getState().showCatalogue()
  expect(api.deleteProject).toHaveBeenCalledOnce()
  expect(store.getState().workspace).toEqual({ kind: 'catalogue', projects: [] })
})

it('queries a deletion summary without navigating or remembering another project', async () => {
  const api = useCases({ board: vi.fn().mockResolvedValue({ ...board, statuses: [{ id: 's', cards: [{ id: 'c' }, { id: 'd' }] }, { id: 'empty', cards: [] }] }) })
  const store = createProjectBoardStore(api)
  await store.getState().showCatalogue()
  expect(await store.getState().projectDeletionSummary('project')).toEqual({ statusCount: 2, cardCount: 2 })
  expect(store.getState().workspace).toEqual({ kind: 'catalogue', projects: [] })
  expect(api.setLastProject).not.toHaveBeenCalled()
})

it('locks conflicting operations during placement and refresh, then reports the saved result', async () => {
  const commit = deferred<'saved'>(), read = deferred<typeof board>()
  const api = useCases({ moveCard: vi.fn(() => commit.promise) }), store = createProjectBoardStore(api)
  await store.getState().showBoard(board.id)
  vi.mocked(api.boardView).mockImplementationOnce(() => read.promise)
  const placement = { statusId: 'target', beforeCardId: null, expected: { statusId: 's', important: false, urgent: false } }
  const moving = store.getState().moveCard(board.id, 'c', placement)
  expect(store.getState().placementPending).toBe(true)
  expect(await store.getState().moveCard(board.id, 'c', placement)).toBe('failed')
  expect(await store.getState().deleteCard(board.id, 'c')).toBe(false)
  expect(await store.getState().deleteProject(board.id)).toBe(false)
  expect(api.deleteProject).not.toHaveBeenCalled()
  expect(await store.getState().renameStatus(board.id, 's', 'Changed')).toBe(false)
  expect(await store.getState().deleteStatus(board.id, 's')).toBe('failed')
  expect(api.deleteCard).not.toHaveBeenCalled(); expect(api.renameStatus).not.toHaveBeenCalled()
  commit.resolve('saved')
  await vi.waitFor(() => expect(api.boardView).toHaveBeenCalledTimes(2))
  expect(store.getState().placementPending).toBe(true)
  expect(await store.getState().deleteProject(board.id)).toBe(false)
  expect(api.deleteProject).not.toHaveBeenCalled()
  read.resolve({ ...board, name: 'Refreshed' })
  expect(await moving).toBe('saved'); expect(store.getState().placementPending).toBe(false)
  expect(api.moveCard).toHaveBeenCalledExactlyOnceWith('c', placement)
})

it('distinguishes failed commit from failed refresh and retries only the committed placement read', async () => {
  const api = useCases({ moveCard: vi.fn().mockRejectedValueOnce(Error('write failed')).mockResolvedValue('saved') }), store = createProjectBoardStore(api)
  await store.getState().showBoard(board.id)
  const confirmed = store.getState().workspace, placement = { statusId: 'target', beforeCardId: null, expected: { statusId: 's', important: false, urgent: false } }
  expect(await store.getState().moveCard(board.id, 'c', placement)).toBe('failed')
  expect(store.getState().workspace).toBe(confirmed); expect(store.getState().saveError).toBe(true)
  vi.mocked(api.boardView).mockRejectedValueOnce(Error('read failed'))
  expect(await store.getState().moveCard(board.id, 'c', placement)).toBe('refresh-failed')
  expect(store.getState().workspace).toBe(confirmed); expect(store.getState().saveError).toBe(false)
  expect(store.getState().placementRefreshError).toBe(board.id)
  expect(await store.getState().moveCard(board.id, 'c', placement)).toBe('failed')
  expect(await store.getState().updateCard(board.id, 'c', { name: 'Blocked', description: '', important: false, urgent: false })).toBe(false)
  expect(api.updateCard).not.toHaveBeenCalled()
  expect(await store.getState().deleteProject(board.id)).toBe(false)
  expect(api.deleteProject).not.toHaveBeenCalled()
  expect(await store.getState().retryPlacementRefresh()).toBe(true)
  expect(api.moveCard).toHaveBeenCalledTimes(2)
  expect(store.getState().placementRefreshError).toBeNull()
})

it('clears a recovered board error and rejects an older retry read after newer navigation', async () => {
  const api = useCases({ moveCard: vi.fn().mockResolvedValue('saved') }), store = createProjectBoardStore(api)
  await store.getState().showBoard(board.id)
  vi.mocked(api.boardView).mockRejectedValueOnce(Error('read failed'))
  await store.getState().moveCard(board.id, 'c', { statusId: 's', beforeCardId: null, expected: { statusId: 's', important: false, urgent: false } })
  const retry = deferred<typeof board>()
  vi.mocked(api.boardView).mockImplementationOnce(() => retry.promise)
  const reading = store.getState().retryPlacementRefresh()
  vi.mocked(api.boardView).mockResolvedValueOnce({ ...board, name: 'Newer confirmed board' })
  await store.getState().showBoard(board.id)
  expect(store.getState().placementRefreshError).toBeNull()
  retry.resolve({ ...board, name: 'Older retry' })
  expect(await reading).toBe(false)
  expect(store.getState().workspace).toEqual({ kind: 'board', board: { ...board, name: 'Newer confirmed board' } })
  expect(store.getState().placementPending).toBe(false)
})

it.each(['commit', 'refresh', 'refresh-failed'] as const)('clears catalogue preference independently of placement %s', async stage => {
  const commit = deferred<'saved'>(), read = deferred<typeof board>()
  let preference: string | undefined = board.id
  const api = useCases({
    moveCard: vi.fn(() => commit.promise),
    setLastProject: vi.fn(async id => { preference = id }),
    preference: vi.fn(async () => ({ id: 'workspace' as const, lastProjectId: preference })),
  })
  const store = createProjectBoardStore(api)
  await store.getState().showBoard(board.id)
  vi.mocked(api.boardView).mockImplementationOnce(() => read.promise)
  const moving = store.getState().moveCard(board.id, 'c', { statusId: 's', beforeCardId: null, expected: { statusId: 's', important: false, urgent: false } })
  if (stage !== 'commit') {
    commit.resolve('saved')
    await vi.waitFor(() => expect(api.boardView).toHaveBeenCalledTimes(2))
    if (stage === 'refresh-failed') { read.reject(Error('read failed')); expect(await moving).toBe('refresh-failed') }
  }
  expect(await store.getState().clearLastProject()).toBe(true)
  await store.getState().showCatalogue()
  commit.resolve('saved'); read.resolve(board)
  await moving
  expect(api.setLastProject).toHaveBeenCalledExactlyOnceWith(undefined)
  expect((await api.preference())?.lastProjectId).toBeUndefined()
  expect(store.getState().workspace).toEqual({ kind: 'catalogue', projects: [] })
  expect(store.getState().placementPending).toBe(false)
  expect(store.getState().placementRefreshError).toBeNull()
})

it.each(['resolve', 'reject'] as const)('ignores stale post-placement refresh %s after a newer same-project read', async finish => {
  const read = deferred<typeof board>(), latest = { ...board, name: 'Latest snapshot' }
  const api = useCases({ moveCard: vi.fn().mockResolvedValue('saved') }), store = createProjectBoardStore(api)
  await store.getState().showBoard(board.id)
  vi.mocked(api.boardView).mockImplementationOnce(() => read.promise)
  const moving = store.getState().moveCard(board.id, 'c', { statusId: 's', beforeCardId: null, expected: { statusId: 's', important: false, urgent: false } })
  await vi.waitFor(() => expect(api.boardView).toHaveBeenCalledTimes(2))
  vi.mocked(api.boardView).mockResolvedValueOnce(latest)
  expect(await store.getState().showBoard(board.id)).toBe(true)
  if (finish === 'resolve') read.resolve({ ...board, name: 'Old placement snapshot' })
  else read.reject(Error('old placement read failed'))
  expect(await moving).toBe('saved')
  expect(store.getState().workspace).toEqual({ kind: 'board', board: latest })
  expect(store.getState().placementRefreshError).toBeNull()
  expect(store.getState().saveError).toBe(false)
  expect(store.getState().placementPending).toBe(false)
  expect(api.moveCard).toHaveBeenCalledOnce()
})

it('blocks duplicate set applications and native writes until the confirmed board is refreshed', async () => {
  const pending = deferred<void>()
  const api = useCases({ applyStatusSet: vi.fn(() => pending.promise) })
  const store = createProjectBoardStore(api)
  await store.getState().openStorage()
  await store.getState().showBoard('project')
  const applying = store.getState().applyStatusSet('project', ['First'])
  expect(store.getState().applyingStatusSet).toBe(true)
  expect(() => store.getState().assertAgentReady()).toThrow('pending')
  expect(await store.getState().applyStatusSet('project', ['First'])).toBe('failed')
  expect(api.applyStatusSet).toHaveBeenCalledOnce()
  pending.resolve()
  expect(await applying).toBe('saved')
  expect(api.boardView).toHaveBeenCalledTimes(2)
  expect(store.getState().applyingStatusSet).toBe(false)
})
it('retains a failed empty-board state and refreshes an authoritative conflict', async () => {
  const api = useCases({ applyStatusSet: vi.fn().mockRejectedValueOnce(Error('quota')).mockRejectedValueOnce(new CommandError('conflict')) })
  const store = createProjectBoardStore(api)
  await store.getState().showBoard('project')
  const previous = store.getState().workspace
  expect(await store.getState().applyStatusSet('project', ['First'])).toBe('failed')
  expect(store.getState().workspace).toEqual(previous)
  expect(store.getState().saveError).toBe(true)
  expect(await store.getState().applyStatusSet('project', ['First'])).toBe('conflict')
  expect(api.boardView).toHaveBeenCalledTimes(2)
  expect(store.getState().saveError).toBe(false)
})
it('leaves a board whose project was deleted elsewhere for the catalogue', async () => {
  const api = useCases({ applyStatusSet: vi.fn().mockRejectedValue(new CommandError('not_found')), projects: vi.fn().mockResolvedValue([]) })
  const store = createProjectBoardStore(api)
  await store.getState().showBoard('project')
  expect(await store.getState().applyStatusSet('project', ['First'])).toBe('missing')
  expect(store.getState().workspace).toEqual({ kind: 'catalogue', projects: [] })
  expect(store.getState().saveError).toBe(false)
})
it('does not repeat a committed set when only refreshing the board fails and refuses stale writes', async () => {
  const api = useCases({ boardView: vi.fn().mockResolvedValueOnce(board).mockRejectedValueOnce(Error('read')) })
  const store = createProjectBoardStore(api)
  await store.getState().showBoard('project')
  expect(await store.getState().applyStatusSet('project', ['First'])).toBe('saved')
  expect(api.applyStatusSet).toHaveBeenCalledOnce()
  expect(store.getState().workspace.kind).toBe('unavailable')
  const stale = createProjectBoardStore(api, () => false)
  expect(await stale.getState().applyStatusSet('project', ['First'])).toBe('failed')
  expect(api.applyStatusSet).toHaveBeenCalledOnce()
})
it('loads current catalogue summaries each time the catalogue is reopened', async () => {
  const first = [{ id: 'p', name: 'P', createdAt: 'now', cardCount: 0 }]
  const second = [{ ...first[0], cardCount: 5 }]
  const api = useCases({ catalogue: vi.fn().mockResolvedValueOnce(first).mockResolvedValueOnce(second) })
  const store = createProjectBoardStore(api)
  await store.getState().showCatalogue()
  expect(store.getState().workspace).toEqual({ kind: 'catalogue', projects: first })
  await store.getState().showBoard('p')
  await store.getState().showCatalogue()
  expect(store.getState().workspace).toEqual({ kind: 'catalogue', projects: second })
})

it('keeps the board snapshot beside an open card and refreshes only confirmed fields after a successful write', async () => {
  const card = { id: 'c', statusId: 's', name: 'Card', description: 'Before', important: false, urgent: false, position: 0 }
  const status = { id: 's', projectId: board.id, name: 'S', position: 0, cards: [card] }
  const snapshot = { ...board, statuses: [status] }
  const details = { project: board, status, card, notes: [] }
  const api = useCases({ boardView: vi.fn().mockResolvedValue(snapshot), cardDetails: vi.fn().mockResolvedValue(details), updateCard: vi.fn().mockRejectedValueOnce(Error('quota')).mockResolvedValue(undefined) })
  const store = createProjectBoardStore(api)
  await store.getState().showCard(board.id, card.id)
  expect(store.getState().boardSnapshot).toEqual(snapshot)
  const input = { ...card, description: 'After' }
  expect(await store.getState().updateCard(board.id, card.id, input)).toBe(false)
  expect(store.getState().boardSnapshot).toEqual(snapshot)
  expect(store.getState().workspace).toEqual({ kind: 'card', details })
  const saved = { ...snapshot, statuses: [{ ...status, cards: [input] }] }
  vi.mocked(api.boardView).mockResolvedValue(saved)
  expect(await store.getState().updateCard(board.id, card.id, input)).toBe(true)
  expect(store.getState().boardSnapshot).toEqual(saved)
  expect(store.getState().workspace).toMatchObject({ kind: 'card', details: { card: { description: 'After' } } })
})

it('does not lose open details when refreshing the board after a committed unrelated write fails', async () => {
  const card = { id: 'c', statusId: 's', name: 'Card', description: 'Before', important: false, urgent: false, position: 0 }
  const status = { id: 's', projectId: board.id, name: 'S', position: 0, cards: [card] }
  const snapshot = { ...board, statuses: [status] }, details = { project: board, status, card, notes: [] }
  const api = useCases({ boardView: vi.fn().mockResolvedValue(snapshot), cardDetails: vi.fn().mockResolvedValue(details) })
  const store = createProjectBoardStore(api)
  await store.getState().showCard(board.id, card.id)
  vi.mocked(api.boardView).mockRejectedValueOnce(Error('read failed'))
  expect(await store.getState().createCard(board.id, status.id, { name: 'Other', description: '', important: false, urgent: false })).toBe(true)
  expect(api.createCard).toHaveBeenCalledOnce()
  expect(store.getState().workspace).toEqual({ kind: 'card', details })
  expect(store.getState().boardSnapshot).toEqual(snapshot)
  expect(store.getState().agentRefreshError).toBe(true)
})


it('never pairs details with a stale board snapshot from another project', async () => {
  const other = { id: 'other', name: 'Other', createdAt: 'now' }
  const card = { id: 'c', statusId: 's', name: 'C', description: '', important: false, urgent: false, position: 0 }
  const details = { project: other, status: { id: 's', projectId: other.id, name: 'S', position: 0 }, card, notes: [] }
  const api = useCases({ cardDetails: vi.fn().mockResolvedValue(details) }), store = createProjectBoardStore(api)
  await store.getState().showBoard(board.id)
  vi.mocked(api.boardView).mockResolvedValueOnce(undefined)
  expect(await store.getState().showCard(other.id, card.id)).toBe('missing')
  expect(store.getState().boardSnapshot).toBeNull()
  expect(store.getState().workspace.kind).not.toBe('card')
})

it('replaces a previous project snapshot with the board of a missing card', async () => {
  const other = { ...board, id: 'other', name: 'Другой проект' }
  const api = useCases({ boardView: vi.fn(async (id: string) => id === 'other' ? other : board), cardDetails: vi.fn().mockResolvedValue(undefined) })
  const store = createProjectBoardStore(api)
  await store.getState().showBoard('other')
  expect(store.getState().boardSnapshot).toEqual(other)
  expect(await store.getState().showCard('project', 'gone')).toBe('shown')
  expect(store.getState().workspace).toEqual({ kind: 'card-missing', project: board })
  expect(store.getState().boardSnapshot).toEqual(board)
})


describe('restoreBackup', () => {
  const backup = { format: 'easytrack-backup' as const, formatVersion: 1, exportedAt: '2026-11-06T11:30:00.000Z', app: { version: 'test', commit: 'test' }, data: { projects: [], statuses: [], cards: [], notes: [] } }
  const deferred = <T,>() => { let resolve!: (value: T) => void; const promise = new Promise<T>(done => { resolve = done }); return { promise, resolve } }

  it('rejects restoration while an agent operation is pending', async () => {
    const api = useCases()
    const store = createProjectBoardStore(api)
    await store.getState().openStorage()
    const release = store.getState().beginAgentOperation()
    expect(await store.getState().restoreBackup(backup)).toBe(false)
    expect(api.restoreBackup).not.toHaveBeenCalled()
    release()
  })

  it('rejects restoration while a UI write is pending', async () => {
    const write = deferred<void>()
    const api = useCases({ renameProject: vi.fn().mockReturnValue(write.promise) })
    const store = createProjectBoardStore(api)
    const rename = store.getState().renameProject('project', 'Имя')
    expect(await store.getState().restoreBackup(backup)).toBe(false)
    expect(api.restoreBackup).not.toHaveBeenCalled()
    write.resolve()
    await rename
  })

  it('answers agent commands with conflict while the replacement runs', async () => {
    const replacement = deferred<void>()
    const api = useCases({ restoreBackup: vi.fn().mockReturnValue(replacement.promise) })
    const store = createProjectBoardStore(api)
    await store.getState().openStorage()
    const restoring = store.getState().restoreBackup(backup)
    await expect(store.getState().executeAgentCommand({ kind: 'rename_project', projectId: 'project', name: 'Новое' })).rejects.toMatchObject({ code: 'conflict' })
    expect(await store.getState().createProject({ name: 'Новый', initialStatusNames: [] })).toBeUndefined()
    replacement.resolve()
    expect(await restoring).toBe(true)
    expect(store.getState().agentPending).toBe(false)
  })

  it('shows the restored catalogue and drops the cached board', async () => {
    const restored = [{ id: 'restored', name: 'Из копии', createdAt: '2026-11-01T10:00:00.000Z', cardCount: 0 }]
    const api = useCases()
    vi.mocked(api.restoreBackup).mockImplementation(async () => { vi.mocked(api.catalogue).mockResolvedValue(restored) })
    const store = createProjectBoardStore(api)
    await store.getState().showBoard('project')
    expect(store.getState().boardSnapshot).toEqual(board)
    expect(await store.getState().restoreBackup(backup)).toBe(true)
    expect(store.getState().boardSnapshot).toBeNull()
    expect(store.getState().workspace).toEqual({ kind: 'catalogue', projects: restored })
  })

  it('propagates a write failure and releases the pending flag', async () => {
    const api = useCases({ restoreBackup: vi.fn().mockRejectedValue(new Error('quota')) })
    const store = createProjectBoardStore(api)
    await store.getState().showBoard('project')
    await expect(store.getState().restoreBackup(backup)).rejects.toThrow('quota')
    expect(store.getState().agentPending).toBe(false)
    expect(store.getState().workspace).toEqual({ kind: 'board', board })
  })
})
