import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, expect, it, vi } from 'vitest'
import { App } from '../../../app/app'
import { ProjectBoardDatabase } from '../infrastructure/indexeddb/database'
import { DexieProjectBoardRepository } from '../infrastructure/indexeddb/dexie-project-board-repository'

const databases: ProjectBoardDatabase[] = []
afterEach(async () => {
  cleanup(); history.replaceState(null, '', '/'); vi.restoreAllMocks()
  await Promise.all(databases.splice(0).map(async db => { db.close(); await db.delete() }))
})
async function setup({ count = 3, board = false, populated = true, sameNames = false } = {}) {
  const db = new ProjectBoardDatabase(`project-deletion-${crypto.randomUUID()}`); databases.push(db)
  const repo = new DexieProjectBoardRepository(db)
  for (let index = 0; index < count; index++) {
    const id = ['p', 'q', 'r'][index]
    await repo.createProject({ id, name: sameNames ? 'Same' : ['First', 'Next', 'Last'][index], createdAt: `${index}` }, [], true)
    if (populated) {
      await repo.createStatus({ id: `s-${id}`, projectId: id, name: 'Status' })
      await repo.createCard({ id: `c-${id}`, statusId: `s-${id}`, name: 'Card', description: 'Details', important: false, urgent: false })
      await repo.createNote({ id: `n-${id}`, cardId: `c-${id}`, text: 'Note', createdAt: '2026-11-01T00:00:00Z' })
    }
  }
  await repo.setLastProject()
  history.replaceState(null, '', board ? '/#project/p' : '/')
  render(<App repository={repo} />)
  await screen.findByRole('heading', { name: board ? (sameNames ? 'Same' : 'First') : 'Трекер личных проектов', level: 1 })
  return { repo, db, user: userEvent.setup() }
}
async function openCatalogueDeletion(user: ReturnType<typeof userEvent.setup>, id = 'p') {
  const project = document.querySelector<HTMLElement>(`[data-project-id="${id}"]`)!
  const trigger = within(project).getByRole('button', { name: /^Действия проекта/ })
  await user.click(trigger)
  await user.click(screen.getByRole('menuitem', { name: 'Удалить проект' }))
  return { trigger, dialog: screen.getByRole('dialog', { name: 'Удалить проект' }) }
}
async function openBoardDeletion(user: ReturnType<typeof userEvent.setup>) {
  const trigger = screen.getByRole('button', { name: 'Настройки' })
  await user.click(trigger)
  await user.click(screen.getByRole('button', { name: 'Удалить проект' }))
  expect(document.querySelector('.settings-panel')).not.toBeInTheDocument()
  return { trigger, dialog: screen.getByRole('dialog', { name: 'Удалить проект' }) }
}

it('reads catalogue summary without opening or remembering the project, and cancels to the same menu', async () => {
  const { repo, user } = await setup()
  const remember = vi.spyOn(repo, 'setLastProject')
  const before = await repo.preference()
  const { trigger, dialog } = await openCatalogueDeletion(user)
  expect(within(dialog).getByRole('button', { name: 'Отмена' })).toHaveFocus()
  expect(await within(dialog).findByText('Статусов: 1. Карточек: 1.')).toBeInTheDocument()
  expect(within(dialog).getByText('Удалить проект «First»?')).toBeInTheDocument()
  expect(within(dialog).getByText(/Все статусы, карточки и их заметки/)).toBeInTheDocument()
  expect(within(dialog).queryByRole('textbox')).not.toBeInTheDocument()
  expect(location.hash).toBe('')
  expect(await repo.preference()).toEqual(before)
  expect(remember).not.toHaveBeenCalled()
  await user.keyboard('{Escape}')
  expect(trigger).toHaveFocus()
  expect(await repo.projects()).toHaveLength(3)
  await user.click(screen.getByRole('button', { name: 'Настройки' }))
  expect(screen.queryByRole('button', { name: 'Удалить проект' })).not.toBeInTheDocument()
})

it('prevents deletion until its summary loads and permits retrying a failed summary', async () => {
  const { repo, user } = await setup({ populated: false })
  let reject!: (error: Error) => void
  vi.spyOn(repo, 'board').mockImplementationOnce(() => new Promise((_resolve, no) => { reject = no }))
  const deletion = vi.spyOn(repo, 'deleteProject')
  const { dialog } = await openCatalogueDeletion(user)
  expect(within(dialog).getByRole('status')).toHaveTextContent('Загружаем содержимое')
  expect(within(dialog).getByRole('button', { name: 'Удалить проект' })).toBeDisabled()
  await act(async () => reject(Error('read failed')))
  expect(within(dialog).getByRole('alert')).toHaveTextContent('Не удалось загрузить')
  expect(deletion).not.toHaveBeenCalled()
  await user.click(within(dialog).getByRole('button', { name: 'Повторить' }))
  expect(await within(dialog).findByText('Статусов: 0. Карточек: 0.')).toBeInTheDocument()
  expect(within(dialog).getByRole('button', { name: 'Удалить проект' })).toBeEnabled()
  await user.keyboard('{Escape}')
  expect(deletion).not.toHaveBeenCalled()
})

it('ignores a cancelled summary that finishes after another project was selected', async () => {
  const { repo, user } = await setup()
  const oldBoard = await repo.board('p')
  await repo.createStatus({ id: 'extra', projectId: 'q', name: 'Extra' })
  let finish!: (board: typeof oldBoard) => void
  vi.spyOn(repo, 'board').mockImplementationOnce(() => new Promise(resolve => { finish = resolve }))
  await openCatalogueDeletion(user, 'p'); await user.keyboard('{Escape}')
  const { dialog } = await openCatalogueDeletion(user, 'q')
  expect(await within(dialog).findByText('Статусов: 2. Карточек: 1.')).toBeInTheDocument()
  await act(async () => finish(oldBoard))
  expect(within(dialog).getByText('Статусов: 2. Карточек: 1.')).toBeInTheDocument()
  expect(within(dialog).getByText('Удалить проект «Next»?')).toBeInTheDocument()
})

