import type { Card, CardPlacement } from './model'

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


export const cardPriority = (card: Pick<Card, 'important' | 'urgent'>) => Number(card.important) * 2 + Number(card.urgent)
export const sameCardGroup = (a: Pick<Card, 'important' | 'urgent'>, b: Pick<Card, 'important' | 'urgent'>) => a.important === b.important && a.urgent === b.urgent
export const appendPlacement = (card: Card, statusId: string): CardPlacement => ({ statusId, beforeCardId: null, expected: { statusId: card.statusId, important: card.important, urgent: card.urgent } })

/** All arguments are confirmed records. An anchor refers to the list after excluding the source. */
export function placeCard(source: readonly Card[], target: readonly Card[], card: Card, placement: CardPlacement) {
  if (card.statusId !== placement.expected.statusId || !sameCardGroup(card, placement.expected)) throw new Error('stale_placement')
  if (!source.some(item => item.id === card.id)) throw new Error('source_not_found')
  if (placement.beforeCardId === card.id) throw new Error('invalid_anchor')
  const remaining = target.filter(item => item.id !== card.id)
  const anchor = placement.beforeCardId === null ? undefined : remaining.find(item => item.id === placement.beforeCardId)
  if (placement.beforeCardId !== null && (!anchor || anchor.statusId !== placement.statusId || !sameCardGroup(anchor, card))) throw new Error('invalid_anchor')
  const at = anchor ? remaining.indexOf(anchor) : remaining.findIndex(item => cardPriority(item) < cardPriority(card))
  const nextTarget = [...remaining]
  nextTarget.splice(at < 0 ? nextTarget.length : at, 0, { ...card, statusId: placement.statusId })
  const normalizedTarget = nextTarget.map((item, position) => ({ ...item, position }))
  const normalizedSource = card.statusId === placement.statusId ? normalizedTarget : source.filter(item => item.id !== card.id).map((item, position) => ({ ...item, position }))
  const unchanged = card.statusId === placement.statusId && source.length === normalizedTarget.length && source.every((item, index) => item.id === normalizedTarget[index].id)
  return { source: normalizedSource, target: normalizedTarget, unchanged }
}

export function peerPlacement(cards: readonly Card[], card: Card, direction: -1 | 1): CardPlacement | undefined {
  const peers = cards.filter(item => sameCardGroup(item, card))
  const index = peers.findIndex(item => item.id === card.id)
  if (index < 0 || !peers[index + direction]) return undefined
  return { ...appendPlacement(card, card.statusId), beforeCardId: direction === -1 ? peers[index - 1].id : peers[index + 2]?.id ?? null }
}
