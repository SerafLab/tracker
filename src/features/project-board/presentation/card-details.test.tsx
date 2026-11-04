import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, expect, it, vi } from 'vitest'
import { App } from '../../../app/app'
import { ProjectBoardDatabase } from '../infrastructure/indexeddb/database'
import { DexieProjectBoardRepository } from '../infrastructure/indexeddb/dexie-project-board-repository'
import { CardDetailView, PlainText } from './card-detail-view'
import { LocaleProvider } from '../../../i18n/provider'
import type { CardDetails } from '../domain/model'

const pwa = vi.hoisted(() => ({ ready: false, update: vi.fn().mockResolvedValue(undefined) }))
vi.mock('virtual:pwa-register/react', () => ({ useRegisterSW: () => ({ needRefresh: [pwa.ready, vi.fn()], offlineReady: [false, vi.fn()], updateServiceWorker: pwa.update }) }))

const databases: ProjectBoardDatabase[] = []
afterEach(async () => { vi.useRealTimers(); pwa.ready = false; pwa.update.mockClear(); cleanup(); history.replaceState(null, '', '/'); await Promise.all(databases.splice(0).map(db => db.delete())) })
async function setup(hash = '#project/p/card/c', configure: (repo: DexieProjectBoardRepository) => void | Promise<void> = () => {}) {
  const db = new ProjectBoardDatabase(`details-${crypto.randomUUID()}`); databases.push(db)
  const repo = new DexieProjectBoardRepository(db)
  await repo.createProject({ id: 'p', name: 'Project', createdAt: '2026-11-01T00:00:00Z' }, [], true)
  await repo.createProject({ id: 'q', name: 'Other', createdAt: '2026-11-01T00:00:01Z' }, [], true)
  await repo.createStatus({ id: 's', projectId: 'p', name: 'Status' })
  await repo.createCard({ id: 'c', statusId: 's', name: 'Card', description: '', important: false, urgent: false })
  history.replaceState(null, '', `/${hash}`)
  await configure(repo)
  render(<App repository={repo} />)
  const user = userEvent.setup()
  return { repo, db, user }
}
async function editor(user: ReturnType<typeof userEvent.setup>) { await user.click(screen.getByRole('button', { name: 'Добавить заметку' })); return screen.getByLabelText('Новая заметка') }
async function fields() { return within(await screen.findByRole('form', { name: 'Поля карточки' })) }

