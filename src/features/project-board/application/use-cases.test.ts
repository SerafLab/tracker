import { describe, expect, it, vi } from 'vitest'
import { createProjectBoardUseCases } from './use-cases'
import type { ProjectBoardRepository } from './repository'

function repository(): ProjectBoardRepository {
  return {
    open: vi.fn(), projects: vi.fn().mockResolvedValue([]), preference: vi.fn(), setLastProject: vi.fn(),
    createProject: vi.fn().mockImplementation(project => Promise.resolve(project)), renameProject: vi.fn(),
    board: vi.fn(), createStatus: vi.fn().mockImplementation(status => Promise.resolve({ ...status, position: 0 })),
    renameStatus: vi.fn(), moveStatus: vi.fn(), createCard: vi.fn().mockImplementation(card => Promise.resolve({ ...card, position: 0 })),
    updateCard: vi.fn(), moveCard: vi.fn(),
  }
}

describe('project-board use cases', () => {
  it('creates trimmed project, status, and card records through the repository port', async () => {
    const port = repository()
    const useCases = createProjectBoardUseCases({ repository: port, createId: vi.fn().mockReturnValueOnce('project').mockReturnValueOnce('status').mockReturnValueOnce('card'), now: () => '2026-10-07T00:00:00.000Z' })
    await useCases.createProject('  Поиск квартиры  ')
    await useCases.createStatus('project', 'Найдено')
    await useCases.createCard('status', { name: 'Квартира у парка', important: false, urgent: true })
    expect(port.createProject).toHaveBeenCalledWith({ id: 'project', name: 'Поиск квартиры', createdAt: '2026-10-07T00:00:00.000Z' })
    expect(port.createStatus).toHaveBeenCalledWith({ id: 'status', projectId: 'project', name: 'Найдено' })
    expect(port.createCard).toHaveBeenCalledWith({ id: 'card', statusId: 'status', name: 'Квартира у парка', important: false, urgent: true })
  })

  it('validates renames and passes ordering commands through the port', async () => {
    const port = repository()
    const useCases = createProjectBoardUseCases({ repository: port, createId: () => 'id', now: () => 'now' })
    await useCases.renameProject('project', 'Паспорт')
    await useCases.renameStatus('status', 'Просмотр')
    await useCases.updateCard('card', { name: 'Квартира', important: true, urgent: false })
    await useCases.moveStatus('status', -1)
    await useCases.moveCard('card', 'other-status')
    expect(port.renameProject).toHaveBeenCalledWith('project', 'Паспорт')
    expect(port.renameStatus).toHaveBeenCalledWith('status', 'Просмотр')
    expect(port.updateCard).toHaveBeenCalledWith('card', { name: 'Квартира', important: true, urgent: false })
    expect(port.moveStatus).toHaveBeenCalledWith('status', -1)
    expect(port.moveCard).toHaveBeenCalledWith('card', 'other-status')
  })

  it('rejects invalid input and preserves repository failures such as cross-project transfers', async () => {
    const port = repository()
    vi.mocked(port.moveCard).mockRejectedValueOnce(new Error('Нельзя перенести карточку в другой проект'))
    const useCases = createProjectBoardUseCases({ repository: port, createId: () => 'id', now: () => 'now' })
    expect(() => useCases.createProject(' ')).toThrow('Название обязательно')
    expect(port.createProject).not.toHaveBeenCalled()
    await expect(useCases.moveCard('card', 'foreign-status')).rejects.toThrow('другой проект')
  })
})


it('validates card names and preserves both independent flags for create and update', async () => {
  const port = repository()
  const api = createProjectBoardUseCases({ repository: port, createId: () => 'id', now: () => 'now' })
  for (const important of [false, true]) for (const urgent of [false, true]) {
    await api.createCard('s', { name: '  New  ', important, urgent })
    expect(port.createCard).toHaveBeenLastCalledWith({ id: 'id', statusId: 's', name: 'New', important, urgent })
    await api.updateCard('id', { name: '  Edit  ', important, urgent })
    expect(port.updateCard).toHaveBeenLastCalledWith('id', { name: 'Edit', important, urgent })
  }
  expect(() => api.createCard('s', { name: ' ', important: true, urgent: true })).toThrow()
  expect(() => api.updateCard('id', { name: ' ', important: false, urgent: false })).toThrow()
})
