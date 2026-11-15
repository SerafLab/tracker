import { spawn } from 'node:child_process'
import { chmod, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { delimiter, join } from 'node:path'
import { afterEach, beforeEach, expect, it } from 'vitest'

// A fake `gh` on PATH answers `gh pr view` with this PR.
let binDir: string
beforeEach(async () => { binDir = await mkdtemp(join(tmpdir(), 'tracker-approval-guard-')) })
afterEach(async () => { await rm(binDir, { recursive: true, force: true }) })

async function fakePr(files: string[], labels: string[] = []) {
  const json = JSON.stringify({ files: files.map(path => ({ path })), labels: labels.map(name => ({ name })) })
  await writeFile(join(binDir, 'gh'), `#!/bin/sh\necho '${json}'\n`)
  await chmod(join(binDir, 'gh'), 0o755)
}

function hook(tool: string, toolInput: Record<string, unknown>): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn('node', ['scripts/guard-human-approval.mjs'], { env: { ...process.env, PATH: `${binDir}${delimiter}${process.env.PATH}` } })
    let stdout = ''
    child.stdout.on('data', chunk => { stdout += chunk })
    child.on('error', reject)
    child.on('close', code => code === 0 ? resolve(stdout) : reject(new Error(`exit ${code}`)))
    child.stdin.end(JSON.stringify({ tool_name: tool, tool_input: toolInput }))
  })
}

const bash = (command: string) => hook('Bash', { command })
const decision = (stdout: string) => stdout ? JSON.parse(stdout).hookSpecificOutput.permissionDecision : 'none'

it('ignores unrelated commands', async () => {
  expect(decision(await bash('git status && grep -rn human-approved REVIEW.md'))).toBe('none')
})

it('denies adding the approval label in any form', async () => {
  for (const command of [
    'gh pr edit 61 --add-label human-approved',
    'gh pr edit 61 --add-label=bug,human-approved',
    'gh api repos/o/r/issues/61/labels -f "labels[]=human-approved"',
  ]) expect(decision(await bash(command)), command).toBe('deny')
  expect(decision(await bash('gh pr edit 61 --remove-label human-approved'))).toBe('none')
})

it('denies a merge without an explicit PR', async () => {
  expect(decision(await bash('gh pr merge --squash'))).toBe('deny')
})

it('allows merging a PR without high-risk paths', async () => {
  await fakePr(['src/ui/settings-entry.tsx'])
  expect(decision(await bash('gh pr merge 61 --squash --delete-branch'))).toBe('none')
})

it('denies merging or auto-merging a high-risk PR until a human labels it', async () => {
  await fakePr(['src/ui/a.tsx', '.github/workflows/ci.yml'])
  const denied = await bash('gh pr merge 61 --squash')
  expect(decision(denied)).toBe('deny')
  expect(denied).toContain('.github/workflows/ci.yml')
  expect(decision(await hook('mcp__ccd_pr__set_auto_merge', { enabled: true, url: 'https://github.com/o/r/pull/61' }))).toBe('deny')
  expect(decision(await hook('mcp__ccd_pr__set_auto_merge', { enabled: false, url: 'https://github.com/o/r/pull/61' }))).toBe('none')

  await fakePr(['.github/workflows/ci.yml'], ['human-approved'])
  expect(decision(await bash('gh pr merge https://github.com/o/r/pull/61 --squash'))).toBe('none')
})

it('fails closed when the PR cannot be read', async () => {
  await writeFile(join(binDir, 'gh'), '#!/bin/sh\nexit 1\n')
  await chmod(join(binDir, 'gh'), 0o755)
  expect(decision(await bash('gh pr merge 61 --squash'))).toBe('deny')
})
