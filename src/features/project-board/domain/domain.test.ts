import { describe, expect, it } from 'vitest'
import { requiredName } from './model'
import { moveByOffset } from './order'

describe('project-board domain', () => {
  it('trims a valid name and rejects whitespace', () => {
    expect(requiredName('  Поиск квартиры  ')).toBe('Поиск квартиры')
    expect(requiredName('  ')).toBeNull()
  })

  it('moves a positioned item without mutating the input', () => {
    const statuses = [
      { id: 'found', position: 0 },
      { id: 'viewing', position: 1 },
    ]
    expect(moveByOffset(statuses, 'viewing', -1)).toEqual([
      { id: 'viewing', position: 0 },
      { id: 'found', position: 1 },
    ])
    expect(statuses.map(status => status.id)).toEqual(['found', 'viewing'])
  })
})
