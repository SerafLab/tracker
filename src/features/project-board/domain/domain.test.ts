import { describe, expect, it } from 'vitest'
import { requiredName } from './model'
import { moveByOffset, placeCardInGroup } from './order'

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


describe('card priority placement', () => {
  const card = (id: string, important: boolean, urgent: boolean) => ({ id, important, urgent, position: 20 })
  it('inserts all four groups, keeps peers stable, and fills empty groups', () => {
    let cards: ReturnType<typeof card>[] = []
    for (const item of [card('none', false, false), card('urgent', false, true), card('important', true, false), card('both', true, true), card('both2', true, true)]) cards = placeCardInGroup(cards, item)
    expect(cards.map(item => item.id)).toEqual(['both', 'both2', 'important', 'urgent', 'none'])
    expect(cards.map(item => item.position)).toEqual([0, 1, 2, 3, 4])
    const changed = placeCardInGroup(cards, { ...cards[0], important: false, urgent: false })
    expect(changed.map(item => item.id)).toEqual(['both2', 'important', 'urgent', 'none', 'both'])
    expect(placeCardInGroup(changed, { ...changed[4], important: true, urgent: true }).map(item => item.id)).toEqual(['both2', 'both', 'important', 'urgent', 'none'])
    expect(cards.map(item => item.id)).toEqual(['both', 'both2', 'important', 'urgent', 'none'])
  })
})
