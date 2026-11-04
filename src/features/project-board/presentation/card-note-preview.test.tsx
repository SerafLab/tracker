import { cleanup, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, expect, it, vi } from 'vitest'
import { App } from '../../../app/app'
import { ProjectBoardDatabase } from '../infrastructure/indexeddb/database'
import { DexieProjectBoardRepository } from '../infrastructure/indexeddb/dexie-project-board-repository'

vi.mock('virtual:pwa-register/react', () => ({ useRegisterSW: () => ({ needRefresh: [false, vi.fn()], offlineReady: [false, vi.fn()], updateServiceWorker: vi.fn() }) }))

const databases: ProjectBoardDatabase[] = []
afterEach(async () => { cleanup(); history.replaceState(null, '', '/'); await Promise.all(databases.splice(0).map(db => db.delete())) })

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
const toggle = () => within(card()).queryByRole('button', { name: 'Последние заметки' })
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

it('expands four notes in creation order without repeating the last, and collapses again', async () => {
  const { user } = await setup(['one', 'two', 'three', 'four'])
  expect(shown()).toEqual(['four'])
  expect(toggle()).toHaveAttribute('aria-expanded', 'false')
  await user.click(toggle()!)
  expect(toggle()).toHaveAttribute('aria-expanded', 'true')
  expect(shown()).toEqual(['one', 'two', 'three', 'four'])
  expect(toggle()).toHaveAttribute('aria-controls', card().querySelector('.card-note-list')!.id)
  expect(location.hash).toBe('#project/p')
  await user.click(toggle()!)
  expect(shown()).toEqual(['four'])
  expect(toggle()).toHaveAttribute('aria-expanded', 'false')
})

it('shows only the five newest of six notes when expanded', async () => {
  const { user } = await setup(['1', '2', '3', '4', '5', '6'])
  await user.click(toggle()!)
  expect(shown()).toEqual(['2', '3', '4', '5', '6'])
})

it('toggles by keyboard without opening the card or the actions menu', async () => {
  const { user } = await setup(['old', 'new'])
  toggle()!.focus()
  await user.keyboard('{Enter}')
  expect(shown()).toEqual(['old', 'new'])
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
  expect(shown()).toEqual(['old', 'newest', 'Unsaved text'])
})
