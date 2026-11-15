// Claude Code PreToolUse hook: only a human approves high-risk PRs.
// Denies adding the approval label, and merging (or enabling auto-merge for) a PR that touches
// high-risk paths without that label. Fails closed when the PR cannot be read. See REVIEW.md.
import { execFileSync } from 'node:child_process'
import { APPROVAL_LABEL, highRiskFiles } from './risk-paths.mjs'

const ADDS_LABEL = new RegExp(`--add-label[\\s=]+\\S*${APPROVAL_LABEL}|\\bgh\\s+(api|label)\\b[^\\n;&|]*${APPROVAL_LABEL}`)
const MERGE = /\bgh\s+pr\s+merge\b(?:\s+(\d+|https:\/\/github\.com\/\S+\/pull\/\d+)(?=\s|$))?/

function deny(reason) {
  process.stdout.write(JSON.stringify({
    hookSpecificOutput: { hookEventName: 'PreToolUse', permissionDecision: 'deny', permissionDecisionReason: reason },
  }))
}

function checkMerge(pr) {
  let view
  try {
    view = JSON.parse(execFileSync('gh', ['pr', 'view', pr, '--json', 'files,labels'], { encoding: 'utf8' }))
  } catch (error) {
    return deny(`Не удалось прочитать PR ${pr} для проверки рискованных путей: ${error.message}`)
  }
  const risky = highRiskFiles(view.files.map(file => file.path))
  if (risky.length > 0 && !view.labels.some(label => label.name === APPROVAL_LABEL)) {
    deny(`PR ${pr} затрагивает рискованные пути и ждёт проверки человеком (метка "${APPROVAL_LABEL}"): ${risky.join(', ')}. Не сливать; сообщить пользователю список файлов. Метку ставит только человек.`)
  }
}

const chunks = []
for await (const chunk of process.stdin) chunks.push(chunk)
const { tool_name: tool, tool_input: input = {} } = JSON.parse(Buffer.concat(chunks).toString('utf8'))

if (tool === 'Bash') {
  const command = input.command ?? ''
  const merge = MERGE.exec(command)
  if (ADDS_LABEL.test(command)) {
    deny(`Метку "${APPROVAL_LABEL}" ставит только человек после проверки рискованных путей.`)
  } else if (merge && !merge[1]) {
    deny('Укажите PR явно: `gh pr merge <номер> …`, чтобы хук проверил рискованные пути.')
  } else if (merge) {
    checkMerge(merge[1])
  }
} else if (tool === 'mcp__ccd_pr__set_auto_merge' && input.enabled) {
  checkMerge(input.url)
}
