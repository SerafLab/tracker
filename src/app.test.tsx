import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import Dexie from 'dexie'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { App } from './app/app'
import { ProjectBoardDatabase } from './features/project-board/infrastructure/indexeddb/database'
import { DexieProjectBoardRepository } from './features/project-board/infrastructure/indexeddb/dexie-project-board-repository'
import { ActionMenu } from './features/project-board/presentation/controls'
import { simulateUpdateReady } from './test/pwa-register'
import { TOAST_DURATION_MS } from './ui/notifications'
import { findHeaderCreate } from './test/queries'

const databases: ProjectBoardDatabase[] = []
function repository() { const database = new ProjectBoardDatabase(`app-${crypto.randomUUID()}`); databases.push(database); return new DexieProjectBoardRepository(database) }
async function fill(user: ReturnType<typeof userEvent.setup>, label: string, value: string, button: string) { if (label === 'Новый проект') { await user.click(await findHeaderCreate('Создать проект')); label = 'Название проекта' }; const input = await screen.findByLabelText(label); if (label === 'Название проекта') await user.selectOptions(screen.getByRole('combobox', { name: 'Набор статусов' }), 'empty'); await user.clear(input); await user.type(input, value); await user.click(within(input.closest('form')!).getByRole('button', { name: button })) }
async function addStatus(user: ReturnType<typeof userEvent.setup>, name: string) {
  const trigger = (await screen.findAllByRole('button', { name: 'Добавить статус' }))[0]
  await user.click(trigger)
  await fill(user, 'Название статуса', name, 'Создать статус')
  await screen.findAllByRole('heading', { name })
  await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  await waitFor(() => expect(trigger).toHaveFocus())
}
async function addCard(user: ReturnType<typeof userEvent.setup>, column: HTMLElement, name: string) { await user.click(column.querySelector<HTMLButtonElement>('.add-card-header')!); await fill(user, 'Название карточки', name, 'Создать карточку'); await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument()) }
async function moveThroughMenu(user: ReturnType<typeof userEvent.setup>, name: string, destination: string) {
  await user.click(screen.getByRole('button', { name: `Действия карточки ${name}` }))
  await user.click(screen.getByRole('menuitem', { name: 'Переместить в…' }))
  const dialog = screen.getByRole('dialog')
  await user.selectOptions(within(dialog).getByRole('combobox'), within(dialog).getByRole('option', { name: destination }))
  await user.click(within(dialog).getByRole('button', { name: 'Переместить' }))
  await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  // Focus returns to the moved card once the placement settles; the board is inert until then.
  await waitFor(() => expect(screen.getByRole('button', { name: `Действия карточки ${name}` })).toHaveFocus())
}
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
    expect(await screen.findByRole('menu', kind === 'проекта' ? {name: 'Настройки'} : {})).toBeInTheDocument()
    const outside = screen.getByRole('button', { name: 'Добавить статус' })
    if (pointerType === 'touch') await user.pointer([{ keys: '[TouchA>]', target: outside }, { keys: '[/TouchA]' }])
    else await user.click(outside)
    // Dialog opening and focus transfer are async: wait for the final state, not the intermediate one.
    const dialog = await screen.findByRole('dialog', { name: 'Новый статус' })
    await waitFor(() => expect(within(dialog).getByLabelText('Название статуса')).toHaveFocus())
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
  })

  it('creates isolated projects and uses dialogs for populated-catalogue creation', async () => {
    const user = userEvent.setup(); render(<App repository={repository()} />)
    expect(document.title).toBe('EasyTrack — трекер личных проектов')
    expect(await screen.findByRole('heading', { name: 'Трекер личных проектов' })).toBeInTheDocument()
    await fill(user, 'Новый проект', 'Поиск квартиры', 'Создать проект'); await screen.findByRole('heading', { name: 'Поиск квартиры' })
    await addStatus(user, 'Найдено')
    await addCard(user, screen.getByRole('heading', { name: 'Найдено' }).closest('article')!, 'Квартира у парка')
    await user.click(screen.getByRole('button', { name: /Все проекты/ }))
    await user.click(await findHeaderCreate('Создать проект'))
    await fill(user, 'Название проекта', 'Паспорт', 'Создать проект')
    expect(await screen.findByText('Добавьте первый статус')).toBeInTheDocument()
    expect(screen.queryByText('Квартира у парка')).not.toBeInTheDocument()
  })

  it('validates names and renames through accessible menus', async () => {
    const user = userEvent.setup(); render(<App repository={repository()} />)
    await user.click(await findHeaderCreate('Создать проект')); await user.type(screen.getByLabelText('Название проекта'), '   '); await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Создать проект' })); expect(within(screen.getByRole('dialog')).getByRole('alert')).toHaveTextContent('Название обязательно')
    await fill(user, 'Название проекта', 'Паспорт', 'Создать проект'); await screen.findByRole('heading', { name: 'Паспорт' })
    await user.click(screen.getByRole('button', { name: 'Настройки' })); await user.click(screen.getByRole('menuitem', { name: 'Переименовать проект' }))
    const input = screen.getByLabelText('Новое название'); await user.clear(input); await user.type(input, 'Документы'); await user.click(screen.getByRole('button', { name: 'Сохранить' }))
    expect(await screen.findByRole('heading', { name: 'Документы' })).toBeInTheDocument()
  })

  it('moves focus into dialogs and closes menus with Escape', async () => {
    const user = userEvent.setup(); render(<App repository={repository()} />)
    await fill(user, 'Новый проект', 'Паспорт', 'Создать проект'); await screen.findByRole('heading', { name: 'Паспорт' }); await user.click(screen.getByRole('button', { name: /Все проекты/ }))
    const create = await findHeaderCreate('Создать проект'); await user.click(create)
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

  it('moves through the menu in both directions, appends to peers and preserves focus', async () => {
    // Creation through the UI is covered elsewhere; seeding keeps this test within its time budget on a loaded machine.
    const repo = repository()
    await repo.createProject({ id: 'p', name: 'Доска', createdAt: 'now' }, [], true)
    for (const [id, name] of [['first', 'Первый'], ['middle', 'Средний'], ['last', 'Последний']]) await repo.createStatus({ id, projectId: 'p', name })
    await repo.createCard({ id: 'here', statusId: 'middle', name: 'Уже здесь', description: '', important: false, urgent: false })
    await repo.createCard({ id: 'moving', statusId: 'first', name: 'Движущаяся', description: '', important: false, urgent: false })
    location.hash = '#project/p'
    const user = userEvent.setup(); render(<App repository={repo} />)
    await screen.findByRole('heading', { level: 1, name: 'Доска' })
    const column = (name: string) => screen.getByRole('heading', { name }).closest('article')!
    await moveThroughMenu(user, 'Движущаяся', 'Средний')
    expect(Array.from(column('Средний').querySelectorAll('.card-name')).map(item => item.textContent)).toEqual(['Уже здесь', 'Движущаяся'])
    await moveThroughMenu(user, 'Движущаяся', 'Последний')
    expect(column('Последний')).toContainElement(screen.getByText('Движущаяся'))
    await moveThroughMenu(user, 'Движущаяся', 'Средний')
    expect(column('Средний')).toContainElement(screen.getByText('Движущаяся'))
    expect(document.querySelector('.card-move-arrows')).not.toBeInTheDocument()
  })

  it('translates card movement controls after switching the interface to English', async () => {
    const user = userEvent.setup(); render(<App repository={repository()} />)
    await fill(user, 'Новый проект', 'Доска', 'Создать проект'); await screen.findByRole('heading', { name: 'Доска' })
    await addStatus(user, 'Первый'); await addStatus(user, 'Второй')
    await addCard(user, screen.getByRole('heading', { name: 'Первый' }).closest('article')!, 'Карточка')
    await user.click(await screen.findByRole('button', { name: /^(Настройки|Settings)$/ }))
    await user.click(await screen.findByRole('menuitemradio', { name: 'English' }))
    const card = screen.getByText('Карточка').closest('li')!
    expect(card.querySelector('.card-move-arrows')).not.toBeInTheDocument()
    await user.click(await within(card).findByRole('button', { name: 'Card actions for Карточка' }))
    expect(screen.getByRole('menuitem', { name: 'Move to…' })).toBeInTheDocument()
    await user.click(screen.getByRole('menuitem', { name: 'Move to…' }))
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Move' }))
    expect(await within(screen.getByRole('heading', { name: 'Второй' }).closest('article')!).findByText('Карточка')).toBeInTheDocument()
  })

  it('omits move actions for one status and excludes current status from the move form', async () => {
    const user = userEvent.setup(); render(<App repository={repository()} />)
    await fill(user, 'Новый проект', 'Доска', 'Создать проект'); await screen.findByRole('heading', { name: 'Доска' })
    await addStatus(user, 'Одинаковый')
    await addCard(user, screen.getByRole('heading', { name: 'Одинаковый' }).closest('article')!, 'Карточка')
    const card = () => screen.getByText('Карточка').closest('li')!
    expect(card().querySelector('.card-move-arrows')).not.toBeInTheDocument()
    await user.click(within(card()).getByRole('button', { name: 'Действия карточки Карточка' }))
    expect(screen.queryByRole('menuitem', { name: 'Переместить в…' })).not.toBeInTheDocument()
    await user.keyboard('{Escape}')
    await addStatus(user, 'Другой'); await addStatus(user, 'Одинаковый')
    const menuTrigger = within(card()).getByRole('button', { name: 'Действия карточки Карточка' })
    menuTrigger.focus()
    expect(menuTrigger).toHaveFocus()
    await user.keyboard('{Enter}')
    await waitFor(() => expect(screen.getByRole('menuitem', { name: 'Редактировать' })).toHaveFocus())
    await user.tab()
    expect(screen.getByRole('menuitem', { name: 'Переместить в…' })).toHaveFocus()
    await user.keyboard('{Enter}')
    const dialog = await screen.findByRole('dialog')
    const moveSelect = within(dialog).getByRole('combobox', { name: /Переместить/ })
    expect(within(moveSelect).getAllByRole('option')).toHaveLength(2)
    const duplicate = within(moveSelect).getByRole('option', { name: 'Одинаковый' }) as HTMLOptionElement
    await user.selectOptions(moveSelect, duplicate.value)
    await user.keyboard('{Tab}{Tab}{Enter}')
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    await waitFor(() => expect(within(card()).getByRole('button', { name: 'Действия карточки Карточка' })).toHaveFocus())
    expect(screen.getAllByRole('heading', { name: 'Одинаковый' })[1].closest('article')).toContainElement(card())
  })

  it('blocks repeated placements while saving and retains the original card and dialog on failure', async () => {
    const repo = repository(); const user = userEvent.setup(); render(<App repository={repo} />)
    await fill(user, 'Новый проект', 'Доска', 'Создать проект'); await screen.findByRole('heading', { name: 'Доска' })
    await addStatus(user, 'Первый'); await addStatus(user, 'Второй')
    await addCard(user, screen.getByRole('heading', { name: 'Первый' }).closest('article')!, 'Карточка')
    let reject!: (reason: Error) => void
    const move = vi.spyOn(repo, 'moveCard').mockImplementation(() => new Promise((_resolve, rejectMove) => { reject = rejectMove }))
    await user.click(screen.getByRole('button', { name: 'Действия карточки Карточка' })); await user.click(screen.getByRole('menuitem', { name: 'Переместить в…' }))
    const dialog = screen.getByRole('dialog'), form = within(dialog).getByRole('combobox').closest('form')!
    fireEvent.submit(form); fireEvent.submit(form)
    expect(move).toHaveBeenCalledOnce()
    expect(within(dialog).getByRole('combobox')).toBeDisabled()
    reject(new Error('quota'))
    expect(await within(dialog).findByRole('alert')).toHaveTextContent('Не удалось сохранить изменения')
    expect(screen.getByRole('heading', { name: 'Первый' }).closest('article')).toContainElement(screen.getByText('Карточка'))
    expect(within(dialog).getByRole('button', { name: 'Переместить' })).toHaveAccessibleDescription(expect.stringContaining('Не удалось сохранить изменения'))
    await user.keyboard('{Escape}')
    await waitFor(() => expect(screen.getByRole('button', { name: 'Действия карточки Карточка' })).toHaveFocus())
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
      expect(screen.getByRole('heading', { name }).closest('article')!.querySelector('.add-card-header')).toBeEnabled()
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
    const repo = repository(); vi.spyOn(repo, 'createProject').mockRejectedValue(new Error('quota')); render(<App repository={repo} />); await fill(userEvent.setup(), 'Новый проект', 'Паспорт', 'Создать проект'); expect(await within(await screen.findByRole('dialog')).findByRole('alert')).toHaveTextContent('Не удалось сохранить изменения'); expect(screen.queryByRole('heading', { name: 'Паспорт' })).not.toBeInTheDocument()
  })

  it('invites installation on the first ready workspace but not over unavailable storage', async () => {
    localStorage.removeItem('easytrack.installInvitationDismissed')
    const unavailable = { open: vi.fn().mockRejectedValue(new Error('blocked')) } as unknown as DexieProjectBoardRepository
    render(<App repository={unavailable} />)
    expect(await screen.findByRole('heading', { name: 'Рабочая доска недоступна' })).toBeInTheDocument()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    cleanup()
    render(<App repository={repository()} />)
    const invitation = await screen.findByRole('dialog', { name: 'EasyTrack можно установить' })
    expect(invitation).toHaveTextContent('Проекты локальны')
    await userEvent.setup().keyboard('{Escape}')
    expect(within(screen.getByRole('banner')).getByRole('button', { name: 'Создать проект' })).toBeInTheDocument()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('stops editing after this database connection becomes stale', async () => {
    const databaseName = `stale-app-${crypto.randomUUID()}`
    const reload = vi.fn()
    const newer = new Dexie(databaseName)
    render(<App databaseName={databaseName} reloadApp={reload} />)
    await findHeaderCreate('Создать проект')
    newer.version(4).stores({ projects: 'id, createdAt', statuses: 'id, projectId, [projectId+position]', cards: 'id, statusId, [statusId+position]', workspace: 'id', releases: 'id' })
    await newer.open()
    expect(await screen.findByRole('heading', { name: 'Нужно перезапустить EasyTrack' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Создать проект' })).not.toBeInTheDocument()
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: 'Настройки' }))
    await user.click(within(await screen.findByRole('menu', { name: 'Настройки' })).getByRole('menuitem', { name: 'Как установить EasyTrack' }))
    expect(screen.getByRole('dialog', { name: 'Установить EasyTrack' })).toBeInTheDocument()
    await user.keyboard('{Escape}')
    await user.click(screen.getByRole('button', { name: 'Перезапустить' }))
    expect(reload).toHaveBeenCalledOnce()
    newer.close()
    await newer.delete()
  })
})

it('retains the header creation draft on validation and storage errors and retries the whole form', async () => {
  const user = userEvent.setup(); const repo = repository(); render(<App repository={repo} />)
  await fill(user, 'Новый проект', 'Priority', 'Создать проект'); await addStatus(user, 'Todo')
  const column = screen.getByRole('heading', { name: 'Todo' }).closest('article')!
  const trigger = column.querySelector<HTMLButtonElement>('.add-card-header')!
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
  await waitFor(() => expect(trigger).toHaveFocus())
  expect(column.querySelector('.card-name')).toHaveTextContent('Draft')
  expect(column.querySelectorAll('.card-badge')).toHaveLength(2)
})

it('edits fields on the detail page atomically, preserves failed drafts, and keeps priority order', async () => {
  const user = userEvent.setup(); const repo = repository(); render(<App repository={repo} />)
  await fill(user, 'Новый проект', 'Priority', 'Создать проект'); await addStatus(user, 'Todo')
  let column = screen.getByRole('heading', { name: 'Todo' }).closest('article')!
  await addCard(user, column, 'First'); await addCard(user, column, 'Second')
  await user.click(screen.getByRole('button', { name: 'Действия карточки Second' })); await user.click(screen.getByRole('menuitem', { name: 'Редактировать' }))
  const form = await screen.findByRole('form', { name: 'Редактировать основное' })
  expect(within(form).getByLabelText('Название карточки')).toHaveValue('Second')
  await user.clear(within(form).getByLabelText('Название карточки')); await user.type(within(form).getByLabelText('Название карточки'), 'Edited')
  await user.click(within(form).getByLabelText('Важная'))
  await user.type(within(form).getByLabelText('Описание карточки'), 'Details')
  vi.spyOn(repo, 'updateCard').mockRejectedValueOnce(new Error('quota'))
  await user.click(within(form).getByRole('button', { name: 'Сохранить' }))
  expect(await within(form).findByRole('alert')).toHaveTextContent('Не удалось сохранить')
  const projectId = (await repo.projects())[0].id
  expect((await repo.board(projectId))!.statuses[0].cards.map(card => card.name)).toEqual(['First', 'Second'])
  expect(within(form).getByLabelText('Важная')).toBeChecked()
  await user.click(within(form).getByRole('button', { name: 'Сохранить' }))
  await screen.findByRole('heading', { name: 'Edited', level: 2 })
  await waitFor(() => expect(form).not.toBeInTheDocument())
  await user.click(screen.getByRole('button', { name: 'Редактировать основное' }))
  await user.click(await screen.findByLabelText('Срочная'))
  await user.click(screen.getByRole('button', { name: 'Закрыть карточку' }))
  await user.click(screen.getByRole('button', { name: 'Выйти без сохранения' }))
  await screen.findByRole('heading', { name: 'Todo' })
  column = screen.getByRole('heading', { name: 'Todo' }).closest('article')!
  expect(Array.from(column.querySelectorAll('.card-name')).map(node => node.textContent)).toEqual(['Edited', 'First'])
  expect(column.querySelectorAll('.card-badge')).toHaveLength(1)
  const before = await repo.board(projectId)
  // The board can render before the unsaved-changes dialog unmounts and releases the inert application bar,
  // and before focus returns to the closed card; that late focus would close the settings menu.
  await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  await waitFor(() => expect(screen.getByRole('link', { name: 'Edited' })).toHaveFocus())
  await user.click(screen.getByRole('button', { name: 'Настройки' }))
  await user.click(await screen.findByRole('menuitemradio', { name: 'English' }))
  expect(await screen.findByText('Important')).toBeInTheDocument()
  expect(screen.queryByText('Urgent')).not.toBeInTheDocument()
  expect(await repo.board(projectId)).toEqual(before)
})


it('returns creation focus to the header plus after save, cancel and Escape in empty and populated statuses', async () => {
  const user = userEvent.setup(); render(<App repository={repository()} />)
  await fill(user, 'Новый проект', 'Creation entries', 'Создать проект'); await addStatus(user, 'Todo')
  const column = screen.getByRole('heading', { name: 'Todo' }).closest('article')!
  const trigger = column.querySelector<HTMLButtonElement>('.add-card-header')!
  expect(within(column).getAllByRole('button', { name: 'Добавить карточку' })).toHaveLength(1)
  for (const populated of [false, true]) {
    for (const dismissal of ['cancel', 'escape']) {
      await user.click(trigger)
      expect(screen.getAllByRole('dialog')).toHaveLength(1)
      expect(screen.getByLabelText('Название карточки')).toHaveFocus()
      if (dismissal === 'cancel') await user.click(screen.getByRole('button', { name: 'Отмена' }))
      else await user.keyboard('{Escape}')
      await waitFor(() => expect(trigger).toHaveFocus())
      expect(column.querySelectorAll('.work-card')).toHaveLength(populated ? 1 : 0)
    }
    if (!populated) {
      await user.click(trigger)
      await fill(user, 'Название карточки', 'Saved from selected entry', 'Создать карточку')
      await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
      await waitFor(() => expect(trigger).toHaveFocus())
    }
  }
})

it('closes a failed header creation without losing the opener focus', async () => {
  const user = userEvent.setup(); const repo = repository(); render(<App repository={repo} />)
  await fill(user, 'Новый проект', 'Creation failure', 'Создать проект'); await addStatus(user, 'Todo')
  const column = screen.getByRole('heading', { name: 'Todo' }).closest('article')!
  const trigger = column.querySelector<HTMLButtonElement>('.add-card-header')!
  vi.spyOn(repo, 'createCard').mockRejectedValueOnce(new Error('quota'))
  await user.click(trigger)
  await fill(user, 'Название карточки', 'Retained draft', 'Создать карточку')
  expect(await within(screen.getByRole('dialog')).findByRole('alert')).toHaveTextContent('Не удалось сохранить')
  expect(screen.getByLabelText('Название карточки')).toHaveValue('Retained draft')
  expect(column.querySelectorAll('.work-card')).toHaveLength(0)
  await user.keyboard('{Escape}')
  await waitFor(() => expect(trigger).toHaveFocus())
})

it('offers only the header creation entry in every status, with or without cards', async () => {
  const user = userEvent.setup(); render(<App repository={repository()} />)
  await fill(user, 'Новый проект', 'Visibility', 'Создать проект'); await addStatus(user, 'Todo'); await addStatus(user, 'Done')
  const todo = () => screen.getByRole('heading', { name: 'Todo' }).closest('article')!
  const done = () => screen.getByRole('heading', { name: 'Done' }).closest('article')!
  const expectHeaderEntryOnly = () => {
    for (const column of [todo, done]) {
      expect(column().querySelector('.column-header .add-card-header')).toBeEnabled()
      expect(within(column()).getAllByRole('button', { name: 'Добавить карточку' })).toHaveLength(1)
    }
    expect(screen.getAllByRole('button', { name: 'Добавить статус' })[0]).toBeEnabled()
  }
  expectHeaderEntryOnly()
  await addCard(user, done(), 'Only card')
  expect(within(done()).getByText('Only card')).toBeInTheDocument()
  expect(within(todo()).queryByText('Only card')).not.toBeInTheDocument()
  expectHeaderEntryOnly()
  await user.click(screen.getByRole('button', { name: 'Действия карточки Only card' })); await user.click(screen.getByRole('menuitem', { name: 'Удалить' }))
  await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Удалить' }))
  await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  expectHeaderEntryOnly()
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
})

describe('notification area', () => {
  async function boardWithCards() {
    const repo = repository()
    await repo.createProject({ id: 'p', name: 'Project', createdAt: 'now' }, [], true)
    await repo.createStatus({ id: 's', projectId: 'p', name: 'Status' })
    for (const id of ['First', 'Second']) await repo.createCard({ id, statusId: 's', name: id, description: '', important: false, urgent: false })
    location.hash = '#project/p'
    render(<App repository={repo} />)
    await screen.findByRole('heading', { level: 1, name: 'Project' })
    return repo
  }
  const transient = () => document.querySelector<HTMLElement>('.notification-transient')!
  const offer = () => screen.queryByRole('status', { name: 'Обновление EasyTrack' })
  async function moveDown(user: ReturnType<typeof userEvent.setup>, name: string) {
    await user.click(screen.getByRole('button', { name: `Действия карточки ${name}` }))
    await user.click(screen.getByRole('menuitem', { name: 'Опустить ниже' }))
    await waitFor(() => expect(transient()).toHaveTextContent('Расположение карточки сохранено.'))
  }
  afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals() })

  it('renders outside main and inert content, so a toast stays announced while a dialog is open', async () => {
    await boardWithCards()
    const user = userEvent.setup()
    await moveDown(user, 'First')
    const area = document.querySelector('.notification-area')!
    expect(area).toHaveAttribute('data-placement', 'bottom-center')
    expect(area.closest('main')).toBeNull()
    await user.click(screen.getAllByRole('button', { name: 'Добавить статус' })[0])
    await screen.findByRole('dialog')
    expect(transient().closest('[inert], [aria-hidden="true"]')).toBeNull()
    expect(transient()).toHaveTextContent('Расположение карточки сохранено.')
  })

  it('stacks a toast above the update offer and keeps the offer when the toast disappears', async () => {
    await boardWithCards()
    act(() => simulateUpdateReady())
    expect(await screen.findByRole('status', { name: 'Обновление EasyTrack' })).toHaveTextContent('Доступно обновление EasyTrack.')
    // Fake only the toast timer's clock instead of waiting it out in real time; IndexedDB keeps its real scheduling.
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'], shouldAdvanceTime: true })
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    await moveDown(user, 'First')
    const persistent = document.querySelector('.notification-persistent')!
    expect(transient().compareDocumentPosition(persistent) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(persistent).toContainElement(offer())
    await act(() => vi.advanceTimersByTimeAsync(TOAST_DURATION_MS))
    expect(transient()).toBeEmptyDOMElement()
    expect(within(offer()!).getByRole('button', { name: 'Обновить' })).toBeInTheDocument()
    expect(within(offer()!).getByRole('button', { name: 'Позже' })).toBeInTheDocument()
  })

  it('keeps the update offer out of reach while a dialog is open and returns it afterwards', async () => {
    await boardWithCards()
    act(() => simulateUpdateReady())
    await screen.findByRole('status', { name: 'Обновление EasyTrack' })
    const user = userEvent.setup()
    await user.click(screen.getAllByRole('button', { name: 'Добавить статус' })[0])
    const dialog = await screen.findByRole('dialog')
    expect(offer()).toBeNull()
    expect(document.querySelector('.notification-persistent')).toHaveAttribute('inert')
    for (let step = 0; step < 6; step++) {
      await user.tab()
      expect(dialog).toContainElement(document.activeElement as HTMLElement)
    }
    await user.keyboard('{Escape}')
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(within(offer()!).getByRole('button', { name: 'Обновить' })).toBeInTheDocument()
  })

  it('keeps the update offer out of reach while the card panel isolates a narrow workspace', async () => {
    vi.stubGlobal('matchMedia', (query: string) => ({ matches: query === '(max-width: 60rem)', media: query, addEventListener() {}, removeEventListener() {} }))
    await boardWithCards()
    act(() => simulateUpdateReady())
    await screen.findByRole('status', { name: 'Обновление EasyTrack' })
    const user = userEvent.setup()
    await user.click(screen.getByRole('link', { name: 'First' }))
    // On a narrow screen the panel covers the workspace as a modal surface.
    await screen.findByRole('dialog', { name: 'Подробности карточки' })
    await waitFor(() => expect(offer()).toBeNull())
    expect(document.querySelector('.notification-persistent')).toHaveAttribute('inert')
    await user.click(screen.getByRole('button', { name: 'Закрыть карточку' }))
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Подробности карточки' })).toBeNull())
    await waitFor(() => expect(offer()).not.toBeNull())
  })
})

async function boardWithCards(...names: string[]) {
  const user = userEvent.setup(); const repo = repository(); render(<App repository={repo} />)
  await fill(user, 'Новый проект', 'Menu project', 'Создать проект'); await addStatus(user, 'Todo')
  const column = screen.getByRole('heading', { name: 'Todo' }).closest('article')!
  for (const name of names) await addCard(user, column, name)
  return user
}
const chooseEdit = async (user: ReturnType<typeof userEvent.setup>, name: string) => {
  await user.click(screen.getByRole('button', { name: `Действия карточки ${name}` }))
  await user.click(await screen.findByRole('menuitem', { name: 'Редактировать' }))
}

it('shows the project and status as plain-text context in the card page bar and no bar heading', async () => {
  const user = await boardWithCards('First')
  await user.click(screen.getByRole('link', { name: 'First' }))
  await user.click(await screen.findByRole('button', { name: 'Открыть на всю страницу' }))
  await screen.findByRole('button', { name: 'Назад к доске' })
  const bar = document.querySelector('.card-page .app-bar')!
  expect(bar.querySelector('h1')).toBeNull()
  expect(bar.querySelector('a')).toBeNull()
  expect(bar).toHaveTextContent('Menu project›Todo')
  expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)
  expect(screen.getByRole('heading', { level: 1, name: 'First' })).toBeInTheDocument()
})

