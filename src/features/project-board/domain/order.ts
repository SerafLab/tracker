export type Positioned = { position: number }

export function moveByOffset<T extends Positioned & { id: string }>(items: readonly T[], id: string, offset: -1 | 1): T[] {
  const index = items.findIndex(item => item.id === id)
  const target = index + offset
  if (index < 0 || target < 0 || target >= items.length) return [...items]
  const moved = [...items]
  ;[moved[index], moved[target]] = [moved[target], moved[index]]
  return moved.map((item, position) => ({ ...item, position }))
}