it('deletes a selected ID with an identical name and focuses the next, previous and finally create control', async () => {
  const { repo, db, user } = await setup({ sameNames: true })
  for (const [id, next] of [['q', 'r'], ['r', 'p'], ['p', null]] as const) {
    const { dialog } = await openCatalogueDeletion(user, id)
    await within(dialog).findByText('Статусов: 1. Карточек: 1.')
    await user.click(within(dialog).getByRole('button', { name: 'Удалить проект' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    const target = next ? document.querySelector(`[data-project-id="${next}"] .project-open`) : screen.getByRole('button', { name: 'Создать проект' })
    await waitFor(() => expect(target).toHaveFocus())
    expect(await repo.board(id)).toBeUndefined()
    expect(await db.notes.get(`n-${id}`)).toBeUndefined()
    expect(location.hash).toBe('')
  }
  expect(await repo.projects()).toHaveLength(0)
  expect(screen.getByRole('heading', { name: 'Начните с первого проекта' })).toBeInTheDocument()
})

it('deletes from board settings and changes only the route after the atomic preference cleanup', async () => {
  const { repo, db, user } = await setup({ count: 1, board: true })
  const remember = vi.spyOn(repo, 'setLastProject')
  const { trigger, dialog } = await openBoardDeletion(user)
  expect(within(dialog).getByRole('button', { name: 'Отмена' })).toHaveFocus()
  expect(document.querySelector('.app-bar')).toHaveAttribute('inert')
  await user.keyboard('{Escape}'); expect(trigger).toHaveFocus()
  await openBoardDeletion(user)
  await user.click(screen.getByRole('button', { name: 'Удалить проект' }))
  expect(await screen.findByRole('heading', { name: 'Начните с первого проекта' })).toBeInTheDocument()
  await waitFor(() => expect(screen.getByRole('button', { name: 'Создать проект' })).toHaveFocus())
  expect(location.hash).toBe('')
  expect(await db.notes.count()).toBe(0)
  expect((await repo.preference())?.lastProjectId).toBeUndefined()
  // The only preference write belongs to the repository's cascade transaction.
  expect(remember).toHaveBeenCalledExactlyOnceWith()
  cleanup(); render(<App repository={repo} />)
  expect(await screen.findByRole('heading', { name: 'Начните с первого проекта' })).toBeInTheDocument()
  expect(location.hash).toBe('')
})

it('retains a failed board deletion and retries once without a second concurrent dispatch', async () => {
  const { repo, user } = await setup({ board: true })
  const before = await repo.board('p'), preference = await repo.preference()
  let reject!: (error: Error) => void
  const remove = vi.spyOn(repo, 'deleteProject').mockImplementationOnce(() => new Promise((_resolve, no) => { reject = no }))
  const { dialog } = await openBoardDeletion(user)
  const confirm = within(dialog).getByRole('button', { name: 'Удалить проект' })
  fireEvent.click(confirm); fireEvent.click(confirm)
  await waitFor(() => expect(remove).toHaveBeenCalledOnce())
  expect(confirm).toBeDisabled()
  await user.keyboard('{Escape}')
  expect(dialog).toBeInTheDocument()
  await act(async () => reject(Error('quota')))
  expect(within(dialog).getByRole('alert')).toHaveTextContent('Не удалось сохранить')
  expect(within(dialog).getByRole('button', { name: 'Отмена' })).toHaveFocus()
  expect(await repo.board('p')).toEqual(before)
  expect(await repo.preference()).toEqual(preference)
  expect(location.hash).toBe('#project/p')
  await user.click(confirm)
  await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  expect(remove).toHaveBeenCalledTimes(2)
  expect(await repo.board('p')).toBeUndefined()
})

it('shows storage unavailability after a committed deletion with a failed refresh and never offers to repeat deletion', async () => {
  const { repo, user } = await setup({ board: true })
  const remove = vi.spyOn(repo, 'deleteProject')
  vi.spyOn(repo, 'projects').mockRejectedValueOnce(Error('read failed'))
  await openBoardDeletion(user)
  await user.click(screen.getByRole('button', { name: 'Удалить проект' }))
  expect(await screen.findByRole('heading', { name: 'Рабочая доска недоступна' })).toBeInTheDocument()
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  expect(screen.getByRole('alert')).toHaveTextContent('Локальное хранилище недоступно')
  expect(screen.queryByText(/Не удалось сохранить/)).not.toBeInTheDocument()
  expect(remove).toHaveBeenCalledOnce()
  expect(location.hash).toBe('')
  expect(await repo.board('p')).toBeUndefined()
  cleanup(); render(<App repository={repo} />)
  expect(await screen.findByRole('button', { name: 'Next' })).toBeInTheDocument()
  expect(remove).toHaveBeenCalledOnce()
})

it('does not expose project deletion in card-page language settings', async () => {
  const { repo, user } = await setup({ board: true })
  await user.click(screen.getByRole('link', { name: 'Card' }))
  await screen.findByRole('button', { name: 'Редактировать основное' })
  await user.click(screen.getByRole('button', { name: 'Открыть на всю страницу' }))
  await user.click(screen.getByRole('button', { name: 'Настройки' }))
  expect(screen.getByRole('combobox', { name: 'Язык приложения' })).toBeInTheDocument()
  expect(screen.queryByRole('button', { name: 'Удалить проект' })).not.toBeInTheDocument()
  expect((await repo.cardDetails('p', 'c-p'))?.notes).toHaveLength(1)
})
