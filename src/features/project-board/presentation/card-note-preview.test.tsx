import { cleanup, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, expect, it, vi } from 'vitest'
import { App } from '../../../app/app'
import { ProjectBoardDatabase } from '../infrastructure/indexeddb/database'
import { DexieProjectBoardRepository } from '../infrastructure/indexeddb/dexie-project-board-repository'
import { noteOrderStorageKey } from './note-order'

vi.mock('virtual:pwa-register/react', () => ({ useRegisterSW: () => ({ needRefresh: [false, vi.fn()], offlineReady: [false, vi.fn()], updateServiceWorker: vi.fn() }) }))

const databases: ProjectBoardDatabase[] = []
afterEach(async () => { cleanup(); localStorage.removeItem(noteOrderStorageKey); history.replaceState(null, '', '/'); await Promise.all(databases.splice(0).map(db => db.delete())) })

async function setup(noteTexts: string[] = []) {
  const db = new ProjectBoardDatabase(`preview-${crypto.randomUUID()}`); databases.push(db)
  const repo = new DexieProjectBoardRepository(db)
  await repo.createProject({ id: 'p', name: 'Project', createdAt: '2026-11-01T00:00:00Z' }, [], true)
  await repo.createStatus({ id: 's', projectId: 'p', name: 'Status' })
  await repo.createCard({ id: 'c', statusId: 's', name: 'Card', description: 'Описание карточки', important: false, urgent: false })
  for (const [index, text] of noteTexts.entries()) await repo.createNote({ id: `n${index}`, cardId: 'c', text, createdAt: `2020-01-02T00:00:0${index}Z` })
  history.replaceState(null, '', '/#project/p')
  render(<App repository={repo} />)
  await screen.findByRole('link', { name: 'Card' })
  return { repo, user: userEvent.setup() }
}
const card = () => screen.getByRole('link', { name: 'Card' }).closest('li')!
const toggle = () => within(card()).queryByRole('button', { name: 'Последние заметки: Card' })
const shown = () => within(card()).queryAllByRole('listitem').map(item => item.textContent)

it('shows no notes block or toggle for a card without notes, keeping the description preview', async () => {
  await setup()
  expect(card().querySelector('.card-notes')).toBeNull()
  expect(toggle()).toBeNull()
  expect(within(card()).getByText('Описание карточки')).toBeInTheDocument()
})

it('shows one long multi-line note as plain text with an unlinked URL and no toggle', async () => {
  const text = 'Первая строка\nВторая https://example.com/very/long/path строка\n' + 'длинное '.repeat(40)
  await setup([text])
  const preview = card().querySelector('.card-note')!
  expect(preview.textContent).toBe(text)
  expect(card().querySelector('.card-notes a')).toBeNull()
  expect(toggle()).toBeNull()
  expect(within(card()).getByText('Описание карточки')).toBeInTheDocument()
})

it('expands four notes newest first by default without repeating the last, and collapses again', async () => {
  const { user } = await setup(['one', 'two', 'three', 'four'])
  expect(shown()).toEqual(['four'])
  expect(toggle()).toHaveAttribute('aria-expanded', 'false')
  expect(toggle()).toHaveTextContent(/^$/)
  expect(toggle()!.querySelector('svg')).not.toBeNull()
  expect(toggle()).toHaveAttribute('data-hint', 'Показать заметки')
  await user.click(toggle()!)
  expect(toggle()).toHaveAttribute('aria-expanded', 'true')
  expect(toggle()).toHaveAttribute('data-hint', 'Свернуть заметки')
  expect(shown()).toEqual(['four', 'three', 'two', 'one'])
  expect(toggle()).toHaveAttribute('aria-controls', card().querySelector('.card-note-list')!.id)
  expect(location.hash).toBe('#project/p')
  await user.click(toggle()!)
  expect(shown()).toEqual(['four'])
  expect(toggle()).toHaveAttribute('aria-expanded', 'false')
})

it('shows only the five newest of six notes when expanded', async () => {
  const { user } = await setup(['1', '2', '3', '4', '5', '6'])
  await user.click(toggle()!)
  expect(shown()).toEqual(['6', '5', '4', '3', '2'])
})

it('expands notes oldest first when that order is stored, keeping the newest when collapsed', async () => {
  localStorage.setItem(noteOrderStorageKey, 'oldest')
  const { user } = await setup(['one', 'two', 'three'])
  expect(shown()).toEqual(['three'])
  await user.click(toggle()!)
  expect(shown()).toEqual(['one', 'two', 'three'])
})

