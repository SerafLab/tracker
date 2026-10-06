import { describe, expect, it } from 'vitest'
import { requiredName } from './domain'

describe('requiredName', () => {
  it('trims a valid name and rejects whitespace', () => {
    expect(requiredName('  Поиск квартиры  ')).toBe('Поиск квартиры')
    expect(requiredName('  ')).toBeNull()
  })
})
