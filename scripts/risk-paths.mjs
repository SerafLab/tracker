// High-risk paths: a PR touching any of them needs a human review and the `human-approved` label.
// Security-relevant changes: a PR with any of them needs `/security-review`.
// CLI: `node scripts/risk-paths.mjs [--security] [base] [head]` prints the high-risk (or security-relevant)
// files changed in base...head (defaults: origin/main...HEAD), one per line. See REVIEW.md and AGENTS.md.
import { execFileSync } from 'node:child_process'
import { pathToFileURL } from 'node:url'

export const APPROVAL_LABEL = 'human-approved'

// Entries ending with "/" match a directory prefix, others match one file.
export const HIGH_RISK_PATHS = [
  // Stored user data: IndexedDB schema and migrations, backup format, restore.
  'src/features/project-board/infrastructure/indexeddb/database.ts',
  'src/features/project-board/application/backup.ts',
  'src/features/project-board/domain/backup.ts',
  'src/app/backup/',
  // Service worker and build: a broken update strands installed copies.
  'vite.config.ts',
  'src/app/pwa/',
  // Dependencies and the check script itself.
  'package.json',
  'package-lock.json',
  '.nvmrc',
  // Gates: CI, deploy, hooks, test runners, architecture rules.
  '.github/',
  '.githooks/',
  '.claude/settings.json',
  'scripts/risk-paths.mjs',
  'scripts/guard-human-approval.mjs',
  'scripts/limit-runner-launches.mjs',
  'scripts/check-architecture.mjs',
  'scripts/cross-review.sh',
  'scripts/mcp-transport-probe.check.mjs',
  'scripts/theme-contrast.check.mjs',
  'vitest.config.ts',
  'playwright.config.ts',
  // Agent process rules.
  'AGENTS.md',
  'CLAUDE.md',
  'REVIEW.md',
  'docs/agents/rules/',
  '.codex/',
  '.agents/',
]

// Where outside input enters or code runs with privileges.
export const SECURITY_PATHS = [
  'src/features/project-board/presentation/card-detail-view.tsx', // user text rendered as links
  'src/app/webmcp/', // tools exposed to external agents
  'src/features/project-board/application/backup.ts', // untrusted backup files
  'src/features/project-board/domain/backup.ts',
  'src/app/backup/',
  'index.html',
  'public/',
  'vite.config.ts',
  'package.json',
  'package-lock.json',
  '.github/workflows/',
  '.githooks/',
  '.claude/settings.json',
  'scripts/guard-human-approval.mjs',
  'scripts/cross-review.sh',
]

// Added source lines that open a new channel for outside input or code: network, messaging, raw HTML, eval.
export const SECURITY_PATTERN = /\bfetch\(|XMLHttpRequest|WebSocket|EventSource|postMessage|addEventListener\(\s*['"]message|innerHTML|dangerouslySetInnerHTML|\beval\(|new Function\(|window\.open\(|navigator\.modelContext|localStorage|sessionStorage|document\.cookie/

const matches = (paths, file) => paths.some(path => (path.endsWith('/') ? file.startsWith(path) : file === path))

export function highRiskFiles(files) {
  return files.filter(file => matches(HIGH_RISK_PATHS, file))
}

// `added` maps a file to its added lines.
export function securityFiles(files, added = {}) {
  return files.filter(file => !/\.test\.tsx?$/.test(file) && (matches(SECURITY_PATHS, file)
    || (/^src\/.*\.tsx?$/.test(file) && (added[file] ?? []).some(line => SECURITY_PATTERN.test(line)))))
}

function addedLines(range) {
  const added = {}
  let file
  for (const line of execFileSync('git', ['diff', '-U0', '--no-renames', range], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 }).split('\n')) {
    if (line.startsWith('+++ ')) file = line.slice(6)
    else if (line.startsWith('+') && file) (added[file] ??= []).push(line.slice(1))
  }
  return added
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const args = process.argv.slice(2)
  const security = args.includes('--security')
  const [base = 'origin/main', head = 'HEAD'] = args.filter(arg => arg !== '--security')
  const range = `${base}...${head}`
  const changed = execFileSync('git', ['diff', '--name-only', '--no-renames', range], { encoding: 'utf8' }).split('\n').filter(Boolean)
  for (const file of security ? securityFiles(changed, addedLines(range)) : highRiskFiles(changed)) console.log(file)
}
