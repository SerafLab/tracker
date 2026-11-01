# Card details QA

Verified on 2026-11-01 in `codex/card-details`, from base `3de01c2`. The branch contains the detail page, description, personal note history and draft protection. Publication and specification archival are separate integration steps.

## Automated verification

Final `E2E_PORT=4181 npm run check` passed:

- Architecture boundary check.
- 143 unit/UI tests across 18 files.
- TypeScript and the production Vite/PWA build.
- 65 Chromium browser tests, including the six detail-page language/viewport scenarios and indexed-history/native-close regressions.

Environment: Node 24.21.0 and Playwright 1.64.0, browser production build served from `http://127.0.0.1:4181/tracker/`. The versioned pre-push hook remains configured. No required check or hook was bypassed.

## Actual browser screenshots

These PNG files were copied from the final browser test output. Narrow and wide screenshots were visually inspected. The snapshots include multiline description, a long web link, literal markup, a focused field, and an edited note with local date formatting.

| Width | Russian | English |
| --- | --- | --- |
| 320 px | [Screenshot](card-details-screenshots/details-ru-320.png) | [Screenshot](card-details-screenshots/details-en-320.png) |
| 390 px | [Screenshot](card-details-screenshots/details-ru-390.png) | [Screenshot](card-details-screenshots/details-en-390.png) |
| 1280 px | [Screenshot](card-details-screenshots/details-ru-1280.png) | [Screenshot](card-details-screenshots/details-en-1280.png) |

Fields, history and actions remain readable. Long links and note dates wrap, the page has no horizontal overflow, and the focused name field has a visible outline. Textareas keep their ordinary internal scrolling. Saved HTTP/HTTPS links open separately with `noopener noreferrer`; HTML and Markdown remain literal text. Dates are checked against `Intl.DateTimeFormat` using the active RU/EN locale and browser's local timezone.

## Behavior and persistence

The browser matrix creates a card, opens it from its badge and the unused space between its independent controls, saves a multiline description, creates and edits a note, returns to the board, moves the card, opens it by Enter, reloads its direct address, then reloads offline. Description, notes, dates and flags survive. Offline note deletion persists after another reload. Disabled arrow clicks do not open the detail page.

Unit/repository tests cover v1 and v2 upgrades to schema v3, preserved flags/links/order/preference, empty description initialization, an empty notes store, repeated opening and full rollback of a failed upgrade. Notes are ordered by creation timestamp and ID; no-op edits preserve metadata, actual edits preserve creation date and history position. Foreign/missing relationships and blank text are rejected. Card deletion removes its notes and compacts card positions atomically; an injected failure after the note deletion rolls the whole cascade back. Description-only edits preserve card priority position and moves retain notes.

The store keeps the current detail context, confirmed snapshots and independent drafts when fields or notes save. Validation and storage errors retain entered text and permit retry. Repeated field submission dispatches one pending write; stale storage blocks field and note mutations. Stale detail reads, both success and failure, cannot replace a newer board.

## Drafts, history, updates and focus

The page protects basic fields and the one active new/edit-note draft. Stay and Escape retain them; discard affects only uncommitted drafts; save-on-leave saves fields first and the active note second. The injected second-write failure leaves committed fields saved, the note draft intact and the current route unchanged. Retry writes only the remaining note and does not duplicate it. Editor switching uses the same guard.

Real browser Back/Forward restores the original history position before showing one guard. Stay does not add history entries; save/discard apply the requested destination once. Two rapid Back attempts still keep one guard; saving applies the original board destination and Forward returns to the saved card.

An actual `beforeunload` dialog is exercised by attempting `page.close({ runBeforeUnload: true })`, dismissing the browser warning, and checking the live page, route and unchanged draft. Native reload after saving succeeds. The dirty PWA activation test keeps the worker callback untouched on Stay and invokes it only after saving. Native closing cannot promise automatic saving; forced restart after IndexedDB versionchange cannot save through the closed connection.

Deleting a note confirms its text, initially focuses Cancel, retains the dialog on storage failure, and restores focus appropriately. A regression deletes the last saved note while a new unsaved note editor is open: the draft survives and its textarea receives focus.

## Review fixes

1. Raised only independent card controls above the stretched link. The unused control-row gap now opens the card; browser regressions exercise it in all six matrix cells.
2. Added the active note textarea as the deletion-focus fallback when the Add note trigger is not mounted.
3. Distinguished detail-load outcomes (`shown`, `missing`, `unavailable`, `superseded`). A storage read failure now preserves the requested card route and unavailable state; a missing project still returns safely to the catalogue.

No production deployment or physical-device claim is made by this local QA record.