it('opens the panel in editing from the card menu, but in view mode from a plain click', async () => {
  const user = await boardWithCards('First')
  await user.click(screen.getByRole('link', { name: 'First' }))
  await screen.findByRole('button', { name: 'Редактировать основное' })
  expect(screen.queryByRole('form', { name: 'Редактировать основное' })).not.toBeInTheDocument()
  await chooseEdit(user, 'First')
  const form = await screen.findByRole('form', { name: 'Редактировать основное' })
  await waitFor(() => expect(within(form).getByLabelText('Название карточки')).toHaveFocus())
})

it('opens editing from the menu directly for a closed card, with focus in the name', async () => {
  const user = await boardWithCards('First')
  await chooseEdit(user, 'First')
  const form = await screen.findByRole('form', { name: 'Редактировать основное' })
  await waitFor(() => expect(within(form).getByLabelText('Название карточки')).toHaveFocus())
})

it('keeps the current card in view mode when the draft guard Stay blocks Edit on another card', async () => {
  const user = await boardWithCards('First', 'Second')
  await user.click(screen.getByRole('link', { name: 'First' }))
  await user.click(await screen.findByRole('button', { name: 'Добавить заметку' }))
  await user.type(screen.getByLabelText('Новая заметка'), 'Draft')
  await chooseEdit(user, 'Second')
  await user.click(within(await screen.findByRole('dialog', { name: 'Несохранённые изменения' })).getByRole('button', { name: 'Остаться' }))
  await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Несохранённые изменения' })).toBeNull())
  expect(screen.getByRole('heading', { level: 2, name: 'First' })).toBeInTheDocument()
  expect(screen.queryByRole('form', { name: 'Редактировать основное' })).not.toBeInTheDocument()
  expect(screen.getByLabelText('Новая заметка')).toHaveValue('Draft')
})

