import { StrictMode } from 'react'
import { act, cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, expect, it, vi } from 'vitest'
import { App } from '../app'
import { DexieProjectBoardRepository, ProjectBoardDatabase } from '../../features/project-board'
import type { NativeTool } from './registration'
import type { ToolName } from './schemas'
const databases: ProjectBoardDatabase[] = []
afterEach(async () => { cleanup(); delete (document as Document & { modelContext?: unknown }).modelContext; history.replaceState(null, '', '/'); await Promise.all(databases.splice(0).map(db => db.delete())) })
async function fixture() {
  const tools = new Map<string, NativeTool>()
  Object.defineProperty(document, 'modelContext', { configurable: true, value: { registerTool(tool: NativeTool, { signal }: { signal: AbortSignal }) { if (signal.aborted) return; tools.set(tool.name, tool); signal.addEventListener('abort', () => { if (tools.get(tool.name) === tool) tools.delete(tool.name) }) } } })
  const db = new ProjectBoardDatabase(`composition-${crypto.randomUUID()}`); databases.push(db)
  const repo = new DexieProjectBoardRepository(db)
  await repo.createProject({ id: 'p', name: 'Project', createdAt: 'now' }, [], true)
  await repo.createStatus({ id: 's', projectId: 'p', name: 'Status' })
  await repo.createCard({ id: 'c', statusId: 's', name: 'Card', description: 'Stored', important: false, urgent: false })
  await repo.createNote({ id: 'n', cardId: 'c', text: 'Note', createdAt: '2026-11-02T00:00:00Z' })
  history.replaceState(null, '', '/#project/p')
  const view = render(<StrictMode><App repository={repo} /></StrictMode>)
  await screen.findByRole('heading', { name: 'Project' })
  await waitFor(() => expect(tools.size).toBe(15))
  const connection = await tools.get('get_connection')!.execute({}) as { sessionId: string }
  let requestId = 0
  const call = async (tool: ToolName, fields = {}) => {
    let result: unknown
    await act(async () => { result = await tools.get(tool)!.execute({ sessionId: connection.sessionId, ...(tool === 'list_projects' || tool === 'get_board' ? {} : { requestId: ++requestId }), ...fields }) })
    return result
  }
  return { tools, repo, call, user: userEvent.setup(), view, connection }
}
it('native-contract fixture applies actual checked board/catalogue navigation, keeps route/session across mutations and rejects missing destinations', async () => {
  const { call, tools, connection } = await fixture()
  expect(await call('create_project', { name: 'Background', statusSetId: 'none' })).toMatchObject({ ok: true, data: { saved: true } })
  expect(location.hash).toBe('#project/p')
  expect(await call('show_workspace', { projectId: 'missing' })).toMatchObject({ error: { code: 'not_found' } })
  expect(location.hash).toBe('#project/p')
  expect(await call('show_workspace')).toMatchObject({ ok: true, data: { route: '', url: expect.any(String) } })
  expect(await screen.findByRole('heading', { name: 'Трекер личных проектов' })).toBeInTheDocument()
  expect(location.hash).toBe('')
  expect(await call('show_workspace', { projectId: 'p' })).toMatchObject({ ok: true, data: { route: '#project/p' } })
  expect(await tools.get('get_connection')!.execute({})).toMatchObject({ sessionId: connection.sessionId })
})
it('native-contract fixture retains mounted field/note drafts through unrelated refresh failure and retries reading only', async () => {
  const { call, repo, user } = await fixture()
  await user.click(screen.getByRole('link', { name: 'Card' }))
  await screen.findByRole('heading', { name: 'Card' })
  const description = screen.getByLabelText('Описание карточки')
  await user.clear(description); await user.type(description, 'Unsaved field draft')
  await user.click(screen.getByRole('button', { name: 'Добавить заметку' }))
  const note = screen.getByLabelText('Новая заметка')
  await user.type(note, 'Unsaved note draft')
  expect(await call('update_card', { cardId: 'c', name: 'Forbidden', important: true, urgent: true })).toMatchObject({ error: { code: 'conflict' } })
  expect(await call('show_workspace')).toMatchObject({ error: { code: 'conflict' } })
  const committed = vi.spyOn(repo, 'renameProject')
  vi.spyOn(repo, 'cardDetails').mockRejectedValueOnce(Error('read failure'))
  expect(await call('rename_project', { projectId: 'p', name: 'Renamed' })).toMatchObject({ ok: true, data: { saved: true, warning: { code: 'view_refresh_failed' } } })
  expect(screen.getByLabelText('Описание карточки')).toBe(description)
  expect(description).toHaveValue('Unsaved field draft')
  expect(note).toHaveValue('Unsaved note draft')
  expect(location.hash).toBe('#project/p/card/c')
  await user.click(screen.getByRole('button', { name: 'Обновить доску' }))
  await waitFor(() => expect(description).not.toBeDisabled())
  expect(committed).toHaveBeenCalledOnce()
  expect(description).toHaveValue('Unsaved field draft'); expect(note).toHaveValue('Unsaved note draft')
})
it('native-contract fixture revokes old handles at pagehide and requires a fresh BFCache session', async () => {
  const { tools, connection } = await fixture()
  const old = tools.get('list_projects')!
  await act(async () => { dispatchEvent(new PageTransitionEvent('pagehide', { persisted: true })) })
  expect(tools.size).toBe(0)
  expect(await old.execute({ sessionId: connection.sessionId })).toMatchObject({ error: { code: 'disconnected' } })
  await act(async () => { dispatchEvent(new PageTransitionEvent('pageshow', { persisted: true })) })
  await waitFor(() => expect(tools.size).toBe(15))
  expect(await tools.get('list_projects')!.execute({ sessionId: connection.sessionId })).toMatchObject({ error: { code: 'disconnected' } })
  expect(await tools.get('get_connection')!.execute({})).not.toMatchObject({ sessionId: connection.sessionId })
})
it('native-contract fixture saves set names in the current UI language and order, and fills an empty project without navigating', async () => {
  const { call, user, repo } = await fixture()
  const names = async (id: string) => (await repo.board(id))!.statuses.map(status => status.name)
  const ru = await call('create_project', { name: 'RU', statusSetId: 'development' }) as { data: { project: { id: string; statuses: { name: string }[] } } }
  expect(ru.data.project.statuses.map(status => status.name)).toEqual(['Запланировано', 'На паузе', 'В разработке', 'На проверке', 'Готово'])
  await user.click(screen.getByRole('button', { name: 'Настройки' }))
  await user.selectOptions(screen.getByRole('combobox', { name: 'Язык приложения' }), 'en')
  const en = await call('create_project', { name: 'EN', statusSetId: 'job-search' }) as { data: { project: { id: string } } }
  expect(await names(en.data.project.id)).toEqual(['Interested', 'Applied', 'Interviews', 'Offer', 'Rejected'])
  expect(await names(ru.data.project.id)).toHaveLength(5)
  const bare = await call('create_project', { name: 'Bare', statusSetId: 'none' }) as { data: { project: { id: string } } }
  expect(await call('apply_status_set', { projectId: bare.data.project.id, statusSetId: 'simple' })).toMatchObject({ ok: true, data: { board: { statuses: [{ name: 'To do' }, { name: 'In progress' }, { name: 'Done' }] } } })
  expect(await call('apply_status_set', { projectId: bare.data.project.id, statusSetId: 'simple' })).toMatchObject({ error: { code: 'conflict' } })
  expect(location.hash).toBe('#project/p')
})
