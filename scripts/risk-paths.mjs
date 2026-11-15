// High-risk paths: a PR touching any of them needs a human review and the `human-approved` label.
// CLI: `node scripts/risk-paths.mjs [base] [head]` prints the high-risk files changed in base...head
// (defaults: origin/main...HEAD), one per line. See REVIEW.md.
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

export function highRiskFiles(files) {
  return files.filter(file => HIGH_RISK_PATHS.some(path => (path.endsWith('/') ? file.startsWith(path) : file === path)))
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const [base = 'origin/main', head = 'HEAD'] = process.argv.slice(2)
  const changed = execFileSync('git', ['diff', '--name-only', '--no-renames', `${base}...${head}`], { encoding: 'utf8' }).split('\n').filter(Boolean)
  for (const file of highRiskFiles(changed)) console.log(file)
}
