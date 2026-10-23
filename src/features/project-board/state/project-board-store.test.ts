import { describe, expect, it, vi } from 'vitest'
import { createProjectBoardStore } from './project-board-store'
import type { ProjectBoardUseCases } from '../application/use-cases'

const board = { id: 'project', name: 'Поиск квартиры', createdAt: 'now', statuses: [] }
function useCases(overrides: Partial<ProjectBoardUseCases> = {}): ProjectBoardUseCases {
  return {
    open: vi.fn(), projects: vi.fn().mockResolvedValue([]), preference: vi.fn(), setLastProject: vi.fn(), board: vi.fn().mockResolvedValue(board),
    createProject: vi.fn(), renameProject: vi.fn(), createStatus: vi.fn(), renameStatus: vi.fn(), moveStatus: vi.fn(),
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
    await store.getState().updateCard('project', 'card', { name: 'Новое имя', important: false, urgent: true })
    expect(store.getState().workspace).toEqual({ kind: 'board', board })
    expect(store.getState().saveError).toBe(true)
  })
})


it.each(['createCard', 'updateCard', 'moveCard'] as const)('preserves confirmed data and skips reload after %s failure', async operation => {
  const api = useCases({ [operation]: vi.fn().mockRejectedValue(new Error('quota')) })
  const store = createProjectBoardStore(api); await store.getState().showBoard('project')
  vi.mocked(api.board).mockClear()
  const state = store.getState()
  const input = { name: 'N', important: true, urgent: true }
  const result = operation === 'createCard' ? await state.createCard('project', 's', input) : operation === 'updateCard' ? await state.updateCard('project', 'c', input) : await state.moveCard('project', 'c', 's')
  expect(result).toBe(false)
  expect(api.board).not.toHaveBeenCalled()
  expect(store.getState().workspace).toEqual({ kind: 'board', board })
})
it('reloads the board only after a successful write', async () => {
  let finish!: () => void
  const api = useCases({ updateCard: vi.fn(() => new Promise<void>(resolve => { finish = resolve })) })
  const store = createProjectBoardStore(api); await store.getState().showBoard('project'); vi.mocked(api.board).mockClear()
  const saving = store.getState().updateCard('project', 'c', { name: 'N', important: true, urgent: false })
  expect(api.board).not.toHaveBeenCalled(); finish(); expect(await saving).toBe(true)
  expect(api.board).toHaveBeenCalledOnce()
})

it.each(['deleteCard', 'deleteStatus'] as const)('keeps confirmed data after %s storage failure', async operation => {
  const api = useCases({ [operation]: vi.fn().mockRejectedValue(new Error('quota')) })
  const store = createProjectBoardStore(api)
  await store.getState().showBoard('project')
  vi.mocked(api.board).mockClear()
  const result = await store.getState()[operation]('project', 'selected')
  expect(result).toBe(operation === 'deleteCard' ? false : 'failed')
  expect(api[operation]).toHaveBeenCalledWith('selected')
  expect(api.board).not.toHaveBeenCalled()
  expect(store.getState().workspace).toEqual({ kind: 'board', board })
  expect(store.getState().saveError).toBe(true)
})

it('returns nonempty refusal separately and leaves the confirmed board visible', async () => {
  const api = useCases({ deleteStatus: vi.fn().mockResolvedValue('not-empty') })
  const store = createProjectBoardStore(api)
  await store.getState().showBoard('project')
  store.setState({ saveError: true })
  vi.mocked(api.board).mockClear()
  expect(await store.getState().deleteStatus('project', 'selected')).toBe('not-empty')
  expect(api.board).not.toHaveBeenCalled()
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
  vi.mocked(api.board).mockClear().mockResolvedValue(saved)
  const deleting = store.getState()[operation]('project', 'selected')
  expect(api.board).not.toHaveBeenCalled()
  expect(store.getState().workspace).toEqual({ kind: 'board', board })
  finish()
  expect(await deleting).toBe(operation === 'deleteCard' ? true : 'deleted')
  expect(api.board).toHaveBeenCalledOnce()
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
  vi.mocked(api.board).mockRejectedValueOnce(new Error('read unavailable'))
  expect(await store.getState()[operation]('project', 'selected')).toBe(operation === 'deleteCard' ? true : 'deleted')
  expect(store.getState().saveError).toBe(false)
  expect(store.getState().workspace).toEqual({ kind: 'unavailable' })
})
