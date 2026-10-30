import { act, cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { App } from './app'
import type { ProjectBoardRepository } from '../features/project-board'

const project = { id: 'a', name: 'Project A', createdAt: 'now' }
const board = { ...project, statuses: [] }
function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>(yes => { resolve = yes })
  return { promise, resolve }
}
function repository(overrides: Partial<ProjectBoardRepository> = {}) {
  return {
    open: vi.fn().mockResolvedValue(undefined), projects: vi.fn().mockResolvedValue([project]),
    preference: vi.fn().mockResolvedValue(undefined), setLastProject: vi.fn().mockResolvedValue(undefined),
    board: vi.fn().mockResolvedValue(board), ...overrides,
  } as unknown as ProjectBoardRepository
}
async function hash(value: string) {
  await act(async () => { location.hash = value })
  // Let the browser deliver its queued hashchange event.
  await waitFor(() => expect(location.hash).toBe(value))
}
beforeEach(() => { history.replaceState(null, '', '/') })
afterEach(() => { cleanup(); history.replaceState(null, '', '/') })

it('loads each selected project and catalogue once', async () => {
  const repo = repository()
  const user = userEvent.setup()
  render(<App repository={repo} />)
  await user.click(await screen.findByRole('button', { name: project.name }))
  await screen.findByRole('heading', { name: project.name })
  expect(repo.board).toHaveBeenCalledExactlyOnceWith(project.id)
  vi.mocked(repo.projects).mockClear()
  await user.click(screen.getByRole('button', { name: /Все проекты/ }))
  await screen.findByRole('button', { name: project.name })
  expect(repo.projects).toHaveBeenCalledOnce()
})

it('restores the last project with one board read', async () => {
  const repo = repository({ preference: vi.fn().mockResolvedValue({ id: 'workspace', lastProjectId: 'a' }) })
  render(<App repository={repo} />)
  await screen.findByRole('heading', { name: project.name })
  expect(location.hash).toBe('#project/a')
  expect(repo.board).toHaveBeenCalledExactlyOnceWith('a')
  expect(repo.projects).not.toHaveBeenCalled()
})

it('does not restore the last project when navigating back to an empty hash', async () => {
  history.replaceState(null, '', '/#project/a')
  const repo = repository({ preference: vi.fn().mockResolvedValue({ id: 'workspace', lastProjectId: 'a' }) })
  render(<App repository={repo} />)
  await screen.findByRole('heading', { name: project.name })
  await hash('')
  await screen.findByRole('button', { name: project.name })
  expect(repo.preference).not.toHaveBeenCalled()
  expect(location.hash).toBe('')
})

it('ignores an outdated missing board without resetting a newer route', async () => {
  const pending = deferred<undefined>()
  history.replaceState(null, '', '/#project/missing')
  const repo = repository({ board: vi.fn().mockReturnValueOnce(pending.promise).mockResolvedValue(board) })
  render(<App repository={repo} />)
  await waitFor(() => expect(repo.board).toHaveBeenCalledWith('missing'))
  await hash('#project/a')
  await screen.findByRole('heading', { name: project.name })
  await act(async () => { pending.resolve(undefined) })
  expect(location.hash).toBe('#project/a')
  expect(screen.getByRole('heading', { name: project.name })).toBeInTheDocument()
  expect(repo.projects).not.toHaveBeenCalled()
})

it('uses the latest route when storage finishes opening', async () => {
  const pending = deferred<void>()
  const repo = repository({ open: vi.fn(() => pending.promise) })
  render(<App repository={repo} />)
  await hash('#project/a')
  await act(async () => { pending.resolve() })
  await screen.findByRole('heading', { name: project.name })
  expect(repo.board).toHaveBeenCalledExactlyOnceWith('a')
  expect(repo.projects).not.toHaveBeenCalled()
})

it('ignores a startup preference read superseded by navigation', async () => {
  const pending = deferred<{ id: 'workspace'; lastProjectId: string }>()
  const repo = repository({ preference: vi.fn(() => pending.promise) })
  render(<App repository={repo} />)
  await waitFor(() => expect(repo.preference).toHaveBeenCalledOnce())
  await hash('#project/a')
  await screen.findByRole('heading', { name: project.name })
  await act(async () => { pending.resolve({ id: 'workspace', lastProjectId: 'old' }) })
  expect(location.hash).toBe('#project/a')
  expect(repo.board).toHaveBeenCalledExactlyOnceWith('a')
})

it('opens the catalogue for a malformed encoded project route', async () => {
  history.replaceState(null, '', '/#project/%')
  const repo = repository()
  render(<App repository={repo} />)
  await screen.findByRole('button', { name: project.name })
  expect(repo.board).not.toHaveBeenCalled()
})


it('keeps a new hash set before the previous missing-board continuation runs', async () => {
  const pending = deferred<undefined>()
  history.replaceState(null, '', '/#project/missing')
  const repo = repository({ board: vi.fn().mockReturnValueOnce(pending.promise).mockResolvedValue(board) })
  render(<App repository={repo} />)
  await waitFor(() => expect(repo.board).toHaveBeenCalledWith('missing'))
  await act(async () => {
    location.hash = '#project/a'
    pending.resolve(undefined)
  })
  await screen.findByRole('heading', { name: project.name })
  expect(location.hash).toBe('#project/a')
  expect(repo.projects).not.toHaveBeenCalled()
})

it('keeps a new hash set before the previous preference continuation runs', async () => {
  const pending = deferred<{ id: 'workspace'; lastProjectId: string }>()
  const repo = repository({ preference: vi.fn(() => pending.promise) })
  render(<App repository={repo} />)
  await waitFor(() => expect(repo.preference).toHaveBeenCalledOnce())
  await act(async () => {
    location.hash = '#project/a'
    pending.resolve({ id: 'workspace', lastProjectId: 'old' })
  })
  await screen.findByRole('heading', { name: project.name })
  expect(location.hash).toBe('#project/a')
  expect(repo.board).toHaveBeenCalledExactlyOnceWith('a')
})
