import { describe, expect, it, vi } from 'vitest'
import { createProjectBoardStore } from './project-board-store'
import type { ProjectBoardUseCases } from '../application/use-cases'

const board = { id: 'project', name: 'Поиск квартиры', createdAt: 'now', statuses: [] }
function useCases(overrides: Partial<ProjectBoardUseCases> = {}): ProjectBoardUseCases {
  return {
    open: vi.fn(), projects: vi.fn().mockResolvedValue([]), preference: vi.fn(), setLastProject: vi.fn(), board: vi.fn().mockResolvedValue(board),
    createProject: vi.fn(), renameProject: vi.fn(), createStatus: vi.fn(), renameStatus: vi.fn(), moveStatus: vi.fn(),
    createCard: vi.fn(), renameCard: vi.fn(), moveCard: vi.fn(), ...overrides,
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
    const api = useCases({ renameCard: vi.fn().mockRejectedValue(new Error('quota')) })
    const store = createProjectBoardStore(api)
    await store.getState().showBoard('project')
    await store.getState().renameCard('project', 'card', 'Новое имя')
    expect(store.getState().workspace).toEqual({ kind: 'board', board })
    expect(store.getState().saveError).toMatch('Не удалось сохранить')
  })
})
