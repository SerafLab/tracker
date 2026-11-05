// Writes the backup fixtures from src/test/backup-fixtures.ts for manual restore checks.
// Usage: npm run fixtures:backup [-- <dir>]   (default: fixtures/backup)
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { backupFixtureFiles } from '../src/test/backup-fixtures.ts'

const dir = process.argv[2] ?? 'fixtures/backup'
mkdirSync(dir, { recursive: true })
for (const [name, text] of Object.entries(backupFixtureFiles())) {
  writeFileSync(join(dir, name), `${text}\n`)
  console.log(`${join(dir, name)}  ${(text.length / 1024).toFixed(0)} KB`)
}
