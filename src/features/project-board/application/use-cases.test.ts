import { describe, expect, it, vi } from 'vitest'
import { createProjectBoardUseCases } from './use-cases'
import type { ProjectBoardRepository } from './repository'

function repository(): ProjectBoardRepository {
  return {
    open: vi.fn(), projects: vi.fn().mockResolvedValue([]), preference: vi.fn(), setLastProject: vi.fn(),
    createProject: vi.fn().mockImplementation(project => Promise.resolve(project)), renameProject: vi.fn(),
    board: vi.fn(), createStatus: vi.fn().mockImplementation(status => Promise.resolve({ ...status, position: 0 })),
    renameStatus: vi.fn(), moveStatus: vi.fn(), createCard: vi.fn().mockImplementation(card => Promise.resolve({ ...card, position: 0 })),
    renameCard: vi.fn(), moveCard: vi.fn(),
  }
}

describe('project-board use cases', () => {
  it('creates trimmed project, status, and card records through the repository port', async () => {
    const port = repository()
    const useCases = createProjectBoardUseCases({ repository: port, createId: vi.fn().mockReturnValueOnce('project').mockReturnValueOnce('status').mockReturnValueOnce('card'), now: () => '2026-10-07T00:00:00.000Z' })
    await useCases.createProject('  Поиск квартиры  ')
    await useCases.createStatus('project', 'Найдено')
    await useCases.createCard('status', 'Квартира у парка')
    expect(port.createProject).toHaveBeenCalledWith({ id: 'project', name: 'Поиск квартиры', createdAt: '2026-10-07T00:00:00.000Z' })
    expect(port.createStatus).toHaveBeenCalledWith({ id: 'status', projectId: 'project', name: 'Найдено' })
    expect(port.createCard).toHaveBeenCalledWith({ id: 'card', statusId: 'status', name: 'Квартира у парка' })
  })

  it('validates renames and passes ordering commands through the port', async () => {
    const port = repository()
    const useCases = createProjectBoardUseCases({ repository: port, createId: () => 'id', now: () => 'now' })
    await useCases.renameProject('project', 'Паспорт')
    await useCases.renameStatus('status', 'Просмотр')
    await useCases.renameCard('card', 'Квартира')
    await useCases.moveStatus('status', -1)
    await useCases.moveCard('card', 'other-status')
    expect(port.renameProject).toHaveBeenCalledWith('project', 'Паспорт')
    expect(port.renameStatus).toHaveBeenCalledWith('status', 'Просмотр')
    expect(port.renameCard).toHaveBeenCalledWith('card', 'Квартира')
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