it('keeps editing and typed values when the draft guard Stay blocks opening another card', async () => {
  const user = await boardWithCards('First', 'Second')
  await chooseEdit(user, 'First')
  const name = within(await screen.findByRole('form', { name: 'Редактировать основное' })).getByLabelText('Название карточки')
  await user.clear(name); await user.type(name, 'Renamed')
  await user.click(screen.getByRole('link', { name: 'Second' }))
  await user.click(within(await screen.findByRole('dialog', { name: 'Несохранённые изменения' })).getByRole('button', { name: 'Остаться' }))
  await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Несохранённые изменения' })).toBeNull())
  expect(screen.getByRole('heading', { level: 2, name: 'First' })).toBeInTheDocument()
  expect(within(screen.getByRole('form', { name: 'Редактировать основное' })).getByLabelText('Название карточки')).toHaveValue('Renamed')
})

it('does not reuse an earlier edit request after the panel closes, and a plain click returns an open editor to view', async () => {
  const user = await boardWithCards('First')
  await chooseEdit(user, 'First')
  await screen.findByRole('form', { name: 'Редактировать основное' })
  await user.click(screen.getByRole('link', { name: 'First' }))
  expect(await screen.findByRole('button', { name: 'Редактировать основное' })).toHaveFocus()
  expect(screen.queryByRole('form', { name: 'Редактировать основное' })).not.toBeInTheDocument()
  await chooseEdit(user, 'First')
  await screen.findByRole('form', { name: 'Редактировать основное' })
  await user.click(screen.getByRole('button', { name: 'Закрыть карточку' }))
  await waitFor(() => expect(document.querySelector('.card-panel')).toBeNull())
  await user.click(screen.getByRole('link', { name: 'First' }))
  await screen.findByRole('button', { name: 'Редактировать основное' })
  expect(screen.queryByRole('form', { name: 'Редактировать основное' })).not.toBeInTheDocument()
})

it('moves focus to the name when Edit is chosen again for a card already in editing', async () => {
  const user = await boardWithCards('First')
  await chooseEdit(user, 'First')
  const name = within(await screen.findByRole('form', { name: 'Редактировать основное' })).getByLabelText('Название карточки')
  await waitFor(() => expect(name).toHaveFocus())
  await chooseEdit(user, 'First')
  await waitFor(() => expect(within(screen.getByRole('form', { name: 'Редактировать основное' })).getByLabelText('Название карточки')).toHaveFocus())
})
