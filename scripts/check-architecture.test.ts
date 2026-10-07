import { execFile as execFileCallback } from 'node:child_process'
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { promisify } from 'node:util'
import { afterEach, expect, it } from 'vitest'

const execFile = promisify(execFileCallback)
const fixtures: string[] = []
afterEach(async () => { await Promise.all(fixtures.splice(0).map(path => rm(path, { recursive: true, force: true }))) })

it('rejects an architecture fixture that crosses from domain to infrastructure', async () => {
  const root = await mkdtemp(join(tmpdir(), 'tracker-architecture-'))
  fixtures.push(root)
  await mkdir(join(root, 'features/project-board/domain'), { recursive: true })
  await mkdir(join(root, 'features/project-board/infrastructure/indexeddb'), { recursive: true })
  await writeFile(join(root, 'features/project-board/domain/invalid.ts'), "import { database } from '../infrastructure/indexeddb/database'\nexport { database }\n")
  await writeFile(join(root, 'features/project-board/infrastructure/indexeddb/database.ts'), 'export const database = {}\n')
  await expect(execFile('node', ['scripts/check-architecture.mjs'], { cwd: process.cwd(), env: { ...process.env, ARCHITECTURE_SOURCE_ROOT: root } })).rejects.toMatchObject({ code: 1 })
})
