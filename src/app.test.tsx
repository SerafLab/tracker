import { cleanup, render, screen, waitFor, within } from '@testing-library/react'
import Dexie from 'dexie'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { App } from './app/app'
import { ProjectBoardDatabase } from './features/project-board/infrastructure/indexeddb/database'
import { DexieProjectBoardRepository } from './features/project-board/infrastructure/indexeddb/dexie-project-board-repository'
import { ActionMenu } from './features/project-board/presentation/controls'

const databases: ProjectBoardDatabase[] = []
function repository() { const database = new ProjectBoardDatabase(`app-${crypto.randomUUID()}`); databases.push(database); return new DexieProjectBoardRepository(database) }
async function fill(user: ReturnType<typeof userEvent.setup>, label: string, value: string, button: string) { if (label === 'Новый проект') { await user.click(await screen.findByRole('button', { name: 'Создать проект' })); label = 'Название проекта' }; const input = await screen.findByLabelText(label); await user.clear(input); await user.type(input, value); await user.click(within(input.closest('form')!).getByRole('button', { name: button })) }
async function addStatus(user: ReturnType<typeof userEvent.setup>, name: string) { await user.click((await screen.findAllByRole('button', { name: 'Добавить статус' }))[0]); await fill(user, 'Название статуса', name, 'Создать статус'); await screen.findAllByRole('heading', { name }); await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument()) }
async function addCard(user: ReturnType<typeof userEvent.setup>, column: HTMLElement, name: string) { await user.click(within(column).getByRole('button', { name: /Добавить карточку/ })); await fill(user, 'Название карточки', name, 'Создать карточку'); await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument()) }
function setViewport(width: number) { Object.defineProperty(window, 'innerWidth', { configurable: true, value: width }); window.dispatchEvent(new Event('resize')) }

beforeEach(() => { location.hash = ''; setViewport(1280) })
afterEach(async () => { cleanup(); setViewport(1280); await Promise.all(databases.splice(0).map(async database => { database.close(); await database.delete() })) })

describe('action menu interactions', () => {
  it.each(['mouse', 'touch'])('preserves the outside target action and focus after a %s press', async pointerType => {
    const user = userEvent.setup(); const select = vi.fn(); const outsideAction = vi.fn()
    render(<><ActionMenu label="Действия" actions={[{ label: 'Выбрать', onSelect: select }]} /><button onClick={outsideAction}>Внешнее действие</button></>)
    await user.click(screen.getByRole('button', { name: 'Действия' }))
    const outside = screen.getByRole('button', { name: 'Внешнее действие' })
    if (pointerType === 'touch') await user.pointer([{ keys: '[TouchA>]', target: outside }, { keys: '[/TouchA]' }])
    else await user.click(outside)
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
    expect(outsideAction).toHaveBeenCalledOnce()
    expect(outside).toHaveFocus()
    expect(select).not.toHaveBeenCalled()
  })

  it('switches menus with one press and toggles the same trigger', async () => {
    const user = userEvent.setup(); const select = vi.fn()
    render(<><ActionMenu label="Первое меню" actions={[{ label: 'Первое действие', onSelect: select }]} /><ActionMenu label="Второе меню" actions={[{ label: 'Второе действие', onSelect: select }]} /></>)
    const first = screen.getByRole('button', { name: 'Первое меню' }); const second = screen.getByRole('button', { name: 'Второе меню' })
    await user.click(first); await user.click(second)
    expect(screen.getAllByRole('menu')).toHaveLength(1)
    expect(screen.getByRole('menu', { name: 'Второе меню' })).toBeInTheDocument()
    expect(first).toHaveAttribute('aria-expanded', 'false')
    expect(screen.getByRole('menuitem', { name: 'Второе действие' })).toHaveFocus()
    await user.click(second)
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
    expect(second).toHaveFocus()
    expect(select).not.toHaveBeenCalled()
  })

  it('keeps internal Tab focus and dismisses when Tab leaves the menu', async () => {
    const user = userEvent.setup(); const select = vi.fn()
    render(<><ActionMenu label="Действия" actions={[{ label: 'Недоступно', onSelect: select, disabled: true }, { label: 'Первое', onSelect: select }, { label: 'Второе', onSelect: select }]} /><button>После меню</button></>)
    await user.click(screen.getByRole('button', { name: 'Действия' }))
    expect(screen.getByRole('menuitem', { name: 'Первое' })).toHaveFocus()
    await user.tab()
    expect(screen.getByRole('menuitem', { name: 'Второе' })).toHaveFocus()
    await user.tab()
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'После меню' })).toHaveFocus()
    expect(select).not.toHaveBeenCalled()
  })

  it('selects enabled items and restores trigger focus on Escape', async () => {
    const user = userEvent.setup(); const select = vi.fn()
    render(<ActionMenu label="Действия" actions={[{ label: 'Недоступно', onSelect: select, disabled: true }, { label: 'Выбрать', onSelect: select }]} />)
    const trigger = screen.getByRole('button', { name: 'Действия' })
    await user.click(trigger)
    await user.click(screen.getByRole('menuitem', { name: 'Выбрать' }))
    expect(select).toHaveBeenCalledOnce()
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
    await user.click(trigger); await user.keyboard('{Escape}')
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
    expect(trigger).toHaveFocus()
    expect(select).toHaveBeenCalledOnce()
  })
})

