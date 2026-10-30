import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, expect, it, vi } from 'vitest'
import { ProjectBoardView } from './project-board-view'
import type { ProjectBoard } from '../domain/model'

// Menu renders reveal renders of their owning columns/cards without replacing
// those components or introducing an artificial memo boundary in the test.
const menuRenders = vi.hoisted(() => vi.fn())
vi.mock('./controls', async importOriginal => {
  const original = await importOriginal<typeof import('./controls')>()
  return {
    ...original,
    ActionMenu: (props: Parameters<typeof original.ActionMenu>[0]) => {
      menuRenders(props.label)
      return <original.ActionMenu {...props} />
    },
  }
})
afterEach(cleanup)

it('isolates board dialogs, column dialogs and a card move dialog from unchanged cards and columns', async () => {
  const board: ProjectBoard = {
    id: 'p', name: 'Project', createdAt: 'now',
    statuses: ['A', 'B'].map((name, position) => ({
      id: name, name, projectId: 'p', position,
      cards: [{ id: `card-${name}`, statusId: name, name: `Card ${name}`, position: 0, important: false, urgent: false }],
    })),
  }
  const user = userEvent.setup()
  render(<ProjectBoardView board={board} saveError={false}
    onReturn={vi.fn()} onRenameProject={vi.fn()} onCreateStatus={vi.fn()}
    onRenameStatus={vi.fn()} onMoveStatus={vi.fn()} onCreateCard={vi.fn()}
    onUpdateCard={vi.fn()} onDeleteCard={vi.fn()} onDeleteStatus={vi.fn()} onMoveCard={vi.fn()}
  />)
  const renders = (label: string) => menuRenders.mock.calls.filter(([name]) => name === label).length
  const openAction = async (trigger: string, action: string) => {
    await user.click(screen.getByRole('button', { name: trigger }))
    await user.click(screen.getByRole('menuitem', { name: action }))
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  }
  const expectUnchangedBoard = () => {
    for (const name of ['A', 'B']) {
      expect(renders(`Действия статуса ${name}`)).toBe(0)
      expect(renders(`Действия карточки Card ${name}`)).toBe(0)
    }
  }

  for (const name of ['A', 'B']) {
    expect(renders(`Действия статуса ${name}`)).toBeGreaterThan(0)
    expect(renders(`Действия карточки Card ${name}`)).toBeGreaterThan(0)
  }
  menuRenders.mockClear()
  await openAction('Действия проекта Project', 'Переименовать')
  await user.keyboard('{Escape}')
  expectUnchangedBoard()
  await user.click(screen.getByRole('button', { name: 'Добавить статус' }))
  await user.keyboard('{Escape}')
  expectUnchangedBoard()

  // Column-local dialogs may render their own column, but never its cards.
  for (const action of ['rename', 'create']) {
    menuRenders.mockClear()
    if (action === 'rename') await openAction('Действия статуса A', 'Переименовать')
    else await user.click(screen.getAllByRole('button', { name: 'Добавить карточку' })[0])
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    await user.keyboard('{Escape}')
    expect(renders('Действия статуса A')).toBeGreaterThan(0)
    expect(renders('Действия статуса B')).toBe(0)
    expect(renders('Действия карточки Card A')).toBe(0)
    expect(renders('Действия карточки Card B')).toBe(0)
  }

  for (const trigger of ['Действия карточки Card A', 'Действия статуса A']) {
    menuRenders.mockClear()
    await openAction(trigger, 'Удалить')
    await user.keyboard('{Escape}')
    expectUnchangedBoard()
  }

  menuRenders.mockClear()
  await openAction('Действия карточки Card A', 'Переместить в…')
  await user.keyboard('{Escape}')
  expect(renders('Действия карточки Card A')).toBeGreaterThan(0)
  expect(renders('Действия карточки Card B')).toBe(0)
  expect(renders('Действия статуса A')).toBe(0)
  expect(renders('Действия статуса B')).toBe(0)
})
