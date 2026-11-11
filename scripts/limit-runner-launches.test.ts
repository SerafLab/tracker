import { spawn } from 'node:child_process'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, expect, it } from 'vitest'

let stateDir: string
beforeEach(async () => { stateDir = await mkdtemp(join(tmpdir(), 'tracker-runner-limit-')) })
afterEach(async () => { await rm(stateDir, { recursive: true, force: true }) })

function hook(toolInput: Record<string, unknown>, session = 's1'): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn('node', ['scripts/limit-runner-launches.mjs'], { env: { ...process.env, RUNNER_LIMIT_STATE_DIR: stateDir } })
    let stdout = ''
    child.stdout.on('data', chunk => { stdout += chunk })
    child.on('error', reject)
    child.on('close', code => code === 0 ? resolve(stdout) : reject(new Error(`exit ${code}`)))
    child.stdin.end(JSON.stringify({ session_id: session, tool_name: 'Agent', tool_input: toolInput }))
  })
}

function decision(stdout: string) {
  return stdout ? JSON.parse(stdout).hookSpecificOutput.permissionDecision : 'none'
}

const runner = (description: string, model?: string) => ({ subagent_type: 'runner', description, prompt: 'p', model })

it('ignores agents other than runner', async () => {
  expect(decision(await hook({ subagent_type: 'reviewer', description: 'no tag' }))).toBe('none')
})

it('denies a runner launch without a feature tag', async () => {
  expect(decision(await hook(runner('Implement thing')))).toBe('deny')
})

it('allows three launches and one opus escalation per feature, then denies', async () => {
  for (let i = 0; i < 3; i += 1) expect(decision(await hook(runner('[card-flags] fix')))).toBe('none')
  const exhausted = await hook(runner('[card-flags] fix'))
  expect(decision(exhausted)).toBe('deny')
  expect(exhausted).toContain('opus')
  expect(decision(await hook(runner('[card-flags] fix', 'opus')))).toBe('none')
  expect(decision(await hook(runner('[card-flags] fix', 'opus')))).toBe('deny')
  expect(decision(await hook(runner('[card-flags] fix')))).toBe('deny')
})

it('counts features and sessions separately', async () => {
  for (let i = 0; i < 3; i += 1) await hook(runner('[a] x'))
  expect(decision(await hook(runner('[a] x')))).toBe('deny')
  expect(decision(await hook(runner('[B] x')))).toBe('none')
  expect(decision(await hook(runner('[a] x'), 's2'))).toBe('none')
})
