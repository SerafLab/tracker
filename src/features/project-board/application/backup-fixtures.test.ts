import { describe, expect, it } from 'vitest'
import { backupFixtureFiles } from '../../../test/backup-fixtures'
import { parseBackup, summarizeBackup } from './backup'

const files = backupFixtureFiles()
const expected = (name: string) => name === 'rejected-newer-version.json' ? 'newer' : name.startsWith('rejected-') ? 'invalid' : 'ok'

describe('backup fixtures', () => {
  it.each(Object.keys(files))('%s gives the expected restore result', name => {
    const result = parseBackup(files[name])
    expect(result.ok ? 'ok' : result.reason).toBe(expected(name))
  })

  it('keeps the volume copy at its declared size', () => {
    const result = parseBackup(files['volume.json'])
    expect(result.ok && summarizeBackup(result.backup.data)).toEqual({ projects: 10, cards: 2000, notes: 10000 })
  })

  it('is deterministic', () => {
    expect(backupFixtureFiles()).toEqual(files)
  })
})