it('reorders expanded board notes as soon as the order changes in the open card panel', async () => {
  const { user } = await setup(['one', 'two', 'three'])
  await user.click(toggle()!)
  expect(shown()).toEqual(['three', 'two', 'one'])
  await user.click(screen.getByRole('link', { name: 'Card' }))
  const panel = await screen.findByRole('region', { name: 'Подробности карточки' })
  await user.click(within(panel).getByRole('button', { name: 'Порядок заметок: сначала новые' }))
  await within(panel).findByRole('button', { name: 'Порядок заметок: сначала старые' })
  expect(shown()).toEqual(['one', 'two', 'three'])
  expect(localStorage.getItem(noteOrderStorageKey)).toBe('oldest')
})

it('toggles by keyboard without opening the card or the actions menu', async () => {
  const { user } = await setup(['old', 'new'])
  toggle()!.focus()
  await user.keyboard('{Enter}')
  expect(shown()).toEqual(['new', 'old'])
  await user.keyboard(' ')
  expect(shown()).toEqual(['new'])
  expect(location.hash).toBe('#project/p')
  expect(screen.queryByRole('region', { name: 'Подробности карточки' })).toBeNull()
  expect(screen.queryByRole('menu')).toBeNull()
  expect(within(card()).getByRole('button', { name: 'Действия карточки Card' })).toHaveAttribute('aria-expanded', 'false')
})

it('reflects only confirmed note add, edit and delete after the board snapshot refreshes', async () => {
  const { repo, user } = await setup(['old', 'newest'])
  await user.click(screen.getByRole('link', { name: 'Card' }))
  await screen.findByRole('region', { name: 'Подробности карточки' })
  await user.click(screen.getByRole('button', { name: 'Добавить заметку' }))
  const field = screen.getByLabelText('Новая заметка')
  vi.spyOn(repo, 'createNote').mockRejectedValueOnce(new Error('quota'))
  await user.type(field, 'Unsaved text')
  await user.click(screen.getByRole('button', { name: 'Добавить заметку' }))
  expect((await screen.findAllByRole('alert')).map(a => a.textContent).join(' ')).toContain('Заметка не сохранена')
  expect(shown()).toEqual(['newest'])
  await user.click(screen.getByRole('button', { name: 'Добавить заметку' }))
  await waitFor(() => expect(shown()).toEqual(['Unsaved text']))
  expect(toggle()).not.toBeNull()
  await user.click(toggle()!)
  expect(shown()).toEqual(['Unsaved text', 'newest', 'old'])
})

it('keeps the local expand toggle enabled and focused while a board write is pending', async () => {
  const { ProjectBoardView } = await import('./project-board-view')
  const board = { id: 'p', name: 'Project', createdAt: 'now', recentNotes: { c: [{ id: 'a', cardId: 'c', text: 'old', createdAt: '1' }, { id: 'b', cardId: 'c', text: 'new', createdAt: '2' }] },
    statuses: [{ id: 's', name: 'S', projectId: 'p', position: 0, cards: [{ id: 'c', statusId: 's', name: 'Card', position: 0, description: '', important: false, urgent: false }] }] }
  const props = { onApplyStatusSet: async () => 'saved' as const, onDeleteProject: async () => true, saveError: false, placementPending: false, refreshFailed: false, onRetryRefresh: vi.fn(), focusCreation: false, onCreationFocused: vi.fn(), onReturn: vi.fn(), onRenameProject: vi.fn(), onCreateStatus: vi.fn(), onRenameStatus: vi.fn(), onMoveStatus: vi.fn(), onCreateCard: vi.fn(), onOpenCard: vi.fn(), onDeleteCard: vi.fn(), onDeleteStatus: vi.fn(), onMoveCard: vi.fn() }
  const view = (busy: boolean) => <ProjectBoardView {...props} board={board} busy={busy} />
  const { rerender } = render(view(false))
  const button = screen.getByRole('button', { name: 'Последние заметки: Card' })
  button.focus()
  rerender(view(true))
  expect(button).toBeEnabled()
  expect(button).toHaveFocus()
  await userEvent.setup().keyboard('{Enter}')
  expect(button).toHaveAttribute('aria-expanded', 'true')
})
