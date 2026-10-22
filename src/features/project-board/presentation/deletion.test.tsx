import { cleanup, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, expect, it, vi } from 'vitest'
import { App } from '../../../app/app'
import { ProjectBoardDatabase } from '../infrastructure/indexeddb/database'
import { DexieProjectBoardRepository } from '../infrastructure/indexeddb/dexie-project-board-repository'

const databases: ProjectBoardDatabase[] = []
afterEach(async () => { cleanup(); location.hash = ''; await Promise.all(databases.splice(0).map(db => db.delete())) })
async function setup(cards = true) {
  const db = new ProjectBoardDatabase(`deletion-${crypto.randomUUID()}`)
  databases.push(db)
  const repo = new DexieProjectBoardRepository(db)
  await repo.createProject({ id: 'p', name: 'Project', createdAt: 'now' })
  await repo.createStatus({ id: 's', projectId: 'p', name: 'Status' })
  if (cards) for (const id of ['a', 'b']) await repo.createCard({ id, statusId: 's', name: 'Same', important: false, urgent: false })
  location.hash = '#project/p'
  render(<App repository={repo} />)
  await screen.findByRole('heading', { name: 'Project' })
  return { repo, user: userEvent.setup() }
}
async function openDelete(user: ReturnType<typeof userEvent.setup>, trigger: HTMLElement) {
  await user.click(trigger); await user.click(screen.getByRole('menuitem', { name: 'Удалить' }))
  return screen.getByRole('dialog')
}

it('names the selected card, cancels safely, deletes only its ID and focuses the next card', async () => {
  const { repo, user } = await setup()
  let trigger = screen.getAllByRole('button', { name: 'Действия карточки Same' })[0]
  let dialog = await openDelete(user, trigger)
  expect(within(dialog).getByText('Удалить карточку «Same»?')).toBeInTheDocument()
  expect(within(dialog).getByText(/Это действие необратимо/)).toBeInTheDocument()
  expect(within(dialog).getByRole('button', { name: 'Отмена' })).toHaveFocus()
  await user.keyboard('{Escape}')
  expect(trigger).toHaveFocus()
  expect((await repo.board('p'))!.statuses[0].cards).toHaveLength(2)
  dialog = await openDelete(user, trigger)
  await user.click(within(dialog).getByRole('button', { name: 'Удалить' }))
  await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  expect((await repo.board('p'))!.statuses[0].cards.map(card => card.id)).toEqual(['b'])
  trigger = screen.getByRole('button', { name: 'Действия карточки Same' })
  expect(trigger).toHaveFocus()
  dialog = await openDelete(user, trigger)
  await user.click(within(dialog).getByRole('button', { name: 'Удалить' }))
  await waitFor(() => expect(screen.getByRole('button', { name: 'Действия статуса Status' })).toHaveFocus())
})

it('explains nonempty status refusal and rechecks cards added while confirmation is open', async () => {
  const { repo, user } = await setup(false)
  const trigger = screen.getByRole('button', { name: 'Действия статуса Status' })
  let dialog = await openDelete(user, trigger)
  await repo.createCard({ id: 'late', statusId: 's', name: 'Late', important: false, urgent: false })
  await user.click(within(dialog).getByRole('button', { name: 'Удалить' }))
  expect(await within(dialog).findByRole('alert')).toHaveTextContent('Сначала переместите или удалите их')
  expect(within(dialog).getByRole('button', { name: 'Удалить' })).toBeDisabled()
  expect(within(dialog).getByRole('button', { name: 'Отмена' })).toHaveFocus()
  await user.keyboard('{Escape}')
  expect(trigger).toHaveFocus()
  expect((await repo.board('p'))!.statuses[0].cards).toHaveLength(1)
  cleanup(); render(<App repository={repo} />)
  await screen.findByText('Late')
  const deletion = vi.spyOn(repo, 'deleteStatus')
  dialog = await openDelete(user, screen.getByRole('button', { name: 'Действия статуса Status' }))
  expect(within(dialog).getByRole('alert')).toHaveTextContent('Сначала переместите или удалите их')
  expect(within(dialog).getByRole('button', { name: 'Удалить' })).toBeDisabled()
  expect(deletion).not.toHaveBeenCalled()
})

it.each(['card', 'status'] as const)('keeps the %s and dialog after a storage failure and permits retry', async kind => {
  const { repo, user } = await setup(kind === 'card')
  const method = kind === 'card' ? 'deleteCard' : 'deleteStatus'
  vi.spyOn(repo, method).mockRejectedValueOnce(new Error('quota'))
  const trigger = screen.getAllByRole('button', { name: kind === 'card' ? 'Действия карточки Same' : 'Действия статуса Status' })[0]
  const dialog = await openDelete(user, trigger)
  await user.click(within(dialog).getByRole('button', { name: 'Удалить' }))
  expect(await within(dialog).findByRole('alert')).toHaveTextContent('Не удалось сохранить')
  expect(trigger).toBeInTheDocument()
  expect(within(dialog).getByRole('button', { name: 'Отмена' })).toHaveFocus()
  await user.click(within(dialog).getByRole('button', { name: 'Удалить' }))
  await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  if (kind === 'status') {
    expect(screen.getByRole('heading', { name: 'Добавьте первый статус' })).toBeInTheDocument()
    await waitFor(() => expect(screen.getAllByRole('button', { name: 'Добавить статус' })[0]).toHaveFocus())
  }
})

it('translates deletion menus and dialogs and never offers project deletion', async () => {
  const { user } = await setup(false)
  await user.click(screen.getByRole('button', { name: 'Действия проекта Project' }))
  expect(screen.queryByRole('menuitem', { name: 'Удалить' })).not.toBeInTheDocument()
  await user.keyboard('{Escape}')
  await user.selectOptions(screen.getByRole('combobox', { name: 'Язык интерфейса' }), 'en')
  await user.click(screen.getByRole('button', { name: 'Status actions for Status' }))
  await user.click(screen.getByRole('menuitem', { name: 'Delete' }))
  const dialog = screen.getByRole('dialog', { name: 'Delete status' })
  expect(within(dialog).getByText('Delete status “Status”?')).toBeInTheDocument()
  expect(within(dialog).getByText(/This action is permanent/)).toBeInTheDocument()
  expect(within(dialog).getByRole('button', { name: 'Cancel' })).toHaveFocus()
})
