# Card creation entry QA

Checked on 2026-11-01 in `codex/status-header-card-creation`, starting at `3de01c2`. This report describes only the two creation entries; it does not revise the historical calm-board report.

## Environment and results

Node 24.21.0, Playwright 1.64.0, Chromium, production Vite/PWA build served at `http://127.0.0.1:4183/tracker/`. `npm ci` installed the mandatory `.githooks/pre-push` hook. Final `E2E_PORT=4183 npm run check` passed: architecture boundaries, 124 unit/UI tests, TypeScript and production build, 59 browser tests. No hook or check was bypassed.

The browser matrix covers RU and EN at 320, 390, 1280 and 1440 px, populated and empty statuses, wrapping names and an unbroken long name. Saved screenshots are real browser output from `e2e/calm-board.spec.ts`, copied from its test results. Representative narrow/wide boards, tooltips, long status and long list screenshots were visually inspected; automated geometry assertions cover every matrix cell.

| Width | Russian | English | Board result |
| --- | --- | --- | --- |
| 320 | [Board](card-creation-screenshots/calm-ru-320.png) | [Board](card-creation-screenshots/calm-en-320.png) | No page overflow; horizontal board scroll reaches all statuses |
| 390 | [Board](card-creation-screenshots/calm-ru-390.png) | [Board](card-creation-screenshots/calm-en-390.png) | No page overflow; both entries remain available |
| 1280 | [Board](card-creation-screenshots/calm-ru-1280.png) | [Board](card-creation-screenshots/calm-en-1280.png) | Four columns fit without board overflow |
| 1440 | [Board](card-creation-screenshots/calm-ru-1440.png) | [Board](card-creation-screenshots/calm-en-1440.png) | Four columns fit without board overflow |

## Appearance and placement

Browser assertions confirm that the application-bar status plus, header card plus and footer square have identical 44 × 44 px boxes, background color, corner radius and SVG path. The footer is one button containing a noninteractive square and the localized label; it has no nested interactive element or extra Tab stop. Hovering anywhere on that button highlights the same square, and the shared button focus outline surrounds the whole action. Both entries use the existing button and accent styles.

The header plus precedes the status menu. Long titles wrap in the remaining space, with a nonsqueezing count and 44 px buttons; measured heading/plus/menu rectangles do not overlap. The footer remains below the cards, including in an empty status. The previous `createAfterCards` assertion is retained.

The existing CSS hint remains readable inside the scroller, so another popover implementation was unnecessary. Hover and keyboard focus both reveal the localized hint; its measured bounds remain inside the scroller and viewport in the first and last columns, including after horizontal scroll:

- First-column hint at 320 px: [RU](card-creation-screenshots/creation-tooltip-first-ru-320.png), [EN](card-creation-screenshots/creation-tooltip-first-en-320.png).
- Last-column hint at 390 px: [RU](card-creation-screenshots/creation-tooltip-last-ru-390.png), [EN](card-creation-screenshots/creation-tooltip-last-en-390.png).
- Unbroken long status at 320 px: [RU](card-creation-screenshots/creation-long-status-ru-320.png), [EN](card-creation-screenshots/creation-long-status-en-320.png).

## Behavior, keyboard and failures

UI tests exercise each source separately in empty and populated statuses. Each opens exactly one compact card form in its own status; save, Cancel and Escape restore focus to the source. Both forms retain the name and flags after validation/storage errors, show an error without adding a card, and support retry or closing back to the original source. Existing creation helpers deliberately select the footer; browser matrix creation alternates header and footer, preserving grouping and saved values.

The long-list browser scenario creates fourteen cards, then operates both entries with Enter and Space. It saves a fifteenth card through the footer, reopens and dismisses with Escape, and verifies restored focus without jumping to the header. Scroll change is bounded to normal content/layout adjustment; after footer actions, the header remains above the viewport. The footer can move down when a newly appended card increases the list; focus restoration uses `preventScroll` and does not force a jump to another entry.

Long-list screenshots after creation: [RU](card-creation-screenshots/creation-long-list-ru-Enter.png), [EN](card-creation-screenshots/creation-long-list-en-Enter.png).

Specification sync and archival are reserved for the integration branch; implementation and its QA are complete in this feature branch.
