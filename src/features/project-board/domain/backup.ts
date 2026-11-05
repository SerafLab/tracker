import type { Card, Note, Project, Status } from './model'
import { cardPriority } from './order'

export type BackupData = { projects: Project[]; statuses: Status[]; cards: Card[]; notes: Note[] }

/** A UTC timestamp exactly as `toISOString()` writes it: offsets, missing milliseconds, hour 24 and nonexistent days change the string on a round trip. */
export function isIsoDate(value: string) {
  const date = new Date(value)
  return !Number.isNaN(date.getTime()) && date.toISOString() === value
}

const unique = (ids: string[]) => new Set(ids).size === ids.length

/** Positions of every owner's items must run 0, 1, 2... Returns the items grouped by owner, ordered by position. */
function groupedByOwner<T extends { position: number }>(items: T[], owner: (item: T) => string) {
  const groups = new Map<string, T[]>()
  for (const item of items) groups.set(owner(item), [...(groups.get(owner(item)) ?? []), item])
  for (const group of groups.values()) group.sort((a, b) => a.position - b.position)
  return [...groups.values()]
}
const consecutive = (group: Array<{ position: number }>) => group.every((item, index) => item.position === index)

/** Pure check; nothing is repaired. True when the data is internally consistent. */
export function checkBackupIntegrity({ projects, statuses, cards, notes }: BackupData): boolean {
  if (![projects, statuses, cards, notes].every(table => unique(table.map(item => item.id)))) return false
  const projectIds = new Set(projects.map(project => project.id))
  const statusIds = new Set(statuses.map(status => status.id))
  const cardIds = new Set(cards.map(card => card.id))
  if (statuses.some(status => !projectIds.has(status.projectId))) return false
  if (cards.some(card => !statusIds.has(card.statusId))) return false
  if (notes.some(note => !cardIds.has(note.cardId))) return false
  if (![...projects, ...statuses, ...cards].every(item => item.name.trim() !== '') || notes.some(note => note.text.trim() === '')) return false
  if (projects.some(project => !isIsoDate(project.createdAt))) return false
  if (notes.some(note => !isIsoDate(note.createdAt) || (note.updatedAt !== undefined && !isIsoDate(note.updatedAt)))) return false
  const statusGroups = groupedByOwner(statuses, status => status.projectId)
  const cardGroups = groupedByOwner(cards, card => card.statusId)
  if (!statusGroups.every(consecutive) || !cardGroups.every(consecutive)) return false
  return cardGroups.every(group => group.every((card, index) => index === 0 || cardPriority(card) <= cardPriority(group[index - 1])))
}
