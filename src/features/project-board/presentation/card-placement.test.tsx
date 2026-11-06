import { cleanup, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, expect, it, vi } from 'vitest'
import { App } from '../../../app/app'
import { DexieProjectBoardRepository } from '../infrastructure/indexeddb/dexie-project-board-repository'
import { ProjectBoardDatabase } from '../infrastructure/indexeddb/database'

const databases: ProjectBoardDatabase[] = []
afterEach(async () => { cleanup(); history.replaceState(null, '', '/'); await Promise.all(databases.splice(0).map(db => db.delete())) })
async function setup(locale = 'ru') {
  localStorage.setItem('easytrack.locale', locale)
  const db = new ProjectBoardDatabase(`placement-${crypto.randomUUID()}`); databases.push(db)
  const repo = new DexieProjectBoardRepository(db)
  await repo.createProject({ id: 'p', name: 'Project', createdAt: 'now' }, [], true)
  await repo.createStatus({ id: 's', projectId: 'p', name: 'Only status' })
  for (const [id, important, urgent] of [['Both', true, true], ['First', true, false], ['Middle', true, false], ['Last', true, false], ['None', false, false]] as const) await repo.createCard({ id, statusId: 's', name: id, description: '', important, urgent })
  history.replaceState(null, '', '/#project/p')
  render(<App repository={repo} />)
  await screen.findByRole('heading', { name: 'Project' })
  return { repo, user: userEvent.setup() }
}
const names = () => Array.from(document.querySelectorAll('.card-name')).map(element => element.textContent)
/** The transient notification slot of the app-wide notification area. */
const toast = () => document.querySelector<HTMLElement>('.notification-transient')!

it.each(['ru', 'en'])('offers only available within-group steps in %s and restores focus after reordering', async locale => {
  const { user } = await setup(locale), en = locale === 'en'
  const menu = (name: string) => screen.getByRole('button', { name: en ? `Card actions for ${name}` : `Действия карточки ${name}` })
  for (const [name, up, down] of [['Both', false, false], ['First', false, true], ['Middle', true, true], ['Last', true, false], ['None', false, false]] as const) {
    await user.click(menu(name))
    expect(!!screen.queryByRole('menuitem', { name: en ? 'Move up' : 'Поднять выше' })).toBe(up)
    expect(!!screen.queryByRole('menuitem', { name: en ? 'Move down' : 'Опустить ниже' })).toBe(down)
    expect(screen.queryByRole('menuitem', { name: en ? 'Move to…' : 'Переместить в…' })).not.toBeInTheDocument()
    await user.keyboard('{Escape}')
  }
  await user.click(menu('Middle')); await user.click(screen.getByRole('menuitem', { name: en ? 'Move up' : 'Поднять выше' }))
  await waitFor(() => expect(names()).toEqual(['Both', 'Middle', 'First', 'Last', 'None']))
  expect(menu('Middle')).toHaveFocus()
  await waitFor(() => expect(toast()).toHaveTextContent(en ? 'Card placement saved.' : 'Расположение карточки сохранено.'))
  expect(document.querySelector('.placement-status')).not.toBeInTheDocument()
  expect(location.hash).toBe('#project/p')
})

