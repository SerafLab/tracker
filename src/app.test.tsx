import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { App } from './app/app'
import { ProjectBoardDatabase } from './features/project-board/infrastructure/indexeddb/database'
import { DexieProjectBoardRepository } from './features/project-board/infrastructure/indexeddb/dexie-project-board-repository'

const databases: ProjectBoardDatabase[] = []
function repository() { const database = new ProjectBoardDatabase(`app-${crypto.randomUUID()}`); databases.push(database); return new DexieProjectBoardRepository(database) }
async function fill(user: ReturnType<typeof userEvent.setup>, label: string, value: string, button: string) { const input = await screen.findByLabelText(label); await user.clear(input); await user.type(input, value); await user.click(within(input.closest('form')!).getByRole('button', { name: button })) }
async function addStatus(user: ReturnType<typeof userEvent.setup>, name: string) { await user.click(screen.getAllByRole('button', { name: 'Добавить статус' })[0]); await fill(user, 'Название статуса', name, 'Создать статус'); await screen.findByRole('heading', { name }) }
async function addCard(user: ReturnType<typeof userEvent.setup>, column: HTMLElement, name: string) { await user.click(within(column).getByRole('button', { name: /Добавить карточку/ })); await fill(user, 'Название карточки', name, 'Создать карточку') }
function setViewport(width: number) { Object.defineProperty(window, 'innerWidth', { configurable: true, value: width }); window.dispatchEvent(new Event('resize')) }

beforeEach(() => { location.hash = ''; setViewport(1280) })
afterEach(async () => { cleanup(); setViewport(1280); await Promise.all(databases.splice(0).map(async database => { database.close(); await database.delete() })) })

