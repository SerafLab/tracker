import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { LocaleProvider } from '../../i18n/provider'
import { localeStorageKey } from '../../i18n/locale'
import { NotificationProvider } from '../../ui/notifications'
import { AppBar } from '../../ui/app-bar'
import { CURRENT_BACKUP_VERSION, BACKUP_FORMAT, type Backup } from '../../features/project-board'
import { BackupProvider, type BackupActions } from './backup-provider'
import { deliverBackup } from './delivery'

vi.mock('./delivery', async importOriginal => ({ ...await importOriginal<typeof import('./delivery')>(), deliverBackup: vi.fn().mockResolvedValue(undefined) }))

const stored: Backup = {
  format: BACKUP_FORMAT, formatVersion: CURRENT_BACKUP_VERSION, exportedAt: '2026-11-01T10:30:00.000Z', app: { version: '0.1.0', commit: 'abc1234' },
  data: {
    projects: [{ id: 'p1', name: 'P', createdAt: '2026-11-01T10:00:00.000Z' }, { id: 'p2', name: 'Q', createdAt: '2026-11-01T10:00:00.000Z' }],
    statuses: [], cards: [], notes: [],
  },
}
const file = (text = 'x') => new File([text], 'copy.json', { type: 'application/json' })

function setup(overrides: Partial<BackupActions> = {}, options: { enabled?: boolean; leave?: (action: () => void | Promise<void>) => void } = {}) {
  const actions: BackupActions = {
    exportBackup: vi.fn().mockResolvedValue(stored),
    summary: vi.fn().mockResolvedValue({ projects: 3, cards: 24, notes: 51 }),
    parseBackup: vi.fn().mockReturnValue({ ok: true, backup: stored }),
    restore: vi.fn().mockResolvedValue(true),
    ...overrides,
  }
  const showCatalogue = vi.fn().mockResolvedValue(undefined)
  const requestLeave = vi.fn(options.leave ?? ((action: () => void | Promise<void>) => { void action() }))
  render(<LocaleProvider><NotificationProvider><BackupProvider enabled={options.enabled ?? true} actions={actions} requestLeave={requestLeave} showCatalogue={showCatalogue}><AppBar title="Каталог" /></BackupProvider></NotificationProvider></LocaleProvider>)
  return { actions, showCatalogue, requestLeave, gear: screen.getByRole('button', { name: /^(Настройки|Settings)$/ }) }
}
const fileInput = () => document.querySelector<HTMLInputElement>('input[type="file"]')!
async function choose(user: ReturnType<typeof userEvent.setup>, name: string, upload?: File) {
  await user.click(screen.getByRole('button', { name: /^(Настройки|Settings)$/ }))
  await user.click(await screen.findByRole('menuitem', { name }))
  if (upload) await user.upload(fileInput(), upload)
}

beforeEach(() => { vi.mocked(deliverBackup).mockClear() })
afterEach(cleanup)

it('opens the file chooser synchronously from the restore entry and keeps focus on the gear when it is cancelled', async () => {
  const user = userEvent.setup()
  const click = vi.spyOn(HTMLInputElement.prototype, 'click').mockImplementation(() => {})
  const { gear } = setup()
  expect(fileInput()).toHaveAttribute('accept', '.json,application/json')
  await choose(user, 'Восстановить из резервной копии')
  expect(click).toHaveBeenCalledOnce()
  fireEvent(fileInput(), new Event('cancel'))
  await waitFor(() => expect(gear).toHaveFocus())
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  click.mockRestore()
})

it.each([['invalid', 'Файл не является резервной копией EasyTrack или повреждён'], ['newer', 'Копия создана более новой версией EasyTrack — обновите приложение']] as const)('rejects a %s file without touching data', async (reason, message) => {
  const user = userEvent.setup()
  const { actions, requestLeave } = setup({ parseBackup: vi.fn().mockReturnValue({ ok: false, reason }) })
  await choose(user, 'Восстановить из резервной копии', file())
  const dialog = await screen.findByRole('dialog', { name: message })
  await user.click(within(dialog).getAllByRole('button', { name: 'Закрыть' }).at(-1)!)
  await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  expect(actions.restore).not.toHaveBeenCalled()
  expect(requestLeave).not.toHaveBeenCalled()
})