it('preserves the confirmed board after refresh failure, blocks conflicting actions, and retries only reading', async () => {
  const { repo, user } = await setup()
  const committed = vi.spyOn(repo, 'moveCard')
  vi.spyOn(repo, 'board').mockRejectedValueOnce(new Error('refresh unavailable'))
  await user.click(screen.getByRole('button', { name: 'Действия карточки First' }))
  await user.click(screen.getByRole('menuitem', { name: 'Опустить ниже' }))
  expect(await screen.findByRole('alert')).toHaveTextContent('Расположение сохранено, но не удалось обновить доску')
  // Board errors stay outside the board scroller, between the bar and the board.
  expect(screen.getByRole('alert').closest('.board-alerts')).not.toBeNull()
  expect(screen.getByRole('alert').closest('[data-board-scroller]')).toBeNull()
  expect(names()).toEqual(['Both', 'First', 'Middle', 'Last', 'None'])
  expect(screen.getByRole('button', { name: 'Действия карточки First' })).toBeDisabled()
  expect(screen.getByRole('button', { name: 'Добавить статус' })).toBeDisabled()
  expect(document.querySelector('.status-columns')).toHaveAttribute('inert')
  await user.click(screen.getByRole('button', { name: 'Настройки' }))
  expect(screen.getByRole('menuitem', { name: 'Удалить проект' })).toBeDisabled()
  await user.keyboard('{Escape}')
  await user.click(within(screen.getByRole('alert')).getByRole('button', { name: 'Обновить доску' }))
  await waitFor(() => expect(names()).toEqual(['Both', 'Middle', 'First', 'Last', 'None']))
  // The toast and the restored focus follow the refreshed board, so wait for each of them.
  await waitFor(() => expect(toast()).toHaveTextContent('Расположение карточки сохранено.'))
  await waitFor(() => expect(screen.getByRole('button', { name: 'Действия карточки First' })).toHaveFocus())
  expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  expect(committed).toHaveBeenCalledOnce()
})

it('keeps catalogue navigation after reload while a placement commit is pending', async () => {
  const { repo, user } = await setup()
  let finish!: () => void
  const pending = new Promise<void>(resolve => { finish = resolve }), actual = repo.moveCard.bind(repo)
  let committed: ReturnType<typeof actual> | undefined
  vi.spyOn(repo, 'moveCard').mockImplementation((...args) => {
    committed = pending.then(() => actual(...args))
    return committed
  })
  await waitFor(async () => expect((await repo.preference())?.lastProjectId).toBe('p'))
  await user.click(screen.getByRole('button', { name: 'Действия карточки First' }))
  await user.click(screen.getByRole('menuitem', { name: 'Опустить ниже' }))
  expect(document.querySelector('.status-columns')).toHaveAttribute('inert')
  expect(document.body).not.toHaveTextContent('Сохраняем расположение карточки')
  expect(toast()).toBeEmptyDOMElement()
  await user.click(screen.getByRole('button', { name: /Все проекты/ }))
  await screen.findByRole('heading', { name: 'Трекер личных проектов' })
  await waitFor(async () => expect((await repo.preference())?.lastProjectId).toBeUndefined())
  finish(); await committed
  cleanup()
  render(<App repository={repo} />)
  expect(await screen.findByRole('heading', { name: 'Трекер личных проектов' })).toBeInTheDocument()
  expect(screen.queryByRole('heading', { name: 'Project' })).not.toBeInTheDocument()
  expect(location.hash).toBe('')
})

it.each(['ru', 'en'])('announces an unchanged placement as a toast in %s', async locale => {
  const { repo, user } = await setup(locale), en = locale === 'en'
  vi.spyOn(repo, 'moveCard').mockResolvedValueOnce('unchanged')
  await user.click(screen.getByRole('button', { name: en ? 'Card actions for First' : 'Действия карточки First' }))
  await user.click(screen.getByRole('menuitem', { name: en ? 'Move down' : 'Опустить ниже' }))
  await waitFor(() => expect(toast()).toHaveTextContent(en ? 'Card placement did not change.' : 'Расположение карточки не изменилось.'))
  expect(screen.queryByRole('alert')).not.toBeInTheDocument()
})

it('reports a rejected placement only through the save-error alert', async () => {
  const { repo, user } = await setup()
  vi.spyOn(repo, 'moveCard').mockRejectedValueOnce(new Error('quota'))
  await user.click(screen.getByRole('button', { name: 'Действия карточки First' }))
  await user.click(screen.getByRole('menuitem', { name: 'Опустить ниже' }))
  expect(await screen.findByRole('alert')).toHaveTextContent('Не удалось сохранить изменения')
  expect(screen.getByRole('alert').closest('.board-alerts')).not.toBeNull()
  expect(screen.getByRole('alert').closest('[data-board-scroller]')).toBeNull()
  expect(names()).toEqual(['Both', 'First', 'Middle', 'Last', 'None'])
  expect(toast()).toBeEmptyDOMElement()
  expect(screen.getAllByText(/Не удалось сохранить изменения/)).toHaveLength(1)
})
