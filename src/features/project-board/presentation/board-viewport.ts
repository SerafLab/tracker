/** The board's single scroller: the workspace below the application bar that scrolls every status together. */
export function boardScroller(element: Element | null | undefined) {
  return element?.closest<HTMLElement>('[data-board-scroller]') ?? null
}

/** Bottom edge of the sticky header of the status that contains `element`, or null outside a status. */
export function statusHeaderBottom(element: Element) {
  return element.closest('[data-status-id]')?.querySelector('.column-header')?.getBoundingClientRect().bottom ?? null
}

/**
 * Whether a control inside the board is hidden by scrolling: outside the board scroller, or, for controls below
 * a status header, mostly covered by that sticky header. Returns null for controls outside the board.
 */
export function hiddenInBoard(element: Element) {
  const scroller = boardScroller(element)
  if (!scroller) return null
  const box = element.getBoundingClientRect(), bounds = scroller.getBoundingClientRect()
  if (box.bottom <= bounds.top || box.top >= bounds.bottom || box.right <= bounds.left || box.left >= bounds.right) return true
  if (element.closest('.column-header')) return false
  const headerBottom = statusHeaderBottom(element)
  return headerBottom !== null && box.top + box.height / 2 < headerBottom
}
