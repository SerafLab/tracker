import { describe, expect, it } from 'vitest'

describe('test environment', () => {
  it('provides IndexedDB', () => {
    expect(indexedDB).toBeDefined()
  })
})
