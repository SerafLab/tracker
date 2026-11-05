import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { BACKUP_FORMAT, CURRENT_BACKUP_VERSION, type Backup } from '../../features/project-board'
import { backupFileName, deliverBackup } from './delivery'

const backup: Backup = { format: BACKUP_FORMAT, formatVersion: CURRENT_BACKUP_VERSION, exportedAt: '2026-11-06T11:30:00.000Z', app: { version: '0.1.0', commit: 'abc1234' }, data: { projects: [], statuses: [], cards: [], notes: [] } }
const now = new Date(2026, 10, 6, 14, 30)
let clicked: { download: string; href: string }[]

function device({ coarse, share }: { coarse: boolean; share?: (data: ShareData) => Promise<void> }) {
  vi.stubGlobal('matchMedia', (query: string) => ({ matches: coarse && query === '(pointer: coarse)' }))
  Object.defineProperty(navigator, 'canShare', { configurable: true, value: share ? () => true : undefined })
  Object.defineProperty(navigator, 'share', { configurable: true, value: share })
}

beforeEach(() => {
  clicked = []
  URL.createObjectURL = vi.fn(() => 'blob:backup')
  URL.revokeObjectURL = vi.fn()
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) { clicked.push({ download: this.download, href: this.href }) })
})
afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); Reflect.deleteProperty(navigator, 'canShare'); Reflect.deleteProperty(navigator, 'share') })

it('names the file by local time', () => {
  expect(backupFileName(now)).toBe('easytrack-backup-2026-11-06-1430.json')
  expect(backupFileName(new Date(2026, 0, 5, 9, 7))).toBe('easytrack-backup-2026-01-05-0907.json')
})

it('downloads on a desktop even when sharing is available', async () => {
  const share = vi.fn().mockResolvedValue(undefined)
  device({ coarse: false, share })
  await deliverBackup(backup, now)
  expect(share).not.toHaveBeenCalled()
  expect(clicked).toEqual([{ download: 'easytrack-backup-2026-11-06-1430.json', href: 'blob:backup' }])
  const file = vi.mocked(URL.createObjectURL).mock.calls[0][0] as File
  expect(JSON.parse(await file.text())).toEqual(backup)
  expect(await file.text()).toContain('\n  "format"')
})

it('shares the file on a touch device', async () => {
  const share = vi.fn().mockResolvedValue(undefined)
  device({ coarse: true, share })
  await deliverBackup(backup, now)
  expect(share).toHaveBeenCalledOnce()
  const file = share.mock.calls[0][0].files[0] as File
  expect(file.name).toBe('easytrack-backup-2026-11-06-1430.json')
  expect(file.type).toBe('application/json')
  expect(clicked).toEqual([])
})

it('downloads on a touch device that cannot share files', async () => {
  device({ coarse: true })
  await deliverBackup(backup, now)
  expect(clicked).toHaveLength(1)
})

it('stays silent when the share sheet is dismissed', async () => {
  device({ coarse: true, share: () => Promise.reject(new DOMException('dismissed', 'AbortError')) })
  await expect(deliverBackup(backup, now)).resolves.toBeUndefined()
  expect(clicked).toEqual([])
})

it.each(['NotAllowedError', 'DataError'])('falls back to a download after %s', async name => {
  device({ coarse: true, share: () => Promise.reject(new DOMException('failed', name)) })
  await deliverBackup(backup, now)
  expect(clicked).toHaveLength(1)
})