describe('project board', () => {
  it('creates isolated projects and uses dialogs for populated-catalogue creation', async () => {
    const user = userEvent.setup(); render(<App repository={repository()} />)
    await fill(user, 'Новый проект', 'Поиск квартиры', 'Создать проект'); await screen.findByRole('heading', { name: 'Поиск квартиры' })
    await addStatus(user, 'Найдено')
    await addCard(user, screen.getByRole('heading', { name: 'Найдено' }).closest('article')!, 'Квартира у парка')
    await user.click(screen.getByRole('button', { name: /Все проекты/ }))
    await user.click(screen.getByRole('button', { name: 'Создать проект' }))
    await fill(user, 'Название проекта', 'Паспорт', 'Создать проект')
    expect(await screen.findByText('Добавьте первый статус')).toBeInTheDocument()
    expect(screen.queryByText('Квартира у парка')).not.toBeInTheDocument()
  })

  it('validates names and renames through accessible menus', async () => {
    const user = userEvent.setup(); render(<App repository={repository()} />)
    await user.type(await screen.findByLabelText('Новый проект'), '   '); await user.click(screen.getByRole('button', { name: 'Создать проект' })); expect(screen.getByRole('alert')).toHaveTextContent('Название обязательно')
    await fill(user, 'Новый проект', 'Паспорт', 'Создать проект'); await screen.findByRole('heading', { name: 'Паспорт' })
    await user.click(screen.getByRole('button', { name: 'Действия проекта Паспорт' })); await user.click(screen.getByRole('menuitem', { name: 'Переименовать' }))
    const input = screen.getByLabelText('Новое название'); await user.clear(input); await user.type(input, 'Документы'); await user.click(screen.getByRole('button', { name: 'Сохранить' }))
    expect(await screen.findByRole('heading', { name: 'Документы' })).toBeInTheDocument()
  })

  it('moves focus into dialogs and closes menus with Escape', async () => {
    const user = userEvent.setup(); render(<App repository={repository()} />)
    await fill(user, 'Новый проект', 'Паспорт', 'Создать проект'); await screen.findByRole('heading', { name: 'Паспорт' }); await user.click(screen.getByRole('button', { name: /Все проекты/ }))
    const create = await screen.findByRole('button', { name: 'Создать проект' }); await user.click(create)
    expect(screen.getByRole('dialog', { name: 'Новый проект' })).toBeInTheDocument(); expect(screen.getByLabelText('Название проекта')).toHaveFocus()
    await user.keyboard('{Escape}'); expect(screen.queryByRole('dialog')).not.toBeInTheDocument(); expect(create).toHaveFocus()
    await user.click(screen.getByRole('button', { name: 'Действия проекта Паспорт' })); expect(screen.getByRole('menu')).toBeInTheDocument(); await user.keyboard('{Escape}'); expect(screen.queryByRole('menu')).not.toBeInTheDocument()
  })

  it('orders statuses and moves cards through explicit menu actions', async () => {
    const user = userEvent.setup(); render(<App repository={repository()} />)
    await fill(user, 'Новый проект', 'Поиск квартиры', 'Создать проект'); await screen.findByRole('heading', { name: 'Поиск квартиры' }); await addStatus(user, 'Найдено'); await addStatus(user, 'Просмотр')
    const found = screen.getByRole('heading', { name: 'Найдено' }).closest('article')!; await addCard(user, found, 'Квартира у парка')
    await user.click(within(found).getByRole('button', { name: 'Действия карточки Квартира у парка' })); await user.click(screen.getByRole('menuitem', { name: 'Переместить' })); await user.selectOptions(screen.getByRole('combobox'), screen.getByRole('option', { name: 'Просмотр' })); await user.click(screen.getByRole('button', { name: 'Переместить' }))
    expect(await within(screen.getByRole('heading', { name: 'Просмотр' }).closest('article')!).findByText('Квартира у парка')).toBeInTheDocument()
    await user.click(within(found).getByRole('button', { name: 'Действия статуса Найдено' })); expect(screen.getByRole('menuitem', { name: 'Переместить влево' })).toBeDisabled()
  })

  it('keeps every board column and primary action reachable at mobile and desktop widths', async () => {
    const user = userEvent.setup(); render(<App repository={repository()} />)
    await fill(user, 'Новый проект', 'Поиск квартиры', 'Создать проект'); await screen.findByRole('heading', { name: 'Поиск квартиры' })
    await addStatus(user, 'Идеи'); await addStatus(user, 'В работе'); await addStatus(user, 'Завершено')
    const ideas = screen.getByRole('heading', { name: 'Идеи' }).closest('article')!
    await addCard(user, ideas, 'Позвонить арендодателю')

    setViewport(320)
    for (const name of ['Идеи', 'В работе', 'Завершено']) {
      expect(screen.getByRole('heading', { name })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: `Действия статуса ${name}` })).toBeEnabled()
      expect(within(screen.getByRole('heading', { name }).closest('article')!).getByRole('button', { name: /Добавить карточку/ })).toBeEnabled()
    }
    expect(within(ideas).getByRole('button', { name: 'Действия карточки Позвонить арендодателю' })).toBeEnabled()
    await user.click(screen.getByRole('button', { name: 'Действия статуса Идеи' }))
    expect(screen.getByRole('menuitem', { name: 'Переименовать' })).toBeEnabled()
    expect(screen.getByRole('menuitem', { name: 'Переместить влево' })).toBeDisabled()
    expect(screen.getByRole('menuitem', { name: 'Переместить вправо' })).toBeEnabled()
    await user.keyboard('{Escape}')

    setViewport(1280)
    expect(screen.getByRole('button', { name: 'Добавить статус' })).toBeEnabled()
    expect(screen.getByRole('heading', { name: 'Завершено' }).closest('article')).toHaveClass('status-column')
    expect(screen.getByRole('heading', { name: 'Завершено' }).closest('article')).not.toHaveClass('status-completed')
  })

  it('announces unavailable storage and rejected saves', async () => {
    const unavailable = { open: vi.fn().mockRejectedValue(new Error('blocked')) } as unknown as DexieProjectBoardRepository; render(<App repository={unavailable} />); expect(await screen.findByRole('heading', { name: 'Рабочая доска недоступна' })).toBeInTheDocument(); cleanup()
    const repo = repository(); vi.spyOn(repo, 'createProject').mockRejectedValue(new Error('quota')); render(<App repository={repo} />); await fill(userEvent.setup(), 'Новый проект', 'Паспорт', 'Создать проект'); expect(await screen.findByRole('alert')).toHaveTextContent('Не удалось сохранить изменения'); expect(screen.queryByRole('heading', { name: 'Паспорт' })).not.toBeInTheDocument()
  })
})
