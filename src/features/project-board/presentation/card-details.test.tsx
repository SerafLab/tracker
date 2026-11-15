import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, expect, it, vi } from 'vitest'
import { App } from '../../../app/app'
import { ProjectBoardDatabase } from '../infrastructure/indexeddb/database'
import { DexieProjectBoardRepository } from '../infrastructure/indexeddb/dexie-project-board-repository'
import { CardDetailView, PlainText } from './card-detail-view'
import { LocaleProvider } from '../../../i18n/provider'
import type { CardDetails } from '../domain/model'
import { NoteOrderProvider, noteOrderStorageKey } from './note-order'

const pwa = vi.hoisted(() => ({ ready: false, update: vi.fn().mockResolvedValue(undefined) }))
vi.mock('virtual:pwa-register/react', () => ({ useRegisterSW: () => ({ needRefresh: [pwa.ready, vi.fn()], offlineReady: [false, vi.fn()], updateServiceWorker: pwa.update }) }))

const databases: ProjectBoardDatabase[] = []
afterEach(async () => { vi.useRealTimers(); localStorage.removeItem(noteOrderStorageKey); pwa.ready = false; pwa.update.mockClear(); cleanup(); history.replaceState(null, '', '/'); await Promise.all(databases.splice(0).map(db => db.delete())) })
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
// The add trigger stays disabled until the previous save settles; a click before that is ignored.
async function editor(user: ReturnType<typeof userEvent.setup>) {
  await waitFor(() => expect(screen.getByRole('button', { name: 'Добавить заметку' })).toBeEnabled())
  await user.click(screen.getByRole('button', { name: 'Добавить заметку' }))
  return screen.findByLabelText('Новая заметка')
}
const pencil = () => screen.findByRole('button', { name: 'Редактировать основное' })
async function fields(user: ReturnType<typeof userEvent.setup>) {
  await user.click(await pencil())
  return within(await screen.findByRole('form', { name: 'Редактировать основное' }))
}

for (const [ids, deletedId, nextId, mode] of [
  // Notes are stored oldest first and shown newest first by default.
  [['a', 'b', 'c'], 'b', 'a', 'ready'],
  [['a', 'b', 'c'], 'b', 'c', 'oldest'],
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
  if (mode === 'oldest') localStorage.setItem(noteOrderStorageKey, 'oldest')
  const { rerender, container } = render(<LocaleProvider><NoteOrderProvider><CardDetailView {...props} /></NoteOrderProvider></LocaleProvider>)
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
    rerender(<LocaleProvider><NoteOrderProvider><CardDetailView {...props} details={savedDetails} busy={delayed} /></NoteOrderProvider></LocaleProvider>)
    finish(true)
    // A timer may run before React commits the dialog removal and enabled controls.
    await vi.runAllTimersAsync()
  })
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  if (delayed) {
    expect(screen.getByRole('button', { name: 'Добавить заметку' })).toBeDisabled()
    expect(document.body).toHaveFocus()
    if (mode === 'new-focus') screen.getByRole('button', { name: 'Назад к доске' }).focus()
    rerender(<LocaleProvider><NoteOrderProvider><CardDetailView {...props} details={savedDetails} /></NoteOrderProvider></LocaleProvider>)
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
  await pencil()
  expect(screen.getByRole('heading', { name: 'Card', level: 1 })).toBeInTheDocument()
  expect(screen.getByRole('main')).toHaveFocus()
  expect(screen.queryByRole('button', { name: 'Действия проекта' })).not.toBeInTheDocument()
  expect(screen.queryByRole('menuitem', { name: 'Переименовать проект' })).not.toBeInTheDocument()
  expect(screen.queryByRole('button', { name: 'Добавить статус' })).not.toBeInTheDocument()
  await user.keyboard('{Escape}')
  await user.click(screen.getByRole('button', { name: 'Назад к доске' }))
  await screen.findByRole('heading', { name: 'Project', level: 1 })
  await user.click(screen.getByRole('link', { name: 'Card' }))
  await pencil()
  cleanup(); history.replaceState(null, '', '/#project/q/card/c'); render(<App repository={repo} />)
  expect(await screen.findByRole('heading', { name: 'Карточка недоступна' })).toBeInTheDocument()
  expect(screen.queryByDisplayValue('Card')).not.toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: 'Назад к доске' }))
  expect(await screen.findByRole('heading', { name: 'Other' })).toBeInTheDocument()
})

