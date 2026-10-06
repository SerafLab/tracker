import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { App } from './main'
import { TrackerDatabase, TrackerRepository } from './storage'

const databases: TrackerDatabase[] = []
function repository() {
  const database = new TrackerDatabase(`app-${crypto.randomUUID()}`)
  databases.push(database)
  return new TrackerRepository(database)
}
async function createWith(user: ReturnType<typeof userEvent.setup>, label: string, name: string, button: string) {
  const input = await screen.findByLabelText(label)
  await user.type(input, name)
  await user.click(within(input.closest('form')!).getByRole('button', { name: button }))
}

beforeEach(() => { location.hash = '' })
afterEach(async () => {
  cleanup()
  await Promise.all(databases.splice(0).map(async database => { database.close(); await database.delete() }))
})

describe('project board', () => {
  it('opens a selected project and keeps another project isolated', async () => {
    const user = userEvent.setup()
    render(<App repository={repository()} />)
    await createWith(user, 'Новый проект', 'Поиск квартиры', 'Создать проект')
    expect(await screen.findByRole('heading', { name: 'Поиск квартиры' })).toBeInTheDocument()
    await createWith(user, 'Новый статус', 'Найдено', 'Создать статус')
    await createWith(user, 'Новая карточка в статусе Найдено', 'Квартира у парка', 'Создать карточку')
    await user.click(screen.getByRole('button', { name: 'Все проекты' }))
    await createWith(user, 'Новый проект', 'Паспорт', 'Создать проект')
    expect(await screen.findByText('На доске пока нет статусов. Создайте статус, чтобы добавлять карточки.')).toBeInTheDocument()
    expect(screen.queryByText('Квартира у парка')).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Все проекты' }))
    await user.click(await screen.findByRole('button', { name: 'Открыть проект Поиск квартиры' }))
    expect(await screen.findByText('Квартира у парка')).toBeInTheDocument()
  })

  it('requires a name and renames a project', async () => {
    const user = userEvent.setup()
    render(<App repository={repository()} />)
    await user.type(await screen.findByLabelText('Новый проект'), '   ')
    await user.click(screen.getByRole('button', { name: 'Создать проект' }))
    expect(screen.getByRole('alert')).toHaveTextContent('Название обязательно')
    await createWith(user, 'Новый проект', 'Паспорт', 'Создать проект')
    await screen.findByRole('heading', { name: 'Паспорт' })
    await user.click(screen.getByRole('button', { name: 'Переименовать проект Паспорт' }))
    const rename = screen.getByLabelText('Переименовать проект Паспорт')
    await user.clear(rename)
    await user.type(rename, 'Документы')
    await user.click(screen.getByRole('button', { name: 'Сохранить название' }))
    expect(await screen.findByRole('heading', { name: 'Документы' })).toBeInTheDocument()
  })

  it('restores the last project and falls back to the catalogue for a stale selection', async () => {
    const repo = repository()
    await repo.open()
    const project = await repo.createProject('Паспорт')
    cleanup()
    render(<App repository={repo} />)
    expect(await screen.findByRole('heading', { name: 'Паспорт' })).toBeInTheDocument()
    cleanup()
    await repo.setLastProject('missing-project')
    location.hash = ''
    render(<App repository={repo} />)
    expect(await screen.findByRole('heading', { name: 'Трекер личных проектов' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Открыть проект Паспорт' })).toBeInTheDocument()
    expect((await repo.preference())?.lastProjectId).toBe('missing-project')
    expect(project.name).toBe('Паспорт')
  })

  it('completes and restores the two-project board workflow', async () => {
    const user = userEvent.setup()
    const repo = repository()
    render(<App repository={repo} />)
    await createWith(user, 'Новый проект', 'Поиск квартиры', 'Создать проект')
    await createWith(user, 'Новый статус', 'Найдено', 'Создать статус')
    await createWith(user, 'Новый статус', 'Договорились о просмотре', 'Создать статус')
    await user.click(screen.getByRole('button', { name: 'Переместить статус Договорились о просмотре влево' }))
    expect((await screen.findAllByRole('heading', { level: 2 })).map(item => item.textContent)).toEqual(['Договорились о просмотре', 'Найдено'])
    await user.click(screen.getByRole('button', { name: 'Переименовать статус Найдено' }))
    const statusRename = screen.getByLabelText('Переименовать статус Найдено')
    await user.clear(statusRename)
    await user.type(statusRename, 'Подбор')
    await user.click(screen.getByRole('button', { name: 'Сохранить название' }))
    expect(await screen.findByRole('heading', { name: 'Подбор' })).toBeInTheDocument()
    await createWith(user, 'Новая карточка в статусе Подбор', 'Квартира у парка', 'Создать карточку')
    await user.click(screen.getByRole('button', { name: 'Переименовать карточку Квартира у парка' }))
    const rename = screen.getByLabelText('Переименовать карточку Квартира у парка')
    await user.clear(rename)
    await user.type(rename, 'Квартира с балконом')
    await user.click(screen.getByRole('button', { name: 'Сохранить название' }))
    await user.selectOptions(await screen.findByLabelText('Переместить карточку Квартира с балконом'), (screen.getByRole('option', { name: 'Договорились о просмотре' }) as HTMLOptionElement).value)
    const firstColumn = screen.getByRole('heading', { name: 'Договорились о просмотре' }).closest('article')!
    const foundColumn = screen.getByRole('heading', { name: 'Подбор' }).closest('article')!
    expect(within(firstColumn).getByText('Квартира с балконом')).toBeInTheDocument()
    expect(within(foundColumn).queryByText('Квартира с балконом')).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Все проекты' }))
    await screen.findByRole('heading', { name: 'Трекер личных проектов' })
    await createWith(user, 'Новый проект', 'Паспорт', 'Создать проект')
    await screen.findByRole('heading', { name: 'Паспорт' })
    await user.click(screen.getByRole('button', { name: 'Все проекты' }))
    await screen.findByRole('button', { name: 'Открыть проект Поиск квартиры' })
    await user.click(screen.getByRole('button', { name: 'Открыть проект Поиск квартиры' }))
    cleanup()
    render(<App repository={repo} />)
    expect(await screen.findByRole('heading', { name: 'Поиск квартиры' })).toBeInTheDocument()
    expect(screen.getByText('Квартира с балконом')).toBeInTheDocument()
  })

  it('shows unavailable storage and does not claim a failed save succeeded', async () => {
    const unavailable = { open: vi.fn().mockRejectedValue(new Error('blocked')) } as unknown as TrackerRepository
    render(<App repository={unavailable} />)
    expect(await screen.findByRole('heading', { name: 'Рабочая доска недоступна' })).toBeInTheDocument()
    cleanup()
    const repo = repository()
    const createProject = vi.spyOn(repo, 'createProject').mockRejectedValue(new Error('quota'))
    render(<App repository={repo} />)
    await createWith(userEvent.setup(), 'Новый проект', 'Паспорт', 'Создать проект')
    expect(await screen.findByRole('alert')).toHaveTextContent('Не удалось сохранить изменения')
    expect(screen.queryByRole('heading', { name: 'Паспорт' })).not.toBeInTheDocument()
    expect(createProject).toHaveBeenCalledOnce()
  })
})