it('compares current and stored counts with the export date, and cancel returns focus to the gear', async () => {
  const user = userEvent.setup()
  const { actions, gear } = setup()
  await choose(user, 'Восстановить из резервной копии', file())
  const dialog = await screen.findByRole('dialog', { name: 'Заменить данные резервной копией?' })
  expect(dialog).toHaveTextContent('Проекты: 3 → 2')
  expect(dialog).toHaveTextContent('Карточки: 24 → 0')
  expect(dialog).toHaveTextContent('Заметки: 51 → 0')
  expect(dialog).toHaveTextContent(new Intl.DateTimeFormat('ru', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(stored.exportedAt)))
  expect(dialog).toHaveTextContent('Все текущие данные проектов будут заменены')
  await user.click(within(dialog).getByRole('button', { name: 'Отмена' }))
  await waitFor(() => expect(gear).toHaveFocus())
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  expect(actions.restore).not.toHaveBeenCalled()
})

it('formats the export date in the interface language', async () => {
  localStorage.setItem(localeStorageKey, 'en')
  const user = userEvent.setup()
  setup()
  await choose(user, 'Restore from backup', file())
  const dialog = await screen.findByRole('dialog', { name: 'Replace data with the backup?' })
  expect(dialog).toHaveTextContent(new Intl.DateTimeFormat('en', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(stored.exportedAt)))
  expect(dialog).toHaveTextContent('Projects: 3 → 2')
})

it('exports current data from the comparison and keeps the dialog open', async () => {
  const user = userEvent.setup()
  const { actions } = setup()
  await choose(user, 'Восстановить из резервной копии', file())
  const dialog = await screen.findByRole('dialog')
  await user.click(within(dialog).getByRole('button', { name: 'Сначала выгрузить текущие данные' }))
  await waitFor(() => expect(deliverBackup).toHaveBeenCalledOnce())
  expect(actions.exportBackup).toHaveBeenCalledOnce()
  expect(screen.getByRole('dialog', { name: 'Заменить данные резервной копией?' })).toBeInTheDocument()
  expect(actions.restore).not.toHaveBeenCalled()
})

it('replaces data through draft protection, then shows the catalogue and a notice', async () => {
  const user = userEvent.setup()
  const { actions, requestLeave, showCatalogue } = setup()
  await choose(user, 'Восстановить из резервной копии', file())
  await user.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Заменить' }))
  await waitFor(() => expect(showCatalogue).toHaveBeenCalledOnce())
  expect(requestLeave).toHaveBeenCalledOnce()
  expect(actions.restore).toHaveBeenCalledExactlyOnceWith(stored)
  expect(await screen.findByText('Данные восстановлены из резервной копии')).toBeInTheDocument()
})

it('does not restore when the user stays on an unsaved draft', async () => {
  const user = userEvent.setup()
  const { actions, requestLeave, showCatalogue } = setup({}, { leave: () => {} })
  await choose(user, 'Восстановить из резервной копии', file())
  await user.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Заменить' }))
  await waitFor(() => expect(requestLeave).toHaveBeenCalledOnce())
  expect(actions.restore).not.toHaveBeenCalled()
  expect(showCatalogue).not.toHaveBeenCalled()
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
})

it.each([['a write error', vi.fn().mockRejectedValue(new Error('write'))], ['a busy store', vi.fn().mockResolvedValue(false)]])('reports %s without opening the catalogue', async (_name, restore) => {
  const user = userEvent.setup()
  const { showCatalogue } = setup({ restore })
  await choose(user, 'Восстановить из резервной копии', file())
  await user.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Заменить' }))
  expect(await screen.findByRole('dialog', { name: 'Не удалось восстановить данные' })).toBeInTheDocument()
  expect(showCatalogue).not.toHaveBeenCalled()
})

it('reports a failed export in a dialog', async () => {
  const user = userEvent.setup()
  const { actions } = setup({ exportBackup: vi.fn().mockRejectedValue(new Error('read')) })
  await choose(user, 'Выгрузить резервную копию')
  expect(await screen.findByRole('dialog', { name: 'Не удалось выгрузить резервную копию' })).toBeInTheDocument()
  expect(deliverBackup).not.toHaveBeenCalled()
  expect(actions.restore).not.toHaveBeenCalled()
})

it('exports the current data from the menu', async () => {
  const user = userEvent.setup()
  setup()
  await choose(user, 'Выгрузить резервную копию')
  await waitFor(() => expect(deliverBackup).toHaveBeenCalledWith(stored))
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
})

it('offers no entries in service states', async () => {
  const user = userEvent.setup()
  setup({}, { enabled: false })
  await user.click(screen.getByRole('button', { name: 'Настройки' }))
  expect(within(await screen.findByRole('menu', { name: 'Настройки' })).queryAllByRole('menuitem')).toHaveLength(0)
})
