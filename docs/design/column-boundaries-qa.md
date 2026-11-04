# Column boundaries and aligned headers

2026-11-04; feature branch codex/nov04-column-boundaries, base9c8f10c.

CSS grid/subgrid shares the header track without measuring DOM or storing layout state. Every status has a subtle token-based border and translucent neutral surface. The accepted menu/DnD controls remain; arrows are not reintroduced. Horizontal board scrolling and desktop four-column fit remain.

The calm-board browser matrix checks RU/EN at320/390/1280/1440, a short title and a title of at least four lines, equal list-start coordinates, visible one-pixel boundaries, independent controls, touch-target sizes, no document x-overflow and four desktop columns without horizontal board overflow. Both creation entries and focus preservation after a long list are covered. Targeted10/10 PASS. Inspected RU320 and EN1440 PNGs: restrained boundaries, shared header areas, readable names and controls without overlap. Screenshots remain in test-results rather than duplicating the whole generated matrix.

This CSS change is independent of panel navigation: relative grid tracks adapt to available width. It can be implemented on accepted catalogue/headings base and merged after the panel. The subsequent viewport/creation change bounds the middle track and scrolls each card list separately.

Full VITEST_MAX_WORKERS=2 E2E_PORT=4285 npm run check PASS:259 unit/UI,3 probe,135 browser; build and architecture check passed.