for (const [ids, deletedId, nextId, mode] of [
  [['a', 'b', 'c'], 'b', 'c', 'ready'],
  [['a', 'b'], 'b', 'a', 'ready'],
  [['a'], 'a', null, 'ready'],
  [['a'], 'a', null, 'draft'],
  [['a'], 'a', null, 'busy'],
  [['a'], 'a', null, 'new-focus'],
] as const) it(`settles deletion focus after the DOM commit (${deletedId} → ${nextId ?? 'add'}, ${mode})`, async () => {
  const details: CardDetails = {
    project: { id: 'p', name: 'Project', createdAt: '2026-11-01T00:00:00Z' },
    status: { id: 's', projectId: 'p', name: 'Status', position: 0 },
    card: { id: 'c', statusId: 's', name: 'Card', description: '', important: false, urgent: false, position: 0 },
    notes: ids.map(id => ({ id, cardId: 'c', text: id, createdAt: '2026-11-01T00:00:00Z' })),
  }
  let finish!: (saved: boolean) => void
  const props = { details, busy: false, onReturn: vi.fn(), onCatalogue: vi.fn(), onSave: vi.fn(), onCreateNote: vi.fn(), onUpdateNote: vi.fn(), onDeleteNote: vi.fn(() => new Promise<boolean>(resolve => { finish = resolve })), registerDraftGuard: vi.fn(), requestLeave: vi.fn() }
  const { rerender, container } = render(<LocaleProvider><CardDetailView {...props} /></LocaleProvider>)
  if (mode === 'draft') {
    fireEvent.click(screen.getByRole('button', { name: 'Добавить заметку' }))
    fireEvent.change(screen.getByLabelText('Новая заметка'), { target: { value: 'Retained draft' } })
  }
  const note = container.querySelector(`[data-note-id="${deletedId}"]`) as HTMLElement
  fireEvent.click(within(note).getByRole('button', { name: 'Удалить заметку' }))
  fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Удалить' }))
  vi.useFakeTimers()
  const savedDetails = { ...details, notes: details.notes.filter(note => note.id !== deletedId) }
  const delayed = mode === 'busy' || mode === 'new-focus'
  await act(async () => {
    rerender(<LocaleProvider><CardDetailView {...props} details={savedDetails} busy={delayed} /></LocaleProvider>)
    finish(true)
    // A timer may run before React commits the dialog removal and enabled controls.
    await vi.runAllTimersAsync()
  })
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  if (delayed) {
    expect(screen.getByRole('button', { name: 'Добавить заметку' })).toBeDisabled()
    expect(document.body).toHaveFocus()
    if (mode === 'new-focus') screen.getByRole('button', { name: 'Назад к доске' }).focus()
    rerender(<LocaleProvider><CardDetailView {...props} details={savedDetails} /></LocaleProvider>)
  }
  let target: HTMLElement
  if (mode === 'draft') target = screen.getByLabelText('Новая заметка')
  else if (mode === 'new-focus') target = screen.getByRole('button', { name: 'Назад к доске' })
  else if (nextId) target = within(container.querySelector(`[data-note-id="${nextId}"]`) as HTMLElement).getByRole('button', { name: 'Редактировать заметку' })
  else target = screen.getByRole('button', { name: 'Добавить заметку' })
  expect(target).toHaveFocus()
  if (mode === 'draft') expect(target).toHaveValue('Retained draft')
})

it('opens a direct detail address, hides project actions, returns to its board and rejects foreign cards', async () => {
  const { repo, user } = await setup()
  await fields()
  expect(screen.getByRole('heading', { name: 'Card', level: 1 })).toBeInTheDocument()
  expect(screen.getByRole('main')).toHaveFocus()
  await user.click(screen.getByRole('button', { name: 'Настройки' }))
  expect(screen.queryByRole('button', { name: 'Переименовать проект' })).not.toBeInTheDocument()
  expect(screen.queryByRole('button', { name: 'Добавить статус' })).not.toBeInTheDocument()
  await user.keyboard('{Escape}')
  await user.click(screen.getByRole('button', { name: 'Назад к доске' }))
  await screen.findByRole('heading', { name: 'Project', level: 1 })
  await user.click(screen.getByRole('link', { name: 'Card' }))
  await fields()
  cleanup(); history.replaceState(null, '', '/#project/q/card/c'); render(<App repository={repo} />)
  expect(await screen.findByRole('heading', { name: 'Карточка недоступна' })).toBeInTheDocument()
  expect(screen.queryByDisplayValue('Card')).not.toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: 'Назад к доске' }))
  expect(await screen.findByRole('heading', { name: 'Other' })).toBeInTheDocument()
})

it('validates basic fields, clears descriptions and retains independent note drafts when fields save', async () => {
  const { repo, user } = await setup(); const form = await fields()
  await user.clear(form.getByLabelText('Название карточки'))
  await user.click(form.getByRole('button', { name: 'Сохранить' }))
  expect(form.getByRole('alert')).toHaveTextContent('Название обязательно')
  await user.type(form.getByLabelText('Название карточки'), 'Saved')
  await user.type(form.getByLabelText('Описание карточки'), 'First\nSecond')
  const note = await editor(user); await user.type(note, 'Unfinished note')
  await user.click(form.getByRole('button', { name: 'Сохранить' }))
  expect(await screen.findByRole('heading', { name: 'Saved', level: 1 })).toBeInTheDocument()
  expect(note).toHaveValue('Unfinished note')
  expect((await repo.cardDetails('p', 'c'))!.notes).toEqual([])
  await user.clear(form.getByLabelText('Описание карточки')); await user.click(form.getByRole('button', { name: 'Сохранить' }))
  expect((await repo.cardDetails('p', 'c'))!.card.description).toBe('')
})

