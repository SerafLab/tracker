import { describe, expect, it } from 'vitest'
import type { Card } from './model'
import { appendPlacement, peerPlacement, placeCard } from './order'
const card = (id: string, position: number, important = true, urgent = false, statusId = 's'): Card => ({ id, position, statusId, name: id, description: 'Details', important, urgent })
const source = [card('both', 0, true, true), card('a', 1), card('b', 2), card('c', 3), card('urgent', 4, false, true), card('none', 5, false)]
const ids = (cards: Card[]) => cards.map(card => card.id)
describe('exact within-group placement', () => {
  it.each([['a', 'c', ['both', 'b', 'a', 'c', 'urgent', 'none']], ['c', 'a', ['both', 'c', 'a', 'b', 'urgent', 'none']], ['a', null, ['both', 'b', 'c', 'a', 'urgent', 'none']]] as const)('places %s before %s without mutating the input', (id, before, expected) => {
    const beforeSource = structuredClone(source), current = source.find(item => item.id === id)!
    const result = placeCard(source, source, current, { ...appendPlacement(current, 's'), beforeCardId: before })
    expect(ids(result.target)).toEqual(expected); expect(result.target.map(item => item.position)).toEqual([0, 1, 2, 3, 4, 5])
    expect(source).toEqual(beforeSource)
  })
  it('supports same-position no-op and valid one-step menu moves', () => {
    const a = source[1], b = source[2], c = source[3]
    expect(placeCard(source, source, a, { ...appendPlacement(a, 's'), beforeCardId: b.id }).unchanged).toBe(true)
    expect(peerPlacement(source, a, -1)).toBeUndefined(); expect(peerPlacement(source, c, 1)).toBeUndefined()
    expect(peerPlacement(source, b, -1)?.beforeCardId).toBe('a')
    expect(peerPlacement(source, b, 1)?.beforeCardId).toBe(null)
    expect(ids(placeCard(source, source, b, peerPlacement(source, b, 1)!).target)).toEqual(['both', 'a', 'c', 'b', 'urgent', 'none'])
  })
  it('moves into the beginning, middle and end of a target group and normalizes both statuses', () => {
    const a = source[1], target = [card('top', 0, true, true, 't'), card('x', 1, true, false, 't'), card('y', 2, true, false, 't'), card('tail', 3, false, false, 't')]
    for (const [before, expected] of [['x', ['top', 'a', 'x', 'y', 'tail']], ['y', ['top', 'x', 'a', 'y', 'tail']], [null, ['top', 'x', 'y', 'a', 'tail']]] as const) {
      const result = placeCard(source, target, a, { ...appendPlacement(a, 't'), beforeCardId: before })
      expect(ids(result.target)).toEqual(expected); expect(ids(result.source)).toEqual(['both', 'b', 'c', 'urgent', 'none'])
      expect(result.target.find(item => item.id === 'a')).toMatchObject({ description: 'Details', important: true, urgent: false, statusId: 't' })
      expect(result.source.map(item => item.position)).toEqual([0, 1, 2, 3, 4])
    }
    expect(ids(placeCard(source, [], a, appendPlacement(a, 't')).target)).toEqual(['a'])
    expect(ids(placeCard(source, [target[0], target[3]], a, appendPlacement(a, 't')).target)).toEqual(['top', 'a', 'tail'])
  })
  it.each(['a', 'absent', 'both', 'urgent'])('rejects invalid or cross-group anchor %s', anchor => {
    expect(() => placeCard(source, source, source[1], { ...appendPlacement(source[1], 's'), beforeCardId: anchor })).toThrow('invalid_anchor')
  })
  it('rejects stale expected source status or flags', () => {
    for (const expected of [{ statusId: 'other', important: true, urgent: false }, { statusId: 's', important: false, urgent: false }]) expect(() => placeCard(source, source, source[1], { ...appendPlacement(source[1], 's'), expected })).toThrow('stale_placement')
  })
})
