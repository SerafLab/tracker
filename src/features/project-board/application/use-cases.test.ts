import { describe, expect, it, vi } from 'vitest'
import { createProjectBoardUseCases } from './use-cases'
import type { ProjectBoardRepository } from './repository'

function repository(): ProjectBoardRepository {
  return {
    cardDetails: vi.fn(), createNote: vi.fn(), updateNote: vi.fn(), deleteNote: vi.fn(),
    open: vi.fn(), projects: vi.fn().mockResolvedValue([]), preference: vi.fn(), setLastProject: vi.fn(),
    createProject: vi.fn().mockImplementation(project => Promise.resolve(project)), renameProject: vi.fn(),
    board: vi.fn(), createStatus: vi.fn().mockImplementation(status => Promise.resolve({ ...status, position: 0 })),
    renameStatus: vi.fn(), moveStatus: vi.fn(), createCard: vi.fn().mockImplementation(card => Promise.resolve({ ...card, position: 0 })),
    updateCard: vi.fn(), moveCard: vi.fn(), deleteCard: vi.fn(), deleteStatus: vi.fn().mockResolvedValue('deleted'),
  }
}

describe('project-board use cases', () => {
  it('creates trimmed project, status, and card records through the repository port', async () => {
    const port = repository()
    const useCases = createProjectBoardUseCases({ repository: port, createId: vi.fn().mockReturnValueOnce('project').mockReturnValueOnce('status').mockReturnValueOnce('card'), now: () => '2026-10-07T00:00:00.000Z' })
    await useCases.createProject('  Поиск квартиры  ')
    await useCases.createStatus('project', 'Найдено')
    await useCases.createCard('status', { name: 'Квартира у парка', description: '', important: false, urgent: true })
    expect(port.createProject).toHaveBeenCalledWith({ id: 'project', name: 'Поиск квартиры', createdAt: '2026-10-07T00:00:00.000Z' })
    expect(port.createStatus).toHaveBeenCalledWith({ id: 'status', projectId: 'project', name: 'Найдено' })
    expect(port.createCard).toHaveBeenCalledWith({ id: 'card', statusId: 'status', name: 'Квартира у парка', description: '', important: false, urgent: true })
  })

  it('validates renames and passes ordering commands through the port', async () => {
    const port = repository()
    const useCases = createProjectBoardUseCases({ repository: port, createId: () => 'id', now: () => 'now' })
    await useCases.renameProject('project', 'Паспорт')
    await useCases.renameStatus('status', 'Просмотр')
    await useCases.updateCard('card', { name: 'Квартира', description: '', important: true, urgent: false })
    await useCases.moveStatus('status', -1)
    await useCases.moveCard('card', 'other-status')
    expect(port.renameProject).toHaveBeenCalledWith('project', 'Паспорт')
    expect(port.renameStatus).toHaveBeenCalledWith('status', 'Просмотр')
    expect(port.updateCard).toHaveBeenCalledWith('card', { name: 'Квартира', description: '', important: true, urgent: false })
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
    await api.createCard('s', { name: '  New  ', description: '', important, urgent })
    expect(port.createCard).toHaveBeenLastCalledWith({ id: 'id', statusId: 's', name: 'New', description: '', important, urgent })
    await api.updateCard('id', { name: '  Edit  ', description: '', important, urgent })
    expect(port.updateCard).toHaveBeenLastCalledWith('id', { name: 'Edit', description: '', important, urgent })
  }
  expect(() => api.createCard('s', { name: ' ', description: '', important: true, urgent: true })).toThrow()
  expect(() => api.updateCard('id', { name: ' ', description: '', important: false, urgent: false })).toThrow()
})


it('deletes by selected ID and distinguishes nonempty status refusal from storage errors', async () => {
  const port = repository()
  const api = createProjectBoardUseCases({ repository: port, createId: () => 'unused', now: () => 'unused' })
  await api.deleteCard('selected-card')
  expect(port.deleteCard).toHaveBeenCalledWith('selected-card')
  expect(await api.deleteStatus('selected-status')).toBe('deleted')
  expect(port.deleteStatus).toHaveBeenCalledWith('selected-status')
  vi.mocked(port.deleteStatus).mockResolvedValueOnce('not-empty')
  expect(await api.deleteStatus('selected-status')).toBe('not-empty')
  vi.mocked(port.deleteStatus).mockRejectedValueOnce(new Error('quota'))
  await expect(api.deleteStatus('selected-status')).rejects.toThrow('quota')
  vi.mocked(port.deleteCard).mockRejectedValueOnce(new Error('quota'))
  await expect(api.deleteCard('selected-card')).rejects.toThrow('quota')
})

it('validates notes, gives new notes injected identifiers/dates and leaves edit metadata to the repository', async () => {
  const port = repository()
  const api = createProjectBoardUseCases({ repository: port, createId: () => 'note', now: () => '2026-11-01T12:00:00Z' })
  expect(() => api.createNote('card', ' \n ')).toThrow('Текст заметки обязателен')
  expect(() => api.updateNote('card', 'note', ' ')).toThrow('Текст заметки обязателен')
  expect(port.createNote).not.toHaveBeenCalled()
  await api.createNote('card', '  First\n  second  ')
  expect(port.createNote).toHaveBeenCalledWith({ id: 'note', cardId: 'card', text: 'First\n  second', createdAt: '2026-11-01T12:00:00Z' })
  await api.updateNote('card', 'note', '  Revised  ')
  expect(port.updateNote).toHaveBeenCalledWith('card', 'note', 'Revised', '2026-11-01T12:00:00Z')
  await api.deleteNote('card', 'note')
  expect(port.deleteNote).toHaveBeenCalledWith('card', 'note')
})
