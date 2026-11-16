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
  '.github/',
  '.githooks/',
  '.claude/settings.json',
  'scripts/guard-human-approval.mjs',
  'scripts/limit-runner-launches.mjs',
  'scripts/cross-review.sh',
]

// Added source lines that open a new channel for outside input or code: network, messaging, raw HTML,
// URLs in markup (a user value may be a `javascript:` URL), eval.
export const SECURITY_PATTERN = /\bfetch\(|XMLHttpRequest|WebSocket|EventSource|sendBeacon|postMessage|BroadcastChannel|\bonmessage\b|['"]message['"]\s*[,)]|innerHTML|outerHTML|insertAdjacentHTML|document\.write|dangerouslySetInnerHTML|\b(?:href|src|srcDoc)=\{|srcdoc|target=["']_blank|linkify|location\.(?:hash|search)|\beval\(|new Function\(|window\.open\(|modelContext|document\.cookie/i

const matches = (paths, file) => paths.some(path => (path.endsWith('/') ? file.startsWith(path) : file === path))

export function highRiskFiles(files) {
  return files.filter(file => matches(HIGH_RISK_PATHS, file))
}

// `added` maps a file to its added lines.
export function securityFiles(files, added = {}) {
  return files.filter(file => !/\.test\.tsx?$/.test(file) && (matches(SECURITY_PATHS, file)
    || (/^src\/.*\.tsx?$/.test(file) && (added[file] ?? []).some(line => SECURITY_PATTERN.test(line)))))
}

// Added lines per file from `git diff -U0` output; `+++` counts as a header only before the first hunk.
export function parseAddedLines(diff) {
  const added = {}
  let file
  let header = false
  for (const line of diff.split('\n')) {
    if (line.startsWith('diff --git ')) header = true
    else if (line.startsWith('@@')) header = false
    else if (header && line.startsWith('+++ ')) file = line.startsWith('+++ b/') ? line.slice(6).replace(/\t$/, '') : undefined
    else if (!header && file && line.startsWith('+')) (added[file] ??= []).push(line.slice(1))
  }
  return added
}

// Plain output regardless of user config: no colour, external diff tool or custom prefixes.
const git = (...args) => execFileSync('git', ['-c', 'core.quotePath=false', ...args], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 })

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const args = process.argv.slice(2)
  const unknown = args.find(arg => arg.startsWith('-') && arg !== '--security')
  if (unknown) throw new Error(`Unknown option ${unknown}. Usage: node scripts/risk-paths.mjs [--security] [base] [head]`)
  const security = args.includes('--security')
  const [base = 'origin/main', head = 'HEAD'] = args.filter(arg => arg !== '--security')
  const range = `${base}...${head}`
  const changed = git('diff', '--name-only', '--no-renames', '--no-color', range).split('\n').filter(Boolean)
  const files = security ? securityFiles(changed, parseAddedLines(git('diff', '-U0', '--no-renames', '--no-color', '--no-ext-diff', '--src-prefix=a/', '--dst-prefix=b/', range))) : highRiskFiles(changed)
  for (const file of files) console.log(file)
}