it('validates basic fields, clears descriptions and retains independent note drafts when fields save', async () => {
  const { repo, user } = await setup(); let form = await fields(user)
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
  await waitFor(() => expect(screen.queryByRole('form', { name: 'Редактировать основное' })).not.toBeInTheDocument())
  expect(document.querySelector('.card-summary .detail-text')).toHaveTextContent('First Second')
  form = await fields(user)
  await user.clear(form.getByLabelText('Описание карточки')); await user.click(form.getByRole('button', { name: 'Сохранить' }))
  expect(await screen.findByText('Нет описания')).toBeInTheDocument()
  expect((await repo.cardDetails('p', 'c'))!.card.description).toBe('')
})

it('keeps focus inside the details when the pencil is disabled after a successful save', async () => {
  const details: CardDetails = {
    project: { id: 'p', name: 'Project', createdAt: '2026-11-01T00:00:00Z' },
    status: { id: 's', projectId: 'p', name: 'Status', position: 0 },
    card: { id: 'c', statusId: 's', name: 'Card', description: '', important: false, urgent: false, position: 0 },
    notes: [],
  }
  const props = { details, busy: false, onReturn: vi.fn(), onCatalogue: vi.fn(), onCreateNote: vi.fn(), onUpdateNote: vi.fn(), onDeleteNote: vi.fn(), registerDraftGuard: vi.fn(), requestLeave: vi.fn() }
  // The save is written, but the follow-up read fails and makes the details busy.
  const onSave = vi.fn(async () => { rerender(<LocaleProvider><CardDetailView {...props} onSave={onSave} busy /></LocaleProvider>); return true })
  const { rerender } = render(<LocaleProvider><CardDetailView {...props} onSave={onSave} /></LocaleProvider>)
  const user = userEvent.setup()
  const form = await fields(user)
  await user.click(form.getByRole('button', { name: 'Сохранить' }))
  const pencilButton = await pencil()
  expect(pencilButton).toBeDisabled()
  await waitFor(() => expect(document.querySelector('.card-detail')).toHaveFocus())
})

