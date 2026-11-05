import { describe, expect, it } from 'vitest'
import { BACKUP_FORMAT, CURRENT_BACKUP_VERSION, migrations, parseBackup, summarizeBackup } from './backup'

const backup = () => ({
  format: BACKUP_FORMAT, formatVersion: 1, exportedAt: '2026-11-06T11:30:00.000Z', app: { version: '0.1.0', commit: 'abc1234' },
  data: {
    projects: [{ id: 'p', name: 'Проект', createdAt: '2026-11-01T10:00:00.000Z' }],
    statuses: [{ id: 's', projectId: 'p', name: 'Найдено', position: 0 }],
    cards: [{ id: 'c', statusId: 's', name: 'Карточка', description: '', position: 0, important: true, urgent: false }],
    notes: [{ id: 'n', cardId: 'c', text: 'Заметка', createdAt: '2026-11-02T10:00:00.000Z' }],
  },
})
const parse = (value: unknown) => parseBackup(JSON.stringify(value))

describe('parseBackup', () => {
  it('accepts a valid version 1 copy, including an empty one', () => {
    expect(parse(backup())).toEqual({ ok: true, backup: backup() })
    expect(parse({ ...backup(), data: { projects: [], statuses: [], cards: [], notes: [] } }).ok).toBe(true)
  })

  it('reads its own indented output', () => {
    expect(parseBackup(JSON.stringify(backup(), null, 2))).toEqual({ ok: true, backup: backup() })
  })

  it.each([
    ['not JSON', '{oops'],
    ['a JSON array', '[]'],
    ['a foreign marker', JSON.stringify({ ...backup(), format: 'other' })],
    ['no marker', JSON.stringify({ formatVersion: 1 })],
    ['version 0', JSON.stringify({ ...backup(), formatVersion: 0 })],
    ['a fractional version', JSON.stringify({ ...backup(), formatVersion: 1.5 })],
    ['a string version', JSON.stringify({ ...backup(), formatVersion: '1' })],
    ['an extra top-level field', JSON.stringify({ ...backup(), extra: 1 })],
    ['an extra record field', JSON.stringify({ ...backup(), data: { ...backup().data, projects: [{ ...backup().data.projects[0], extra: 1 }] } })],
    ['a wrong value type', JSON.stringify({ ...backup(), data: { ...backup().data, cards: [{ ...backup().data.cards[0], important: 'yes' }] } })],
    ['a bad export date', JSON.stringify({ ...backup(), exportedAt: 'today' })],
    ['broken integrity', JSON.stringify({ ...backup(), data: { ...backup().data, cards: [{ ...backup().data.cards[0], statusId: 'missing' }] } })],
  ])('rejects %s as invalid', (_name, text) => {
    expect(parseBackup(text)).toEqual({ ok: false, reason: 'invalid' })
  })

  it('reports a newer version before checking the rest', () => {
    expect(parse({ format: BACKUP_FORMAT, formatVersion: 2, anything: true })).toEqual({ ok: false, reason: 'newer' })
  })

  it('has a migration for every version below the current one', () => {
    for (let version = 1; version < CURRENT_BACKUP_VERSION; version++) expect(migrations[version]).toBeTypeOf('function')
  })
})

describe('summarizeBackup', () => {
  it('counts projects, cards and notes', () => {
    expect(summarizeBackup(backup().data)).toEqual({ projects: 1, cards: 1, notes: 1 })
  })
})
