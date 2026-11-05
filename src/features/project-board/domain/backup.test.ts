import { describe, expect, it } from 'vitest'
import { checkBackupIntegrity, type BackupData } from './backup'

const valid = (): BackupData => ({
  projects: [{ id: 'p', name: 'Поиск квартиры', createdAt: '2026-11-01T10:00:00.000Z' }],
  statuses: [
    { id: 's0', projectId: 'p', name: 'Найдено', position: 0 },
    { id: 's1', projectId: 'p', name: 'Просмотр', position: 1 },
  ],
  cards: [
    { id: 'c0', statusId: 's0', name: 'Срочная', description: '', position: 0, important: true, urgent: true },
    { id: 'c1', statusId: 's0', name: 'Важная', description: 'Текст', position: 1, important: true, urgent: false },
    { id: 'c2', statusId: 's0', name: 'Обычная', description: '', position: 2, important: false, urgent: false },
  ],
  notes: [{ id: 'n', cardId: 'c0', text: 'Позвонить', createdAt: '2026-11-02T10:00:00Z', updatedAt: '2026-11-03T10:00:00+03:00' }],
})

describe('checkBackupIntegrity', () => {
  it('accepts valid and empty data', () => {
    expect(checkBackupIntegrity(valid())).toBe(true)
    expect(checkBackupIntegrity({ projects: [], statuses: [], cards: [], notes: [] })).toBe(true)
  })

  const broken: Array<[string, (data: BackupData) => void]> = [
    ['duplicate project id', data => { data.projects.push({ ...data.projects[0] }) }],
    ['duplicate status id', data => { data.statuses[1].id = 's0' }],
    ['duplicate card id', data => { data.cards[1].id = 'c0' }],
    ['duplicate note id', data => { data.notes.push({ ...data.notes[0] }) }],
    ['status without project', data => { data.statuses[0].projectId = 'missing' }],
    ['card without status', data => { data.cards[0].statusId = 'missing' }],
    ['note without card', data => { data.notes[0].cardId = 'missing' }],
    ['status position gap', data => { data.statuses[1].position = 2 }],
    ['status position duplicate', data => { data.statuses[1].position = 0 }],
    ['status positions not from zero', data => { data.statuses.forEach(status => { status.position += 1 }) }],
    ['card position gap', data => { data.cards[2].position = 3 }],
    ['card position duplicate', data => { data.cards[2].position = 1 }],
    ['card group order violated', data => { data.cards[0].position = 2; data.cards[2].position = 0 }],
    ['empty project name', data => { data.projects[0].name = '  ' }],
    ['empty status name', data => { data.statuses[0].name = '' }],
    ['empty card name', data => { data.cards[0].name = ' \n' }],
    ['empty note text', data => { data.notes[0].text = ' ' }],
    ['invalid project date', data => { data.projects[0].createdAt = 'yesterday' }],
    ['impossible date', data => { data.projects[0].createdAt = '2026-13-45T10:00:00Z' }],
    ['nonexistent calendar date', data => { data.projects[0].createdAt = '2026-02-30T10:00:00Z' }],
    ['hour 24', data => { data.projects[0].createdAt = '2026-02-28T24:00:00Z' }],
    ['invalid note createdAt', data => { data.notes[0].createdAt = '2026-11-02' }],
    ['invalid note updatedAt', data => { data.notes[0].updatedAt = 'later' }],
  ]
  it.each(broken)('rejects %s', (_name, damage) => {
    const data = valid()
    damage(data)
    expect(checkBackupIntegrity(data)).toBe(false)
  })

  it('accepts records stored in any table order', () => {
    const data = valid()
    data.statuses.reverse()
    data.cards.reverse()
    expect(checkBackupIntegrity(data)).toBe(true)
  })
})
