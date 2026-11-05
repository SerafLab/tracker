const enabledItems = '[role^="menuitem"]:not(:disabled)'

export function focusFirstMenuItem(menu: HTMLElement | null) {
  menu?.querySelector<HTMLElement>(enabledItems)?.focus({ preventScroll: true })
}

/** Moves focus between enabled menu items for Arrow Up/Down, wrapping at the ends. */
export function moveMenuFocus(menu: HTMLElement | null, key: string) {
  if (!menu || (key !== 'ArrowDown' && key !== 'ArrowUp')) return false
  const items = Array.from(menu.querySelectorAll<HTMLElement>(enabledItems))
  const index = items.indexOf(document.activeElement as HTMLElement)
  const next = index < 0 ? (key === 'ArrowDown' ? 0 : items.length - 1) : (index + (key === 'ArrowDown' ? 1 : -1) + items.length) % items.length
  items[next]?.focus()
  return true
}