it('creates, edits without a no-op date, refuses blank notes, confirms deletion and restores focus', async () => {
  const { repo, user } = await setup(); await fields()
  let note = await editor(user)
  await user.click(screen.getByRole('button', { name: 'Добавить заметку' }))
  expect(screen.getByRole('alert')).toHaveTextContent('Текст заметки обязателен')
  await user.type(note, 'First note')
  vi.spyOn(repo, 'createNote').mockRejectedValueOnce(new Error('quota'))
  await user.click(screen.getByRole('button', { name: 'Добавить заметку' }))
  expect(await screen.findByRole('alert')).toHaveTextContent('Заметка не сохранена')
  expect(note).toHaveValue('First note')
  await user.click(screen.getByRole('button', { name: 'Добавить заметку' }))
  await waitFor(() => expect(screen.queryByLabelText('Новая заметка')).not.toBeInTheDocument()); await waitFor(() => expect(document.querySelector('.note-list')).toHaveTextContent('First note'))
  await user.click(screen.getByRole('button', { name: 'Редактировать заметку' }))
  await user.click(screen.getByRole('button', { name: 'Сохранить заметку' }))
  expect((await repo.cardDetails('p', 'c'))!.notes[0].updatedAt).toBeUndefined()
  await user.click(screen.getByRole('button', { name: 'Редактировать заметку' })); note = screen.getByRole('textbox', { name: 'Редактировать заметку' })
  await user.clear(note); await user.type(note, 'Changed note')
  await user.click(screen.getByRole('button', { name: 'Сохранить заметку' }))
  expect((await repo.cardDetails('p', 'c'))!.notes[0].updatedAt).toBeTruthy()
  const trigger = screen.getByRole('button', { name: 'Удалить заметку' }); await user.click(trigger)
  let dialog = screen.getByRole('dialog'); expect(within(dialog).getByText('Changed note')).toBeInTheDocument()
  expect(within(dialog).getByRole('button', { name: 'Отмена' })).toHaveFocus()
  await user.keyboard('{Escape}'); expect(trigger).toHaveFocus()
  await user.click(trigger); dialog = screen.getByRole('dialog')
  vi.spyOn(repo, 'deleteNote').mockRejectedValueOnce(new Error('quota'))
  await user.click(within(dialog).getByRole('button', { name: 'Удалить' }))
  expect(await within(dialog).findByRole('alert')).toHaveTextContent('Не удалось сохранить')
  await user.click(within(dialog).getByRole('button', { name: 'Удалить' }))
  await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  await waitFor(() => expect(screen.getByRole('button', { name: 'Добавить заметку' })).toHaveFocus())
  expect((await repo.cardDetails('p', 'c'))!.notes).toEqual([])
})

it('saves a note without saving pending card fields, and guards editor switches', async () => {
  const { repo, user } = await setup(); const form = await fields()
  await user.type(form.getByLabelText('Описание карточки'), 'Pending fields')
  await user.type(await editor(user), 'Saved note'); await user.click(screen.getByRole('button', { name: 'Добавить заметку' }))
  await waitFor(() => expect(screen.queryByLabelText('Новая заметка')).not.toBeInTheDocument())
  expect(form.getByLabelText('Описание карточки')).toHaveValue('Pending fields')
  expect((await repo.cardDetails('p', 'c'))!.card.description).toBe('')
  await user.type(await editor(user), 'Pending note')
  await user.click(screen.getByRole('button', { name: 'Редактировать заметку' }))
  let dialog = screen.getByRole('dialog', { name: 'Несохранённые изменения' })
  await user.click(within(dialog).getByRole('button', { name: 'Остаться' }))
  expect(screen.getByLabelText('Новая заметка')).toHaveValue('Pending note')
  await user.click(screen.getByRole('button', { name: 'Редактировать заметку' }))
  dialog = screen.getByRole('dialog'); await user.click(within(dialog).getByRole('button', { name: 'Выйти без сохранения' }))
  expect(screen.getByRole('textbox', { name: 'Редактировать заметку' })).toHaveValue('Saved note')
})

