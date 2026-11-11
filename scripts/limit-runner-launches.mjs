// Claude Code PreToolUse hook: caps runner launches per feature within one session.
// Budget per feature: 1 launch + 2 returns at the default model, then 1 escalation with model "opus".
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const BASE_LAUNCHES = 3
const TAG = /^\[([a-z0-9][a-z0-9-]*)\]/i

function deny(reason) {
  process.stdout.write(JSON.stringify({
    hookSpecificOutput: { hookEventName: 'PreToolUse', permissionDecision: 'deny', permissionDecisionReason: reason },
  }))
}

const chunks = []
for await (const chunk of process.stdin) chunks.push(chunk)
const { session_id: session, tool_input: input = {} } = JSON.parse(Buffer.concat(chunks).toString('utf8'))

if (input.subagent_type === 'runner') {
  const feature = TAG.exec(input.description ?? '')?.[1]?.toLowerCase()
  if (!feature) {
    deny('Запуск runner требует метку функции в начале description: "[feature-id] …". См. docs/agents/rules/agent-routing.md, «Возвраты после ревью».')
  } else {
    const directory = join(process.env.RUNNER_LIMIT_STATE_DIR ?? join(tmpdir(), 'claude-runner-launches'), String(session))
    const file = join(directory, `${feature}.json`)
    const state = await readFile(file, 'utf8').then(JSON.parse, () => ({ launches: 0, escalated: false }))
    if (state.escalated) {
      deny(`Лимит runner для [${feature}] исчерпан, эскалация уже была. Остановите цикл и передайте пользователю список нерешённых замечаний.`)
    } else if (input.model === 'opus') {
      await save({ ...state, escalated: true })
    } else if (state.launches >= BASE_LAUNCHES) {
      deny(`Лимит возвратов для [${feature}] исчерпан (${BASE_LAUNCHES} запуска). Если проблема в исполнении — один раз запустите runner с model: "opus"; если в требованиях — спросите пользователя.`)
    } else {
      await save({ ...state, launches: state.launches + 1 })
    }

    async function save(next) {
      await mkdir(directory, { recursive: true })
      await writeFile(file, JSON.stringify(next))
    }
  }
}
