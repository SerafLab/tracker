import { expect, it } from 'vitest'
import { build } from './build'

it('receives the build version and commit', () => {
  expect(build.version).toMatch(/^\d+\.\d+\.\d+/)
  expect(build.commit).not.toBe('')
})
