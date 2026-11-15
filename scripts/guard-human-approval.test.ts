import { spawn } from 'node:child_process'
import { chmod, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { delimiter, join } from 'node:path'
import { afterEach, beforeEach, expect, it } from 'vitest'

// A fake `gh` on PATH answers `gh pr view` with these checks.
let binDir: string
beforeEach(async () => { binDir = await mkdtemp(join(tmpdir(), 'tracker-approval-guard-')) })
afterEach(async () => { await rm(binDir, { recursive: true, force: true }) })

type Check = { name: string; status: string; conclusion: string; startedAt: string }
const gate = (conclusion: string, startedAt: string, status = 'COMPLETED'): Check => ({ name: 'high-risk-paths', status, conclusion, startedAt })

async function fakeChecks(checks: Check[]) {
  await writeFile(join(binDir, 'gh'), `#!/bin/sh\necho '${JSON.stringify({ statusCheckRollup: checks })}'\n`)
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

it('ignores unrelated commands and mentions inside arguments', async () => {
  for (const command of [
    'git status && grep -rn human-approved REVIEW.md',
    'git commit -m "explain gh pr merge and --add-label human-approved"',
    "grep -n 'gh pr merge' AGENTS.md",
    'gh label list --search human-approved',
    'gh pr edit 61 --remove-label human-approved',
    'git push -u origin claude/main-fix',
  ]) expect(decision(await bash(command)), command).toBe('none')
})

it('denies adding the approval label in any form', async () => {
  for (const command of [
    'gh pr edit 61 --add-label human-approved',
    'gh pr edit 61 --add-label=bug,human-approved',
    'cd x && gh -R o/r issue edit 61 --add-label human-approved',
    'gh api repos/o/r/issues/61/labels -f "labels[]=human-approved"',
  ]) expect(decision(await bash(command)), command).toBe('deny')
})

it('denies bypassing the PR merge', async () => {
  for (const command of [
    'gh pr merge --squash',
    'gh api -X PUT repos/o/r/pulls/61/merge',
    'git push origin HEAD:main',
    'git push origin main',
    'git push origin +HEAD:refs/heads/main',
  ]) expect(decision(await bash(command)), command).toBe('deny')
})

it('allows a merge only when the latest approval check on the head passed', async () => {
  await fakeChecks([gate('FAILURE', '2026-11-15T10:00:00Z'), gate('SUCCESS', '2026-11-15T10:05:00Z')])
  expect(decision(await bash('gh -R o/r pr merge 61 --squash --delete-branch'))).toBe('none')
  expect(decision(await hook('mcp__ccd_pr__set_auto_merge', { enabled: true, url: 'https://github.com/o/r/pull/61' }))).toBe('none')

  await fakeChecks([gate('SUCCESS', '2026-11-15T10:00:00Z'), gate('FAILURE', '2026-11-15T10:05:00Z')])
  const denied = await bash('gh pr merge https://github.com/o/r/pull/61 --squash')
  expect(decision(denied)).toBe('deny')
  expect(denied).toContain('human-approved')
  expect(decision(await hook('mcp__ccd_pr__set_auto_merge', { enabled: true, url: 'https://github.com/o/r/pull/61' }))).toBe('deny')
  expect(decision(await hook('mcp__ccd_pr__set_auto_merge', { enabled: false, url: 'https://github.com/o/r/pull/61' }))).toBe('none')
})

it('denies a merge while the check is pending or missing', async () => {
  await fakeChecks([gate('', '2026-11-15T10:00:00Z', 'IN_PROGRESS')])
  expect(decision(await bash('gh pr merge 61 --squash'))).toBe('deny')
  await fakeChecks([{ name: 'check', status: 'COMPLETED', conclusion: 'SUCCESS', startedAt: '2026-11-15T10:00:00Z' }])
  expect(decision(await bash('gh pr merge 61 --squash'))).toBe('deny')
})

it('fails closed when the PR cannot be read', async () => {
  await writeFile(join(binDir, 'gh'), '#!/bin/sh\nexit 1\n')
  await chmod(join(binDir, 'gh'), 0o755)
  expect(decision(await bash('gh pr merge 61 --squash'))).toBe('deny')
})