it('keeps separately committed fields after a failed save-on-leave note and retries without duplicating writes', async () => {
  const { repo, user } = await setup(); const form = await fields()
  await user.type(form.getByLabelText('Описание карточки'), 'Committed first')
  await user.type(await editor(user), 'Pending second')
  const update = vi.spyOn(repo, 'updateCard')
  const create = vi.spyOn(repo, 'createNote').mockRejectedValueOnce(new Error('quota'))
  await user.click(screen.getByRole('button', { name: 'Назад к доске' }))
  await user.click(screen.getByRole('button', { name: 'Сохранить и выйти' }))
  expect(await screen.findByRole('alert')).toHaveTextContent('Заметка не сохранена')
  expect(screen.getByLabelText('Новая заметка')).toHaveValue('Pending second')
  expect((await repo.cardDetails('p', 'c'))!.card.description).toBe('Committed first')
  expect(location.hash).toBe('#project/p/card/c')
  await user.click(screen.getByRole('button', { name: 'Назад к доске' }))
  await user.click(screen.getByRole('button', { name: 'Сохранить и выйти' }))
  await screen.findByRole('heading', { name: 'Project', level: 1 })
  expect(update).toHaveBeenCalledOnce(); expect(create).toHaveBeenCalledTimes(2)
  expect((await repo.cardDetails('p', 'c'))!.notes.map(note => note.text)).toEqual(['Pending second'])
})

it('preserves drafts for Stay/Escape and warns on unload only while dirty', async () => {
  const { user } = await setup(); const form = await fields()
  const clean = new Event('beforeunload', { cancelable: true }); fireEvent(window, clean); expect(clean.defaultPrevented).toBe(false)
  await user.type(form.getByLabelText('Описание карточки'), 'Draft')
  const dirty = new Event('beforeunload', { cancelable: true }); fireEvent(window, dirty); expect(dirty.defaultPrevented).toBe(true)
  const trigger = screen.getByRole('button', { name: 'Назад к доске' }); await user.click(trigger)
  await user.keyboard('{Escape}'); expect(trigger).toHaveFocus()
  expect(form.getByLabelText('Описание карточки')).toHaveValue('Draft')
  await user.click(form.getByRole('button', { name: 'Сохранить' }))
  await waitFor(() => { const saved = new Event('beforeunload', { cancelable: true }); fireEvent(window, saved); expect(saved.defaultPrevented).toBe(false) })
})

it('renders markup literally and links only absolute HTTP(S) URLs in another context', () => {
  render(<PlainText text={'<script>alert(1)</script>\n[Text](javascript:alert(2)) data:text/html,test mail@example.com example.com\nhttps://example.com/test http://example.org/path'} />)
  expect(document.querySelector('script')).toBeNull()
  const links = screen.getAllByRole('link'); expect(links).toHaveLength(2)
  for (const link of links) { expect(link).toHaveAttribute('target', '_blank'); expect(link).toHaveAttribute('rel', 'noopener noreferrer') }
})

it('defers PWA activation until the dirty editor permits the update and saves before continuing', async () => {
  pwa.ready = true
  const { repo, user } = await setup(); const form = await fields()
  await user.type(form.getByLabelText('Описание карточки'), 'Save before update')
  await user.click(screen.getByRole('button', { name: 'Обновить' }))
  expect(screen.getByRole('dialog', { name: 'Несохранённые изменения' })).toBeInTheDocument()
  expect(pwa.update).not.toHaveBeenCalled()
  await user.click(screen.getByRole('button', { name: 'Остаться' }))
  expect(form.getByLabelText('Описание карточки')).toHaveValue('Save before update')
  await user.click(screen.getByRole('button', { name: 'Обновить' }))
  await user.click(screen.getByRole('button', { name: 'Сохранить и выйти' }))
  await waitFor(() => expect(pwa.update).toHaveBeenCalledExactlyOnceWith(true))
  expect((await repo.cardDetails('p', 'c'))!.card.description).toBe('Save before update')
})


