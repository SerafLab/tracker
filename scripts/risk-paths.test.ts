import { expect, it } from 'vitest'
import { highRiskFiles } from './risk-paths.mjs'

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
