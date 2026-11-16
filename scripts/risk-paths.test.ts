import { expect, it } from 'vitest'
import { highRiskFiles, parseAddedLines, securityFiles } from './risk-paths.mjs'

it('keeps exact high-risk files and files under high-risk directories', () => {
  expect(highRiskFiles([
    'src/features/project-board/infrastructure/indexeddb/database.ts',
    'src/app/backup/delivery.ts',
    '.github/workflows/ci.yml',
    'docs/agents/rules/testing.md',
    'src/app/pwa/update-notice.tsx',
  ])).toHaveLength(5)
})

it('treats linter and TypeScript configuration as high risk', () => {
  const configs = ['.oxlintrc.json', '.stylelintrc.json', 'tsconfig.json', 'tsconfig.app.json', 'tsconfig.node.json']
  expect(highRiskFiles(configs)).toEqual(configs)
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
  const files = ['src/features/sync/client.ts', 'src/ui/link.tsx', 'src/ui/channel.ts', 'src/ui/frame.ts', 'src/app/agent.ts', 'src/ui/prefs.ts', 'src/ui/panel.tsx', 'src/ui/panel.test.tsx', 'docs/notes.md']
  expect(securityFiles(files, {
    'src/features/sync/client.ts': ['  const response = await fetch(url, { headers })'],
    'src/ui/link.tsx': ['  return <a href={card.url}>{card.name}</a>'],
    'src/ui/channel.ts': ['  window.addEventListener(', "    'message',", '    handle,', '  )'],
    'src/ui/frame.ts': ['  window.onmessage = handle'],
    'src/app/agent.ts': ['  document.modelContext?.registerTool(tool)'],
    'src/ui/prefs.ts': ['  localStorage.setItem(key, next)'],
    'src/ui/panel.tsx': ['  return <div className="panel" />'],
    'src/ui/panel.test.tsx': ['  el.innerHTML = "<b>x</b>"'],
    'docs/notes.md': ['Call fetch(url) here'],
  })).toEqual(['src/features/sync/client.ts', 'src/ui/link.tsx', 'src/ui/channel.ts', 'src/ui/frame.ts', 'src/app/agent.ts'])
})

it('parses added lines per file from git diff -U0, ignoring deletions and "+++" inside hunks', () => {
  const diff = [
    'diff --git a/src/a.ts b/src/a.ts',
    'index 1..2 100644',
    '--- a/src/a.ts',
    '+++ b/src/a.ts',
    '@@ -1,0 +2,2 @@',
    '+++ counter',
    '+fetch(url)',
    'diff --git a/src/gone.ts b/src/gone.ts',
    'deleted file mode 100644',
    '--- a/src/gone.ts',
    '+++ /dev/null',
    '@@ -1 +0,0 @@',
    '-old',
    'diff --git a/src/ж.ts b/src/ж.ts',
    '--- a/src/ж.ts',
    '+++ b/src/ж.ts',
    '@@ -0,0 +1 @@',
    '+x',
    'diff --git a/src/a b.ts b/src/a b.ts',
    '--- a/src/a b.ts',
    '+++ b/src/a b.ts\t',
    '@@ -0,0 +1 @@',
    '+x',
  ].join('\n')
  expect(parseAddedLines(diff)).toEqual({ 'src/a.ts': ['++ counter', 'fetch(url)'], 'src/ж.ts': ['x'], 'src/a b.ts': ['x'] })
})