it('keeps the requested card route and storage error when reading details fails', async () => {
  const { repo } = await setup('#project/p/card/c', repo => { vi.spyOn(repo, 'cardDetails').mockRejectedValueOnce(new Error('read unavailable')) })
  expect(await screen.findByRole('heading', { name: 'Рабочая доска недоступна' })).toBeInTheDocument()
  expect(location.hash).toBe('#project/p/card/c')
  expect(screen.getByRole('alert')).toHaveTextContent('Локальное хранилище недоступно')
  expect(screen.queryByRole('button', { name: 'Project' })).not.toBeInTheDocument()
  expect(await repo.projects()).toHaveLength(2)
})

it('focuses the retained new-note draft after deleting the last saved note', async () => {
  const { repo, user } = await setup(); await fields()
  await user.type(await editor(user), 'Saved note')
  await user.click(screen.getByRole('button', { name: 'Добавить заметку' }))
  await waitFor(() => expect(screen.queryByLabelText('Новая заметка')).not.toBeInTheDocument())
  const draft = await editor(user); await user.type(draft, 'Keep this new draft')
  await user.click(screen.getByRole('button', { name: 'Удалить заметку' }))
  await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Удалить' }))
  await waitFor(() => expect(draft).toHaveFocus())
  expect(draft).toHaveValue('Keep this new draft')
  expect((await repo.cardDetails('p', 'c'))!.notes).toEqual([])
})


it('returns to the catalogue for a missing project without exposing another card', async () => {
  await setup('#project/missing/card/c')
  expect(await screen.findByRole('heading', { name: 'Трекер личных проектов' })).toBeInTheDocument()
  expect(location.hash).toBe('')
  expect(screen.queryByDisplayValue('Card')).not.toBeInTheDocument()
})

it('does not dispatch the same field save twice while persistence is pending', async () => {
  const { repo, user } = await setup(); const form = await fields()
  let finish!: () => void
  const update = vi.spyOn(repo, 'updateCard').mockImplementationOnce(() => new Promise<void>(resolve => { finish = resolve }))
  await user.type(form.getByLabelText('Описание карточки'), 'Pending save')
  const element = screen.getByRole('form', { name: 'Поля карточки' })
  fireEvent.submit(element); fireEvent.submit(element)
  expect(update).toHaveBeenCalledOnce()
  expect(form.getByLabelText('Описание карточки')).toBeDisabled()
  finish()
  await waitFor(() => expect(form.getByLabelText('Описание карточки')).toBeEnabled())
})

async function openPanel(user: ReturnType<typeof userEvent.setup>, name = 'Card') {
  await user.click(await screen.findByRole('link', { name }))
  return screen.findByRole('region', { name: 'Подробности карточки' })
}
async function deleteFromBoard(user: ReturnType<typeof userEvent.setup>, name: string) {
  await user.click(screen.getByRole('button', { name: `Действия карточки ${name}` }))
  await user.click(await screen.findByRole('menuitem', { name: 'Удалить' }))
}

it('closes the panel and returns to the board URL when the open card is deleted from the board', async () => {
  const { user } = await setup('#project/p')
  const boardIndex = history.state?.easyTrackIndex
  await openPanel(user)
  const length = history.length
  await deleteFromBoard(user, 'Card')
  await user.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Удалить' }))
  await waitFor(() => expect(screen.queryByRole('region', { name: 'Подробности карточки' })).toBeNull())
  await waitFor(() => expect(location.hash).toBe('#project/p'))
  expect(history.length).toBe(length)
  // Back removed the panel entry instead of duplicating the board entry.
  await waitFor(() => expect(history.state?.easyTrackIndex).toBe(boardIndex))
  expect(screen.queryByText('Карточка недоступна')).toBeNull()
  expect(await screen.findByRole('heading', { level: 1, name: 'Project' })).toBeInTheDocument()
  await waitFor(() => expect(document.activeElement).not.toBe(document.body))
  expect(document.activeElement?.tagName).toBe('BUTTON')
})

