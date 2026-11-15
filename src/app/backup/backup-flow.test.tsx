import { cleanup, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { App } from '../app'
import { BACKUP_FORMAT, CURRENT_BACKUP_VERSION, DexieProjectBoardRepository, ProjectBoardDatabase, type Backup, type BackupData } from '../../features/project-board'
import { deliverBackup } from './delivery'

vi.mock('./delivery', () => ({ deliverBackup: vi.fn().mockResolvedValue(undefined) }))

const databases: ProjectBoardDatabase[] = []
const data: BackupData = {
  projects: [{ id: 'p1', name: 'Project A', createdAt: '2026-11-01T10:00:00.000Z' }],
  statuses: [{ id: 's1', projectId: 'p1', name: 'Todo', position: 0 }],
  cards: [{ id: 'c1', statusId: 's1', name: 'First', description: '', position: 0, important: false, urgent: false }],
  notes: [],
}
const copy = (copyData: BackupData): Backup => ({ format: BACKUP_FORMAT, formatVersion: CURRENT_BACKUP_VERSION, exportedAt: '2026-11-02T10:00:00.000Z', app: { version: '0.1.0', commit: 'abc1234' }, data: copyData })
const restoredData: BackupData = { projects: [{ id: 'r1', name: 'Restored', createdAt: '2026-10-01T10:00:00.000Z' }], statuses: [], cards: [], notes: [] }
const empty: BackupData = { projects: [], statuses: [], cards: [], notes: [] }

async function open(initial = data) {
  const repo = new DexieProjectBoardRepository((() => { const db = new ProjectBoardDatabase(`flow-${crypto.randomUUID()}`); databases.push(db); return db })())
  await repo.open()
  await repo.replaceAll(initial)
  render(<App repository={repo} />)
  await screen.findByRole('button', { name: 'Project A' })
  return { repo, user: userEvent.setup() }
}
async function restore(user: ReturnType<typeof userEvent.setup>, backup: Backup, label = 'Восстановить из резервной копии') {
  const gear = screen.queryByRole('button', { name: /^(Настройки|Settings)$/ })
  if (gear) await user.click(gear)
  await user.click(await screen.findByRole('button', { name: label }))
  await user.upload(document.querySelector<HTMLInputElement>('input[type="file"]')!, new File([JSON.stringify(backup)], 'copy.json', { type: 'application/json' }))
}

beforeEach(() => { history.replaceState(null, '', '/'); vi.mocked(deliverBackup).mockClear() })
afterEach(async () => { cleanup(); history.replaceState(null, '', '/'); await Promise.all(databases.splice(0).map(async db => { db.close(); await db.delete() })) })

it('keeps data, the card draft and focus on the gear when the user stays before opening settings', async () => {
  const { repo, user } = await open()
  await user.click(await screen.findByRole('button', { name: 'Project A' }))
  await user.click(await screen.findByRole('link', { name: 'First' }))
  await user.click(await screen.findByRole('button', { name: 'Добавить заметку' }))
  await user.type(screen.getByLabelText('Новая заметка'), 'Draft')
  await user.click(screen.getByRole('button', { name: 'Настройки' }))
  await user.click(within(await screen.findByRole('dialog', { name: 'Несохранённые изменения' })).getByRole('button', { name: 'Остаться' }))
  await waitFor(() => expect(screen.getByRole('button', { name: 'Настройки' })).toHaveFocus())
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  expect(screen.getByLabelText('Новая заметка')).toHaveValue('Draft')
  expect((await repo.snapshot()).projects.map(project => project.name)).toEqual(['Project A'])
})

it('shows N → 0 for an empty copy and restores it', async () => {
  const { repo, user } = await open()
  await restore(user, copy(empty))
  const dialog = await screen.findByRole('dialog', { name: 'Заменить данные резервной копией?' })
  expect(dialog).toHaveTextContent('Проекты: 1 → 0')
  await user.click(within(dialog).getByRole('button', { name: 'Заменить' }))
  expect(await screen.findByText('Данные восстановлены из резервной копии')).toBeInTheDocument()
  await waitFor(() => expect(screen.queryByRole('button', { name: 'Project A' })).not.toBeInTheDocument())
  expect(await repo.snapshot()).toEqual(empty)
})

it('leaves device settings out of the copy and unchanged by a restore', async () => {
  localStorage.setItem('easytrack.locale', 'en'); localStorage.setItem('easytrack.theme', 'ink'); localStorage.setItem('easytrack.noteOrder', 'oldest')
  const before = { ...localStorage }
  const { user } = await open()
  await user.click(await screen.findByRole('button', { name: 'Settings' }))
  await user.click(await screen.findByRole('button', { name: 'Export backup' }))
  await waitFor(() => expect(deliverBackup).toHaveBeenCalledOnce())
  const exported = vi.mocked(deliverBackup).mock.calls[0][0]
  expect(Object.keys(exported).sort()).toEqual(['app', 'data', 'exportedAt', 'format', 'formatVersion'])
  expect(JSON.stringify(exported)).not.toMatch(/ink|oldest|lastProjectId|"en"/)
  await restore(user, copy(restoredData), 'Restore from backup')
  await user.click(within(await screen.findByRole('dialog', { name: 'Replace data with the backup?' })).getByRole('button', { name: 'Replace' }))
  expect(await screen.findByText('Data restored from the backup')).toBeInTheDocument()
  expect({ ...localStorage }).toEqual(before)
  expect(document.documentElement.lang).toBe('en')
})


it('leaves the settings page and old data in place when replacement fails', async () => {
  const { repo, user } = await open()
  vi.spyOn(repo, 'replaceAll').mockRejectedValueOnce(Error('write failed'))
  await restore(user, copy(restoredData))
  await user.click(within(await screen.findByRole('dialog', { name: 'Заменить данные резервной копией?' })).getByRole('button', { name: 'Заменить' }))
  const error = await screen.findByRole('dialog', { name: 'Не удалось восстановить данные' })
  expect(location.hash).toBe('#settings')
  expect((await repo.snapshot()).projects.map(project => project.name)).toEqual(['Project A'])
  await user.click(within(error).getAllByRole('button', { name: 'Закрыть' }).at(-1)!)
  await waitFor(() => expect(screen.getByRole('button', { name: 'Восстановить из резервной копии' })).toHaveFocus())
})
