# Column boundaries and aligned headers

2026-11-04; feature branch codex/nov04-column-boundaries, base 9c8f10c.

CSS grid/subgrid shares the header track without measuring DOM or storing layout state. Every status has a subtle token-based border and translucent neutral surface. The accepted menu/DnD controls remain; arrows are not reintroduced. Horizontal board scrolling and desktop four-column fit remain.

The calm-board browser matrix checks RU/EN at 320/390/1280/1440, a short title and a title of at least four lines, equal list-start coordinates, visible one-pixel boundaries, independent controls, touch-target sizes, no document x-overflow and four desktop columns without horizontal board overflow. Both creation entries and focus preservation after a long list are covered. Targeted 10/10 PASS. Inspected RU 320 and EN 1440 PNGs: restrained boundaries, shared header areas, readable names and controls without overlap. Screenshots remain in test-results rather than duplicating the whole generated matrix.

This CSS change is independent of panel navigation: relative grid tracks adapt to available width. It can be implemented on accepted catalogue/headings base and merged after the panel. The subsequent viewport/creation change bounds the middle track and scrolls each card list separately.

Full VITEST_MAX_WORKERS=2 E2E_PORT=4285 npm run check PASS: 259 unit/UI,3 probe,135 browser; build and architecture check passed.

## Re-verification on the accepted integration base (dc0a53c)

2026-11-04; merged codex/active-changes-nov03 (dc0a53c: catalogue tiles, AppBar headings, card panel/page, viewport-bounded board under a fixed AppBar, recent note previews) with a no-ff merge; no textual conflicts and no CSS change was needed. Subgrid header alignment, one-pixel boundaries, horizontal board scroll and four-column desktop fit hold on the bounded layout.

New calm-board e2e (RU/EN at 1280/1440, 4/4 PASS): four statuses including a four-line title, a card with an expanded six-note preview (variable card heights); equal list-start coordinates and 1px borders with the panel closed and open; with the panel open the board stays left of the panel, scrolls horizontally, keeps columns at least 260px wide, the last column and its add button stay reachable, the preview stays expanded and the document has no x-overflow. Inspected RU 1280 panel-open PNG: boundaries and list starts aligned, board scrolled horizontally beside the panel. Existing 320/390 matrix unchanged.

The middle track remains `minmax(0, 1fr)` and card lists are not scrolled separately, so add-status-header-card-creation can bound the track and give each list its own scroll without changing the subgrid header rows.

Review follow-up: tracks are `minmax(16.25rem, 24rem)` with `justify-content: start`, so with 2 or 3 statuses at 1440 px columns sit together on the left at the normal gap (new e2e, +-1 px); the column surface is the `--column-surface` token.