it('creates, edits without a no-op date, refuses blank notes, confirms deletion and restores focus', async () => {
  const { repo, user } = await setup(); await pencil()
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
  // Each save settles when the note editor closes and its Edit trigger is enabled again.
  const saved = async () => {
    await waitFor(() => expect(screen.queryByRole('textbox', { name: 'Редактировать заметку' })).not.toBeInTheDocument())
    await waitFor(() => expect(screen.getByRole('button', { name: 'Редактировать заметку' })).toBeEnabled())
  }
  await user.click(screen.getByRole('button', { name: 'Редактировать заметку' }))
  await user.click(screen.getByRole('button', { name: 'Сохранить заметку' }))
  await saved()
  expect((await repo.cardDetails('p', 'c'))!.notes[0].updatedAt).toBeUndefined()
  await user.click(screen.getByRole('button', { name: 'Редактировать заметку' })); note = screen.getByRole('textbox', { name: 'Редактировать заметку' })
  await user.clear(note); await user.type(note, 'Changed note')
  await user.click(screen.getByRole('button', { name: 'Сохранить заметку' }))
  await saved()
  expect((await repo.cardDetails('p', 'c'))!.notes[0].updatedAt).toBeTruthy()
  const trigger = screen.getByRole('button', { name: 'Удалить заметку' })
  await waitFor(() => expect(trigger).toBeEnabled())
  await user.click(trigger)
  let dialog = await screen.findByRole('dialog'); expect(within(dialog).getByText('Changed note')).toBeInTheDocument()
  expect(within(dialog).getByRole('button', { name: 'Отмена' })).toHaveFocus()
  await user.keyboard('{Escape}'); await waitFor(() => expect(trigger).toHaveFocus())
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
  const { repo, user } = await setup(); const form = await fields(user)
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
  const { repo, user } = await setup(); const form = await fields(user)
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
  const { user } = await setup(); const form = await fields(user)
  const clean = new Event('beforeunload', { cancelable: true }); fireEvent(window, clean); expect(clean.defaultPrevented).toBe(false)
  await user.type(form.getByLabelText('Описание карточки'), 'Draft')
  const dirty = new Event('beforeunload', { cancelable: true }); fireEvent(window, dirty); expect(dirty.defaultPrevented).toBe(true)
  const trigger = screen.getByRole('button', { name: 'Назад к доске' }); await user.click(trigger)
  await user.keyboard('{Escape}'); await waitFor(() => expect(trigger).toHaveFocus())
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
  const { repo, user } = await setup(); const form = await fields(user)
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
  const { repo, user } = await setup(); await pencil()
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
  const { repo, user } = await setup(); const form = await fields(user)
  let finish!: () => void
  const update = vi.spyOn(repo, 'updateCard').mockImplementationOnce(() => new Promise<void>(resolve => { finish = resolve }))
  await user.type(form.getByLabelText('Описание карточки'), 'Pending save')
  const element = screen.getByRole('form', { name: 'Редактировать основное' })
  fireEvent.submit(element); fireEvent.submit(element)
  expect(update).toHaveBeenCalledOnce()
  expect(form.getByLabelText('Описание карточки')).toBeDisabled()
  finish()
  await waitFor(() => expect(screen.queryByRole('form', { name: 'Редактировать основное' })).not.toBeInTheDocument())
  expect(summary().getByText('Pending save')).toBeInTheDocument()
  await waitFor(() => expect(screen.getByRole('button', { name: 'Редактировать основное' })).toBeEnabled())
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
  await user.click(await pencil())
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

it('offers the captured install prompt from settings across board, catalogue, card page and panel navigation, without a floating control', async () => {
  const errors = vi.spyOn(console, 'error').mockImplementation(() => {})
  const { user } = await setup('#project/p')
  const prompt = vi.fn().mockResolvedValue(undefined)
  const event = Object.assign(new Event('beforeinstallprompt', { cancelable: true }), { prompt })
  await act(async () => { window.dispatchEvent(event) })
  const settingsEntry = async () => {
    expect(document.querySelector('.install-help')).toBeNull()
    await user.click(screen.getByRole('button', { name: 'Настройки' }))
    return await screen.findByRole('button', { name: 'Установить EasyTrack' })
  }
  const checkEntry = async () => { await settingsEntry(); await user.click(screen.getByRole('button', { name: 'Назад' })); await screen.findByRole('button', { name: 'Настройки' }) }
  await screen.findByRole('link', { name: 'Card' })
  await checkEntry()
  await user.click(screen.getByRole('button', { name: /Все проекты/ }))
  await screen.findByRole('button', { name: 'Project' })
  await checkEntry()
  await user.click(screen.getByRole('button', { name: 'Project' }))
  await screen.findByRole('link', { name: 'Card' })
  await openPanel(user)
  await checkEntry()
  await user.click(screen.getByRole('button', { name: 'Открыть на всю страницу' }))
  await screen.findByRole('button', { name: 'Назад к доске' })
  await user.click(await settingsEntry())
  expect(prompt).toHaveBeenCalledOnce()
  expect(errors).not.toHaveBeenCalled()
  errors.mockRestore()
})

const richCard = async (repo: DexieProjectBoardRepository) => { await repo.updateCard('c', { name: 'Card', description: 'See https://example.com', important: true, urgent: true }) }
const summary = () => within(screen.getByRole('region', { name: 'Основное' }))

it('shows a read-only summary with board flags, a link and no repeated description or context', async () => {
  await setup('#project/p/card/c', richCard)
  await pencil()
  expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
  expect(screen.queryByText('Сохранённое описание')).not.toBeInTheDocument()
  expect(document.querySelectorAll('.detail-text')).toHaveLength(1)
  expect(summary().getByText('Важная')).toHaveClass('card-badge-important')
  expect(summary().getByText('Срочная')).toHaveClass('card-badge-urgent')
  expect(summary().getByRole('link', { name: 'https://example.com' })).toHaveAttribute('href', 'https://example.com')
  expect(summary().getByRole('heading', { level: 1, name: 'Card' })).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Назад к доске' }).textContent).toBe('Назад к доске')
  expect(document.querySelector('.card-detail')).not.toHaveTextContent('Status')
})

it('shows no flags and a muted placeholder for a card without flags and description', async () => {
  await setup()
  await pencil()
  expect(document.querySelector('.card-badge')).toBeNull()
  expect(summary().getByText('Нет описания')).toHaveClass('muted-copy')
})

it('enters editing with focus in the name, shows flag symbols in labels, and returns focus to the pencil on cancel', async () => {
  const { user } = await setup('#project/p/card/c', richCard)
  const form = await fields(user)
  await waitFor(() => expect(form.getByLabelText('Название карточки')).toHaveFocus())
  expect(form.getByLabelText('Важная').closest('label')!.querySelector('.card-badge-important svg')).not.toBeNull()
  expect(form.getByLabelText('Срочная')).toBeChecked()
  await user.click(form.getByRole('button', { name: 'Отмена' }))
  await waitFor(() => expect(screen.getByRole('button', { name: 'Редактировать основное' })).toHaveFocus())
  expect(screen.queryByRole('form', { name: 'Редактировать основное' })).not.toBeInTheDocument()
})

it('returns to the pencil after saving and keeps editing with entered values when saving fails', async () => {
  const { repo, user } = await setup()
  let form = await fields(user)
  await user.type(form.getByLabelText('Описание карточки'), 'Changed')
  vi.spyOn(repo, 'updateCard').mockRejectedValueOnce(new Error('quota'))
  await user.click(form.getByRole('button', { name: 'Сохранить' }))
  expect(await form.findByRole('alert')).toHaveTextContent('Не удалось сохранить')
  await waitFor(() => expect(form.getByLabelText('Описание карточки')).toBeEnabled())
  expect(form.getByLabelText('Описание карточки')).toHaveValue('Changed')
  await user.click(form.getByRole('button', { name: 'Сохранить' }))
  await waitFor(() => expect(screen.queryByRole('form', { name: 'Редактировать основное' })).not.toBeInTheDocument())
  expect(summary().getByText('Changed')).toBeInTheDocument()
  await waitFor(() => expect(screen.getByRole('button', { name: 'Редактировать основное' })).toHaveFocus())
  expect((await repo.cardDetails('p', 'c'))!.card.description).toBe('Changed')
})

it('guards cancel with changes: Stay keeps editing, discard returns to the saved view', async () => {
  const { user } = await setup()
  const form = await fields(user)
  await user.type(form.getByLabelText('Название карточки'), ' edited')
  await user.click(form.getByRole('button', { name: 'Отмена' }))
  await user.click(within(await screen.findByRole('dialog', { name: 'Несохранённые изменения' })).getByRole('button', { name: 'Остаться' }))
  expect(form.getByLabelText('Название карточки')).toHaveValue('Card edited')
  await user.click(form.getByRole('button', { name: 'Отмена' }))
  await user.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Выйти без сохранения' }))
  await waitFor(() => expect(screen.getByRole('button', { name: 'Редактировать основное' })).toHaveFocus())
  expect(summary().getByRole('heading', { level: 1, name: 'Card' })).toBeInTheDocument()
})

it('saves and leaves editing from the cancel guard with the confirmed values', async () => {
  const { repo, user } = await setup()
  const form = await fields(user)
  await user.type(form.getByLabelText('Название карточки'), ' saved')
  await user.click(form.getByRole('button', { name: 'Отмена' }))
  await user.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Сохранить и выйти' }))
  expect(await summary().findByRole('heading', { level: 1, name: 'Card saved' })).toBeInTheDocument()
  await waitFor(() => expect(screen.getByRole('button', { name: 'Редактировать основное' })).toHaveFocus())
  expect((await repo.cardDetails('p', 'c'))!.card.name).toBe('Card saved')
})

it('edits the summary and a note draft independently', async () => {
  const { repo, user } = await setup()
  const form = await fields(user)
  const note = await editor(user); await user.type(note, 'Draft note')
  await user.type(form.getByLabelText('Описание карточки'), 'Text')
  await user.click(form.getByRole('button', { name: 'Отмена' }))
  await user.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Остаться' }))
  expect(note).toHaveValue('Draft note')
  await user.click(form.getByRole('button', { name: 'Сохранить' }))
  await waitFor(() => expect(screen.queryByRole('form', { name: 'Редактировать основное' })).not.toBeInTheDocument())
  expect(summary().getByText('Text')).toBeInTheDocument()
  expect(note).toHaveValue('Draft note')
  expect((await repo.cardDetails('p', 'c'))!.notes).toEqual([])
})

it('shows externally confirmed values while the summary is in view mode', async () => {
  const details: CardDetails = {
    project: { id: 'p', name: 'Project', createdAt: '2026-11-01T00:00:00Z' },
    status: { id: 's', projectId: 'p', name: 'Status', position: 0 },
    card: { id: 'c', statusId: 's', name: 'Card', description: '', important: false, urgent: false, position: 0 },
    notes: [],
  }
  const props = { details, busy: false, onReturn: vi.fn(), onCatalogue: vi.fn(), onSave: vi.fn(), onCreateNote: vi.fn(), onUpdateNote: vi.fn(), onDeleteNote: vi.fn(), registerDraftGuard: vi.fn(), requestLeave: vi.fn() }
  const { rerender } = render(<LocaleProvider><CardDetailView {...props} /></LocaleProvider>)
  rerender(<LocaleProvider><CardDetailView {...props} details={{ ...details, card: { ...details.card, name: 'Agent name', description: 'Agent text', urgent: true } }} /></LocaleProvider>)
  expect(await screen.findByRole('heading', { level: 1, name: 'Agent name' })).toBeInTheDocument()
  expect(screen.getByText('Agent text')).toBeInTheDocument()
  expect(screen.getByText('Срочная')).toBeInTheDocument()
})

it('keeps the panel header to expand and close only', async () => {
  const { user } = await setup('#project/p')
  const panel = await openPanel(user)
  const header = panel.querySelector('header')!
  expect(within(header).getAllByRole('button').map(button => button.textContent || button.getAttribute('aria-label'))).toEqual(['Открыть на всю страницу', 'Закрыть карточку'])
  expect(within(panel).queryByRole('button', { name: 'Назад к доске' })).not.toBeInTheDocument()
  expect(within(panel).getByRole('heading', { level: 2, name: 'Card' })).toBeInTheDocument()
  expect(panel).not.toHaveTextContent('Status')
  expect(panel).not.toHaveTextContent('Project')
})

it('keeps editing mode and entered values when the panel opens as a full page', async () => {
  const { user } = await setup('#project/p')
  await openPanel(user)
  const form = await fields(user)
  await user.type(form.getByLabelText('Описание карточки'), 'Typed in panel')
  await user.click(screen.getByRole('button', { name: 'Открыть на всю страницу' }))
  await screen.findByRole('button', { name: 'Назад к доске' })
  expect(screen.getByRole('form', { name: 'Редактировать основное' })).toBeInTheDocument()
  expect(screen.getByLabelText('Описание карточки')).toHaveValue('Typed in panel')
  expect(screen.getByRole('heading', { level: 1, name: 'Card' })).toBeInTheDocument()
})

const addNotes = async (repo: DexieProjectBoardRepository) => { await Promise.all(['one', 'two', 'three'].map((text, index) => repo.createNote({ id: text, cardId: 'c', text, createdAt: `2026-11-01T00:00:0${index}Z` }))) }
const shownNoteIds = () => Array.from(document.querySelectorAll<HTMLElement>('.note-list [data-note-id]')).map(note => note.dataset.noteId)
const isBefore = (a: Element, b: Element) => !!(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING)

it('shows notes newest first and switches the order without touching drafts or focus', async () => {
  const { user } = await setup('#project/p/card/c', addNotes)
  const form = await fields(user)
  expect(shownNoteIds()).toEqual(['three', 'two', 'one'])
  await user.type(form.getByLabelText('Описание карточки'), 'Pending fields')
  const draft = await editor(user); await user.type(draft, 'Pending note')
  expect(isBefore(draft, document.querySelector('.note-list')!)).toBe(true)
  const order = screen.getByRole('button', { name: 'Порядок заметок: сначала новые' })
  await user.click(order)
  await waitFor(() => expect(shownNoteIds()).toEqual(['one', 'two', 'three']))
  expect(order).toHaveAccessibleName('Порядок заметок: сначала старые')
  expect(order).toHaveFocus()
  expect(draft).toBeInTheDocument()
  expect(draft).toHaveValue('Pending note')
  expect(isBefore(document.querySelector('.note-list')!, draft)).toBe(true)
  expect(form.getByLabelText('Описание карточки')).toHaveValue('Pending fields')
  await user.keyboard('{Enter}')
  await waitFor(() => expect(shownNoteIds()).toEqual(['three', 'two', 'one']))
  expect(order).toHaveAccessibleName('Порядок заметок: сначала новые')
})

it('adds notes on the newest side of the history in both orders', async () => {
  const { user } = await setup('#project/p/card/c', addNotes); await pencil()
  await user.type(await editor(user), 'four')
  await user.click(screen.getByRole('button', { name: 'Добавить заметку' }))
  await waitFor(() => expect(document.querySelector('.note-list [data-note-id]')).toHaveTextContent('four'))
  expect(isBefore(screen.getByRole('button', { name: 'Добавить заметку' }), document.querySelector('.note-list')!)).toBe(true)
  await user.click(screen.getByRole('button', { name: 'Порядок заметок: сначала новые' }))
  await screen.findByRole('button', { name: 'Порядок заметок: сначала старые' })
  await user.type(await editor(user), 'five')
  expect(isBefore(document.querySelector('.note-list')!, screen.getByLabelText('Новая заметка'))).toBe(true)
  await user.click(screen.getByRole('button', { name: 'Добавить заметку' }))
  await waitFor(() => expect(Array.from(document.querySelectorAll('.note-list [data-note-id]')).at(-1)).toHaveTextContent('five'))
  expect(Array.from(document.querySelectorAll('.note-list [data-note-id]'), note => note.querySelector('.detail-text')?.textContent)).toEqual(['one', 'two', 'three', 'four', 'five'])
})