it('keeps the missing-card page for a direct link to a missing card', async () => {
  await setup('#project/p/card/gone')
  expect(await screen.findByRole('alert')).toHaveTextContent(/не найден/i)
  expect(location.hash).toBe('#project/p/card/gone')
})

it('deleting an unrelated card never prompts for or discards the open card draft; deleting the open card does', async () => {
  const { user } = await setup('#project/p', async r => { await r.createCard({ id: 'd', statusId: 's', name: 'Other card', description: '', important: false, urgent: false }) })
  await openPanel(user, 'Card')
  const description = await screen.findByRole('textbox', { name: 'Описание карточки' })
  await user.type(description, 'Kept draft')
  await deleteFromBoard(user, 'Other card')
  expect(screen.queryByRole('dialog', { name: 'Несохранённые изменения' })).toBeNull()
  await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Удалить' }))
  await waitFor(() => expect(screen.queryByRole('link', { name: 'Other card' })).toBeNull())
  expect(screen.getByRole('textbox', { name: 'Описание карточки' })).toHaveValue('Kept draft')
  await deleteFromBoard(user, 'Card')
  expect(await screen.findByRole('dialog', { name: 'Несохранённые изменения' })).toBeInTheDocument()
})

it('never renders the card as a full page while Back closes the panel', async () => {
  const { user } = await setup('#project/p')
  await openPanel(user)
  const seen: string[] = []
  const observer = new MutationObserver(() => { for (const h1 of document.querySelectorAll('h1')) seen.push(h1.textContent ?? '') })
  observer.observe(document.body, { childList: true, subtree: true, characterData: true })
  await act(async () => { history.back() })
  await waitFor(() => expect(screen.queryByRole('region', { name: 'Подробности карточки' })).toBeNull())
  observer.disconnect()
  expect(seen).not.toContain('Card')
  expect(screen.getByRole('heading', { level: 1, name: 'Project' })).toBeInTheDocument()
})

it('keeps one install entry in place and retains the captured install prompt across board, catalogue, card page and panel navigation', async () => {
  const errors = vi.spyOn(console, 'error').mockImplementation(() => {})
  const { user } = await setup('#project/p')
  const prompt = vi.fn().mockResolvedValue(undefined)
  const event = Object.assign(new Event('beforeinstallprompt', { cancelable: true }), { prompt })
  await act(async () => { window.dispatchEvent(event) })
  const entry = () => {
    const all = document.querySelectorAll('.install-help')
    expect(all).toHaveLength(1)
    expect(within(all[0] as HTMLElement).getByRole('button', { name: 'Установить EasyTrack' })).toBeInTheDocument()
    return all[0]
  }
  const inBoard = () => !!entry().closest('.board-workspace main')
  await screen.findByRole('link', { name: 'Card' })
  expect(inBoard()).toBe(true)
  await user.click(screen.getByRole('button', { name: /Все проекты/ }))
  await screen.findByRole('button', { name: 'Project' })
  expect(inBoard()).toBe(false)
  await user.click(screen.getByRole('button', { name: 'Project' }))
  await screen.findByRole('link', { name: 'Card' })
  expect(inBoard()).toBe(true)
  await openPanel(user)
  expect(inBoard()).toBe(true)
  await user.click(screen.getByRole('button', { name: 'Открыть на всю страницу' }))
  await screen.findByRole('button', { name: 'Назад к доске' })
  expect(inBoard()).toBe(false)
  await user.click(screen.getByRole('button', { name: 'Назад к доске' }))
  await screen.findByRole('link', { name: 'Card' })
  expect(inBoard()).toBe(true)
  // Back from the board returns to the full card page entry.
  await act(async () => { history.back() })
  await screen.findByRole('button', { name: 'Назад к доске' })
  expect(inBoard()).toBe(false)
  await user.click(within(entry() as HTMLElement).getByRole('button'))
  expect(prompt).toHaveBeenCalledOnce()
  expect(errors).not.toHaveBeenCalled()
  errors.mockRestore()
})
