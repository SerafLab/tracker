import { z } from 'zod'
import { checkBackupIntegrity, isIsoDate, type BackupData } from '../domain/backup'

export const BACKUP_FORMAT = 'easytrack-backup'
export const CURRENT_BACKUP_VERSION = 1

export type Backup = { format: typeof BACKUP_FORMAT; formatVersion: number; exportedAt: string; app: { version: string; commit: string }; data: BackupData }
export type BackupSummary = { projects: number; cards: number; notes: number }
export type ParseBackupResult = { ok: true; backup: Backup } | { ok: false; reason: 'invalid' | 'newer' }

const isoDate = z.string().refine(isIsoDate)
const position = z.number().int().min(0)
const version1 = z.strictObject({
  format: z.literal(BACKUP_FORMAT),
  formatVersion: z.literal(1),
  exportedAt: isoDate,
  app: z.strictObject({ version: z.string(), commit: z.string() }),
  data: z.strictObject({
    projects: z.array(z.strictObject({ id: z.string(), name: z.string(), createdAt: isoDate })),
    statuses: z.array(z.strictObject({ id: z.string(), projectId: z.string(), name: z.string(), position })),
    cards: z.array(z.strictObject({ id: z.string(), statusId: z.string(), name: z.string(), description: z.string(), position, important: z.boolean(), urgent: z.boolean() })),
    notes: z.array(z.strictObject({ id: z.string(), cardId: z.string(), text: z.string(), createdAt: isoDate, updatedAt: isoDate.optional() })),
  }),
})

const envelope = z.looseObject({ format: z.literal(BACKUP_FORMAT), formatVersion: z.number().int().min(1) })
const schemas: Record<number, z.ZodType> = { 1: version1 }
/** migrations[v] converts a version v copy to version v + 1. Every version below CURRENT_BACKUP_VERSION needs one. */
export const migrations: Record<number, (backup: unknown) => unknown> = {}

export function parseBackup(text: string): ParseBackupResult {
  let json: unknown
  try { json = JSON.parse(text) } catch { return { ok: false, reason: 'invalid' } }
  const head = envelope.safeParse(json)
  if (!head.success) return { ok: false, reason: 'invalid' }
  if (head.data.formatVersion > CURRENT_BACKUP_VERSION) return { ok: false, reason: 'newer' }
  const strict = schemas[head.data.formatVersion]?.safeParse(json)
  if (!strict?.success) return { ok: false, reason: 'invalid' }
  let backup = strict.data
  for (let version = head.data.formatVersion; version < CURRENT_BACKUP_VERSION; version++) backup = migrations[version](backup)
  const result = backup as Backup
  return checkBackupIntegrity(result.data) ? { ok: true, backup: result } : { ok: false, reason: 'invalid' }
}

export const summarizeBackup = (data: BackupData): BackupSummary => ({ projects: data.projects.length, cards: data.cards.length, notes: data.notes.length })
