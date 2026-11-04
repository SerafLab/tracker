# Card creation entry QA

Checked on 2026-11-04 in `codex/nov04-header-card-creation`, starting at `d05bfa0` (accepted integration state with the viewport-bounded board workspace from `add-card-details` and the subgrid columns from `board-column-visual-separation`). This report covers the two creation entries, their visibility rule and the bounded per-list scrolling; it does not revise the historical `calm-board-qa.md`.

## Environment and results

Chromium via Playwright, production Vite/PWA build on port 4289. Final command on the committed implementation: `E2E_PORT=4289 VITEST_MAX_WORKERS=2 npm run check`.

Result (exit 0, no hook or check bypassed): architecture boundaries OK; 28 unit/UI files, 281 tests passed; MCP transport probe passed; build OK; 185 browser tests passed (`185 passed (50.7s)`).

Screenshots in `card-creation-screenshots/` are real browser output of `e2e/calm-board.spec.ts`. Geometry assertions cover every matrix cell; images were opened selectively.

## Visually inspected

- `bounded-board-1280.png` (RU, 1280 x 800, statuses of 30, 25, 1 and 12 cards): four columns stay together at the left with the design gap, every header shows the green plus before the menu, only the card lists are cut at the same line above each bottom entry, the one-card status keeps its entry at the bottom, the install entry sits below the board and does not cover it.
- `bounded-board-390.png` and `bounded-board-320.png` (RU, last status after horizontal scroll): the board ends above the install entry, the list scrolls inside the column, the lower entry is fully visible, no page overflow.
- `calm-ru-1280.png` (RU, four statuses, long wrapped names): header plus, count and menu do not overlap the wrapped titles; list starts align across all columns; the test scrolled the first list, so its first card is cut by the list edge as intended.
- `creation-tooltip-last-en-1440.png` (EN, last column, 1440 px): the localized "Add card" hint is readable below the header plus and not clipped.
- `creation-long-list-en-Enter.png` (EN, 390 px, 15 cards): the header stays visible and the lower entry stays at the column bottom after a long list is reviewed.

Not opened: the other RU/EN matrix images (`calm-*-320/390/1440`, `calm-en-1280`, `bounded-board-1440`, `creation-long-list-ru-Enter`, `creation-tooltip-first-ru-320`).

## Entries and visibility

The header plus, the lower footer square and the application-bar status plus have identical 44 x 44 px boxes, color, radius and SVG path (matrix assertion). The footer is one button containing a noninteractive square and the label, so it is one Tab stop.

On a board with no cards every status shows the header plus and no lower entry; the global add-status plus remains. Creating the first card from a header shows lower entries in all statuses; deleting the last card hides them again. Covered by the unit test `offers the lower creation entry in every status only while the board has a card` and the browser test `header pluses remain on an empty board and lower entries follow the card count` (3 statuses, 1280 px). Visibility is derived from the loaded board, so deleting the last card through the native agent hides the entries the same way; no agent-specific test was added.

## Bounded board and scrolling

Browser test `only card lists scroll and lower entries stay at the bottom` at 320 x 568, 390 x 844, 1280 x 800 and 1440 x 900 (statuses of 30, 25, 1 and 12 cards): the document does not scroll; the board bottom is inside the workspace; on desktop the workspace does not scroll vertically; scrolling one list moves no other list, header or footer and does not change column height; the last card ends above the footer; keyboard focus on a deep card scrolls only its list; adding a card does not grow the board; shrinking the viewport by 120 px keeps every footer within the viewport height and the last column reachable horizontally; below 1280 px the single install entry follows the board in the same scroll area without overlapping it.

Browser test `creation entries stay at their column and keep focus at the end of a long list` (RU and EN, 390 px, 14 cards): Enter and Space on header and footer; after save, Cancel or Escape the opener is focused, `scrollY` stays 0, the list scroll and footer position change by less than 1 px, and both entries stay in the viewport. `createAfterCards` is retained for the footer.

Drag and drop: `a card can be dropped into a scrolled list and the list autoscrolls during a drag` (1280 px) drops into a list scrolled by 600 px and verifies that holding near its lower edge scrolls that list. The existing drag specs were adapted: autoscroll now targets `.card-list` and a native touch swipe scrolls the list. Overscroll containment on `.card-list` is limited to the y axis, otherwise horizontal touch panning over a card did not chain to the board.

Panel: the existing 1280/1440 board-beside-panel tests (four columns, aligned list starts, expanded note previews) pass; list scroll position survives opening, expanding and closing a card.

## Remaining limits

Below 20rem of available height the board stops shrinking and the workspace scrolls as a fallback. At 320 px only one column is visible, so other footers are checked by geometry, not on screen. A mobile browser bar was only emulated by resizing the viewport.