describe('project board', () => {
  it.each([
    ['проекта', 'mouse'], ['статуса', 'mouse'], ['карточки', 'mouse'],
    ['проекта', 'touch'], ['статуса', 'touch'], ['карточки', 'touch'],
  ])('dismisses the %s menu with an outside %s press and runs the destination action', async (kind, pointerType) => {
    const user = userEvent.setup(); render(<App repository={repository()} />)
    await fill(user, 'Новый проект', 'Проект', 'Создать проект'); await screen.findByRole('heading', { name: 'Проект' })
    await addStatus(user, 'Статус')
    const column = screen.getByRole('heading', { name: 'Статус' }).closest('article')!
    await addCard(user, column, 'Карточка')
    const name = kind === 'проекта' ? 'Проект' : kind === 'статуса' ? 'Статус' : 'Карточка'
    await user.click(await screen.findByRole('button', { name: kind === 'проекта' ? 'Настройки' : `Действия ${kind} ${name}` }))
    expect(screen.getByRole(kind === 'проекта' ? 'region' : 'menu', kind === 'проекта' ? {name: 'Настройки'} : {})).toBeInTheDocument()
    const outside = screen.getByRole('button', { name: 'Добавить статус' })
    if (pointerType === 'touch') await user.pointer([{ keys: '[TouchA>]', target: outside }, { keys: '[/TouchA]' }])
    else await user.click(outside)
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
    expect(screen.getByRole('dialog', { name: 'Новый статус' })).toBeInTheDocument()
    expect(screen.getByLabelText('Название статуса')).toHaveFocus()
  })

  it('creates isolated projects and uses dialogs for populated-catalogue creation', async () => {
    const user = userEvent.setup(); render(<App repository={repository()} />)
    expect(document.title).toBe('EasyTrack — трекер личных проектов')
    expect(await screen.findByRole('heading', { name: 'Трекер личных проектов' })).toBeInTheDocument()
    await fill(user, 'Новый проект', 'Поиск квартиры', 'Создать проект'); await screen.findByRole('heading', { name: 'Поиск квартиры' })
    await addStatus(user, 'Найдено')
    await addCard(user, screen.getByRole('heading', { name: 'Найдено' }).closest('article')!, 'Квартира у парка')
    await user.click(screen.getByRole('button', { name: /Все проекты/ }))
    await user.click(await screen.findByRole('button', { name: 'Создать проект' }))
    await fill(user, 'Название проекта', 'Паспорт', 'Создать проект')
    expect(await screen.findByText('Добавьте первый статус')).toBeInTheDocument()
    expect(screen.queryByText('Квартира у парка')).not.toBeInTheDocument()
  })

  it('validates names and renames through accessible menus', async () => {
    const user = userEvent.setup(); render(<App repository={repository()} />)
    await user.click(await screen.findByRole('button', { name: 'Создать проект' })); await user.type(screen.getByLabelText('Название проекта'), '   '); await user.click(screen.getByRole('button', { name: 'Создать проект' })); expect(screen.getByRole('alert')).toHaveTextContent('Название обязательно')
    await fill(user, 'Название проекта', 'Паспорт', 'Создать проект'); await screen.findByRole('heading', { name: 'Паспорт' })
    await user.click(screen.getByRole('button', { name: 'Настройки' })); await user.click(screen.getByRole('button', { name: 'Переименовать проект' }))
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
    await addCard(user, screen.getByRole('heading', { name: 'Найдено' }).closest('article')!, 'Квартира у парка')
    await user.click(await screen.findByRole('button', { name: 'Действия карточки Квартира у парка' })); await user.click(screen.getByRole('menuitem', { name: 'Переместить в…' })); await user.selectOptions(within(screen.getByRole('dialog')).getByRole('combobox', { name: /Переместить/ }), screen.getByRole('option', { name: 'Просмотр' })); await user.click(screen.getByRole('button', { name: 'Переместить' }))
    expect(await within(screen.getByRole('heading', { name: 'Просмотр' }).closest('article')!).findByText('Квартира у парка')).toBeInTheDocument()
    await user.click(within(screen.getByRole('heading', { name: 'Найдено' }).closest('article')!).getByRole('button', { name: 'Действия статуса Найдено' })); expect(screen.getByRole('menuitem', { name: 'Переместить влево' })).toBeDisabled()
  })

  it('moves arrows in both directions, appends cards, and preserves keyboard focus', async () => {
    const user = userEvent.setup(); render(<App repository={repository()} />)
    await fill(user, 'Новый проект', 'Доска', 'Создать проект'); await screen.findByRole('heading', { name: 'Доска' })
    await addStatus(user, 'Первый'); await addStatus(user, 'Средний'); await addStatus(user, 'Последний')
    const column = (name: string) => screen.getByRole('heading', { name }).closest('article')!
    await addCard(user, column('Средний'), 'Уже здесь')
    await addCard(user, column('Первый'), 'Движущаяся')
    const card = () => screen.getByText('Движущаяся').closest('li')!
    expect(within(card()).getByRole('button', { name: 'Переместить влево' })).toBeDisabled()
    within(card()).getByRole('button', { name: 'Переместить вправо в «Средний»' }).focus()
    await user.keyboard('{Enter}')
    await waitFor(() => expect(within(column('Средний')).getAllByRole('listitem').map(item => item.textContent)).toEqual([expect.stringContaining('Уже здесь'), expect.stringContaining('Движущаяся')]))
    await waitFor(() => expect(within(card()).getByRole('button', { name: 'Переместить вправо в «Последний»' })).toHaveFocus())
    await user.keyboard(' ')
    await waitFor(() => expect(within(column('Последний')).getByText('Движущаяся')).toBeInTheDocument())
    expect(within(card()).getByRole('button', { name: 'Переместить вправо' })).toBeDisabled()
    await waitFor(() => expect(within(card()).getByRole('button', { name: 'Действия карточки Движущаяся' })).toHaveFocus())
    await user.click(within(card()).getByRole('button', { name: 'Переместить влево в «Средний»' }))
    await waitFor(() => expect(within(column('Средний')).getByText('Движущаяся')).toBeInTheDocument())
  })

  it('translates card movement controls after switching the interface to English', async () => {
    const user = userEvent.setup(); render(<App repository={repository()} />)
    await fill(user, 'Новый проект', 'Доска', 'Создать проект'); await screen.findByRole('heading', { name: 'Доска' })
    await addStatus(user, 'Первый'); await addStatus(user, 'Второй')
    await addCard(user, screen.getByRole('heading', { name: 'Первый' }).closest('article')!, 'Карточка')
    await user.click(screen.getByRole('button', { name: /^(Настройки|Settings)$/ }))
    await user.selectOptions(screen.getByRole('combobox', { name: 'Язык приложения' }), 'en')
    const card = screen.getByText('Карточка').closest('li')!
    expect(within(card).getByRole('group', { name: 'Move card Карточка' })).toBeInTheDocument()
    await user.click(within(card).getByRole('button', { name: 'Card actions for Карточка' }))
    expect(screen.getByRole('menuitem', { name: 'Move to…' })).toBeInTheDocument()
    await user.keyboard('{Escape}')
    await user.click(within(card).getByRole('button', { name: 'Move right to “Второй”' }))
    expect(await within(screen.getByRole('heading', { name: 'Второй' }).closest('article')!).findByText('Карточка')).toBeInTheDocument()
  })

  it('disables both arrows for one status and excludes current status from the move form', async () => {
    const user = userEvent.setup(); render(<App repository={repository()} />)
    await fill(user, 'Новый проект', 'Доска', 'Создать проект'); await screen.findByRole('heading', { name: 'Доска' })
    await addStatus(user, 'Одинаковый')
    await addCard(user, screen.getByRole('heading', { name: 'Одинаковый' }).closest('article')!, 'Карточка')
    const card = () => screen.getByText('Карточка').closest('li')!
    expect(within(card()).getByRole('button', { name: 'Переместить влево' })).toBeDisabled()
    expect(within(card()).getByRole('button', { name: 'Переместить вправо' })).toBeDisabled()
    await user.click(within(card()).getByRole('button', { name: 'Действия карточки Карточка' }))
    expect(screen.queryByRole('menuitem', { name: 'Переместить в…' })).not.toBeInTheDocument()
    await user.keyboard('{Escape}')
    await addStatus(user, 'Другой'); await addStatus(user, 'Одинаковый')
    within(card()).getByRole('button', { name: 'Действия карточки Карточка' }).focus(); await user.keyboard('{Enter}')
    await user.keyboard('{Tab}{Enter}')
    const dialog = screen.getByRole('dialog')
    const moveSelect = within(dialog).getByRole('combobox', { name: /Переместить/ })
    expect(within(moveSelect).getAllByRole('option')).toHaveLength(2)
    const duplicate = within(moveSelect).getByRole('option', { name: 'Одинаковый' }) as HTMLOptionElement
    await user.selectOptions(moveSelect, duplicate.value)
    await user.keyboard('{Tab}{Tab}{Enter}')
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    await waitFor(() => expect(within(card()).getByRole('button', { name: 'Действия карточки Карточка' })).toHaveFocus())
    expect(screen.getAllByRole('heading', { name: 'Одинаковый' })[1].closest('article')).toContainElement(card())
  })

  it('blocks repeated moves while saving and retains the original card and focus on failure', async () => {
    const repo = repository(); const user = userEvent.setup(); render(<App repository={repo} />)
    await fill(user, 'Новый проект', 'Доска', 'Создать проект'); await screen.findByRole('heading', { name: 'Доска' })
    await addStatus(user, 'Первый'); await addStatus(user, 'Второй')
    await addCard(user, screen.getByRole('heading', { name: 'Первый' }).closest('article')!, 'Карточка')
    let reject!: (reason: Error) => void
    const move = vi.spyOn(repo, 'moveCard').mockImplementation(() => new Promise((_resolve, rejectMove) => { reject = rejectMove }))
    const arrow = screen.getByRole('button', { name: 'Переместить вправо в «Второй»' })
    arrow.focus(); await user.keyboard('{Enter}')
    expect(arrow).toBeDisabled(); await user.keyboard('{Enter}')
    expect(move).toHaveBeenCalledOnce()
    reject(new Error('quota'))
    expect(await screen.findByRole('alert')).toHaveTextContent('Не удалось сохранить изменения')
    await waitFor(() => expect(arrow).toHaveFocus())
    expect(screen.getByRole('heading', { name: 'Первый' }).closest('article')).toContainElement(screen.getByText('Карточка'))
    move.mockRejectedValue(new Error('quota'))
    await user.click(screen.getByRole('button', { name: 'Действия карточки Карточка' })); await user.click(screen.getByRole('menuitem', { name: 'Переместить в…' }))
    await user.keyboard('{Tab}{Tab}{Enter}')
    await waitFor(() => expect(screen.getByRole('dialog').querySelector('button[type="submit"], .button-primary')).toHaveFocus())
    const dialog = screen.getByRole('dialog')
    expect(within(dialog).getByRole('alert')).toHaveTextContent('Не удалось сохранить изменения')
    expect(screen.getAllByRole('alert')).toHaveLength(1)
    expect(within(dialog).getByRole('button', { name: 'Переместить' })).toHaveAccessibleDescription(expect.stringContaining('Не удалось сохранить изменения'))
    await user.keyboard('{Escape}')
    expect(screen.getByRole('alert')).toHaveTextContent('Не удалось сохранить изменения')
  })

  it('keeps every board column and primary action reachable at mobile and desktop widths', async () => {
    const user = userEvent.setup(); render(<App repository={repository()} />)
    await fill(user, 'Новый проект', 'Поиск квартиры', 'Создать проект'); await screen.findByRole('heading', { name: 'Поиск квартиры' })
    await addStatus(user, 'Идеи'); await addStatus(user, 'В работе'); await addStatus(user, 'Завершено')
    await addCard(user, screen.getByRole('heading', { name: 'Идеи' }).closest('article')!, 'Позвонить арендодателю')

    setViewport(320)
    for (const name of ['Идеи', 'В работе', 'Завершено']) {
      expect(screen.getByRole('heading', { name })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: `Действия статуса ${name}` })).toBeEnabled()
      expect(within(screen.getByRole('heading', { name }).closest('article')!).getByRole('button', { name: /Добавить карточку/ })).toBeEnabled()
    }
    expect(await screen.findByRole('button', { name: 'Действия карточки Позвонить арендодателю' })).toBeEnabled()
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

  it('stops editing after this database connection becomes stale', async () => {
    const databaseName = `stale-app-${crypto.randomUUID()}`
    const reload = vi.fn()
    const newer = new Dexie(databaseName)
    render(<App databaseName={databaseName} reloadApp={reload} />)
    await screen.findByRole('button', { name: 'Создать проект' })
    newer.version(3).stores({ projects: 'id, createdAt', statuses: 'id, projectId, [projectId+position]', cards: 'id, statusId, [statusId+position]', workspace: 'id', releases: 'id' })
    await newer.open()
    expect(await screen.findByRole('heading', { name: 'Нужно перезапустить EasyTrack' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Создать проект' })).not.toBeInTheDocument()
    await userEvent.setup().click(screen.getByRole('button', { name: 'Перезапустить' }))
    expect(reload).toHaveBeenCalledOnce()
    newer.close()
    await newer.delete()
  })
})

it('retains the card creation draft on validation and storage errors and retries the whole form', async () => {
  const user = userEvent.setup(); const repo = repository(); render(<App repository={repo} />)
  await fill(user, 'Новый проект', 'Priority', 'Создать проект'); await addStatus(user, 'Todo')
  const column = screen.getByRole('heading', { name: 'Todo' }).closest('article')!
  const trigger = within(column).getByRole('button', { name: /Добавить карточку/ })
  await user.click(trigger)
  const dialog = screen.getByRole('dialog')
  expect(within(dialog).getByLabelText('Важная')).not.toBeChecked()
  expect(within(dialog).getByLabelText('Срочная')).not.toBeChecked()
  await user.click(within(dialog).getByRole('button', { name: 'Создать карточку' }))
  expect(within(dialog).getByRole('alert')).toHaveTextContent('Название обязательно')
  await user.type(within(dialog).getByLabelText('Название карточки'), '  Draft  ')
  await user.click(within(dialog).getByLabelText('Важная')); await user.click(within(dialog).getByLabelText('Срочная'))
  vi.spyOn(repo, 'createCard').mockRejectedValueOnce(new Error('quota'))
  await user.click(within(dialog).getByRole('button', { name: 'Создать карточку' }))
  expect(await within(dialog).findByRole('alert')).toHaveTextContent('Не удалось сохранить')
  expect(within(dialog).getByLabelText('Название карточки')).toHaveValue('  Draft  ')
  expect(within(dialog).getByLabelText('Важная')).toBeChecked()
  expect(column.querySelectorAll('.work-card')).toHaveLength(0)
  await user.click(within(dialog).getByRole('button', { name: 'Создать карточку' }))
  await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  expect(trigger).toHaveFocus()
  expect(column.querySelector('.card-name')).toHaveTextContent('Draft')
  expect(column.querySelectorAll('.card-badge')).toHaveLength(2)
})

it('edits flags atomically, keeps failed drafts, reorders after success and translates badges without changing data', async () => {
  const user = userEvent.setup(); const repo = repository(); render(<App repository={repo} />)
  await fill(user, 'Новый проект', 'Priority', 'Создать проект'); await addStatus(user, 'Todo')
  const column = screen.getByRole('heading', { name: 'Todo' }).closest('article')!
  await addCard(user, column, 'First'); await addCard(user, column, 'Second')
  await user.click(screen.getByRole('button', { name: 'Действия карточки Second' })); await user.click(screen.getByRole('menuitem', { name: 'Редактировать' }))
  let dialog = screen.getByRole('dialog')
  expect(within(dialog).getByLabelText('Название карточки')).toHaveValue('Second')
  await user.clear(within(dialog).getByLabelText('Название карточки')); await user.type(within(dialog).getByLabelText('Название карточки'), 'Edited')
  await user.click(within(dialog).getByLabelText('Важная'))
  vi.spyOn(repo, 'updateCard').mockRejectedValueOnce(new Error('quota'))
  await user.click(within(dialog).getByRole('button', { name: 'Сохранить' }))
  expect(await within(dialog).findByRole('alert')).toHaveTextContent('Не удалось сохранить')
  expect(Array.from(column.querySelectorAll('.card-name')).map(node => node.textContent)).toEqual(['First', 'Second'])
  expect(within(dialog).getByLabelText('Важная')).toBeChecked()
  await user.click(within(dialog).getByRole('button', { name: 'Сохранить' }))
  await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  expect(Array.from(column.querySelectorAll('.card-name')).map(node => node.textContent)).toEqual(['Edited', 'First'])
  expect(screen.getByRole('button', { name: 'Действия карточки Edited' })).toHaveFocus()
  await user.click(screen.getByRole('button', { name: 'Действия карточки Edited' })); await user.click(screen.getByRole('menuitem', { name: 'Редактировать' }))
  dialog = screen.getByRole('dialog'); await user.click(within(dialog).getByLabelText('Срочная')); await user.click(within(dialog).getByRole('button', { name: 'Отмена' }))
  expect(column.querySelectorAll('.card-badge')).toHaveLength(1)
  const before = await repo.board((await repo.projects())[0].id)
  await user.click(screen.getByRole('button', { name: /^(Настройки|Settings)$/ }))
  await user.selectOptions(screen.getByRole('combobox', { name: 'Язык приложения' }), 'en')
  expect(screen.getByText('Important')).toBeInTheDocument()
  expect(screen.queryByText('Urgent')).not.toBeInTheDocument()
  expect(await repo.board(before!.id)).toEqual(before)
})
