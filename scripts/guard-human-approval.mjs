// Claude Code PreToolUse hook: only a human approves high-risk PRs. See REVIEW.md.
// A merge (or auto-merge) is allowed only when the `high-risk-paths` check of the Human approval
// workflow passed on the PR head: no high-risk paths, or a human labelled exactly these commits.
// Also denies agents adding the approval label, merging through the API and pushing to main.
// Fails closed when the PR cannot be read.
import { execFileSync } from 'node:child_process'

const LABEL = 'human-approved'
const CHECK = 'high-risk-paths'
const WORKFLOW = 'Human approval'
// Broad on purpose: a mention inside an argument may be denied too; a missed bypass is worse.
const SEGMENT = String.raw`[^\n;&|]*`
const GH = String.raw`\bgh\b(?:\s+(?:-R|--repo)[\s=](\S+))?`

const ADDS_LABEL = new RegExp(String.raw`(?:--add-label|--label|\s-l)[\s=]${SEGMENT}${LABEL}|${GH}${SEGMENT}\bapi\b${SEGMENT}labels${SEGMENT}${LABEL}`)
const API_MERGE = new RegExp(String.raw`${GH}${SEGMENT}\bapi\b${SEGMENT}pulls/\S+/merge`)
const PUSH_MAIN = new RegExp(String.raw`\bgit\b${SEGMENT}\bpush\b${SEGMENT}[\s:+](?:refs/heads/)?main(?=$|[\s;&|)])`)
const MERGE = new RegExp(String.raw`${GH}\s+pr\s+merge\b(?:\s+(\d+|https://github\.com/\S+/pull/\d+)(?=\s|$))?`)

function deny(reason) {
  process.stdout.write(JSON.stringify({
    hookSpecificOutput: { hookEventName: 'PreToolUse', permissionDecision: 'deny', permissionDecisionReason: reason },
  }))
}

function checkMerge(pr, repo) {
  let checks
  try {
    checks = JSON.parse(execFileSync('gh', ['pr', 'view', pr, '--json', 'statusCheckRollup', ...(repo ? ['--repo', repo] : [])], { encoding: 'utf8' })).statusCheckRollup
  } catch (error) {
    return deny(`Не удалось прочитать проверки PR ${pr}: ${error.message}`)
  }
  // A queued run has no start time yet and is the newest.
  const started = check => check.startedAt && !check.startedAt.startsWith('0001') ? check.startedAt : '\uffff'
  const latest = checks
    .filter(check => check.name === CHECK && check.workflowName === WORKFLOW)
    .sort((a, b) => started(a).localeCompare(started(b)))
    .at(-1)
  if (latest?.status !== 'COMPLETED' || latest.conclusion !== 'SUCCESS') {
    deny(`Проверка ${CHECK} в PR ${pr}: ${latest ? `${latest.status} ${latest.conclusion ?? ''}`.trim() : 'нет'}. Если PR затрагивает рискованные пути, его сливают только после метки "${LABEL}" от человека на текущих коммитах. Не сливать и не ставить метку; сообщить пользователю ссылку на PR и список файлов (\`node scripts/risk-paths.mjs\`).`)
  }
}

const chunks = []
for await (const chunk of process.stdin) chunks.push(chunk)
const { tool_name: tool, tool_input: input = {} } = JSON.parse(Buffer.concat(chunks).toString('utf8'))

if (tool === 'Bash') {
  const command = input.command ?? ''
  const merge = MERGE.exec(command)
  if (ADDS_LABEL.test(command)) {
    deny(`Метку "${LABEL}" ставит только человек после проверки рискованных путей.`)
  } else if (API_MERGE.test(command) || PUSH_MAIN.test(command)) {
    deny('Изменения попадают в main только через `gh pr merge <номер>` после проверок PR.')
  } else if (merge && !merge[2]) {
    deny('Укажите PR явно: `gh pr merge <номер> …`, чтобы хук проверил одобрение.')
  } else if (merge) {
    checkMerge(merge[2], merge[1])
  }
} else if (tool === 'mcp__ccd_pr__set_auto_merge' && input.enabled) {
  checkMerge(input.url)
}
