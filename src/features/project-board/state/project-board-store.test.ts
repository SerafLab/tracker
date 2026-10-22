import { describe, expect, it, vi } from 'vitest'
import { createProjectBoardStore } from './project-board-store'
import type { ProjectBoardUseCases } from '../application/use-cases'

const board = { id: 'project', name: 'Поиск квартиры', createdAt: 'now', statuses: [] }
function useCases(overrides: Partial<ProjectBoardUseCases> = {}): ProjectBoardUseCases {
  return {
    open: vi.fn(), projects: vi.fn().mockResolvedValue([]), preference: vi.fn(), setLastProject: vi.fn(), board: vi.fn().mockResolvedValue(board),
    createProject: vi.fn(), renameProject: vi.fn(), createStatus: vi.fn(), renameStatus: vi.fn(), moveStatus: vi.fn(),
    createCard: vi.fn(), updateCard: vi.fn(), moveCard: vi.fn(), ...overrides,
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
