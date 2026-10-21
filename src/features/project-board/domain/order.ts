export type Positioned = { position: number }

export function moveByOffset<T extends Positioned & { id: string }>(items: readonly T[], id: string, offset: -1 | 1): T[] {
  const index = items.findIndex(item => item.id === id)
  const target = index + offset
  if (index < 0 || target < 0 || target >= items.length) return [...items]
  const moved = [...items]
  ;[moved[index], moved[target]] = [moved[target], moved[index]]
  return moved.map((item, position) => ({ ...item, position }))
}


/** Insert after peers and before every lower-priority group. */
export function placeCardInGroup<T extends Positioned & { id: string; important: boolean; urgent: boolean }>(items: readonly T[], card: T): T[] {
  const priority = (item: T) => Number(item.important) * 2 + Number(item.urgent)
  const ordered = items.filter(item => item.id !== card.id)
  const next = ordered.findIndex(item => priority(item) < priority(card))
  ordered.splice(next < 0 ? ordered.length : next, 0, card)
  return ordered.map((item, position) => ({ ...item, position }))
}
