import { expect, it } from 'vitest'
import { highRiskFiles, securityFiles } from './risk-paths.mjs'

it('keeps exact high-risk files and files under high-risk directories', () => {
  expect(highRiskFiles([
    'src/features/project-board/infrastructure/indexeddb/database.ts',
    'src/app/backup/delivery.ts',
    '.github/workflows/ci.yml',
    'docs/agents/rules/testing.md',
    'src/app/pwa/update-notice.tsx',
  ])).toHaveLength(5)
})

it('ignores ordinary product, test and doc files', () => {
  expect(highRiskFiles([
    'src/features/project-board/infrastructure/indexeddb/database.test.ts',
    'src/ui/settings-entry.tsx',
    'scripts/backup-fixtures.mjs',
    'docs/agents/designer.md',
    'package.json.bak',
  ])).toEqual([])
})

it('marks entry points and privileged files as security-relevant, but not their tests', () => {
  expect(securityFiles([
    'src/app/webmcp/adapter.ts',
    'src/features/project-board/presentation/card-detail-view.tsx',
    '.github/workflows/ci.yml',
    'src/app/webmcp/adapter.test.ts',
    'src/ui/settings-entry.tsx',
  ])).toEqual(['src/app/webmcp/adapter.ts', 'src/features/project-board/presentation/card-detail-view.tsx', '.github/workflows/ci.yml'])
})

it('marks source files whose added lines open a network, messaging, HTML or eval channel', () => {
  const files = ['src/features/sync/client.ts', 'src/ui/panel.tsx', 'src/ui/panel.test.tsx', 'docs/notes.md']
  expect(securityFiles(files, {
    'src/features/sync/client.ts': ['  const response = await fetch(url, { headers })'],
    'src/ui/panel.tsx': ['  return <div className="panel" />'],
    'src/ui/panel.test.tsx': ['  el.innerHTML = "<b>x</b>"'],
    'docs/notes.md': ['Call fetch(url) here'],
  })).toEqual(['src/features/sync/client.ts'])
})
