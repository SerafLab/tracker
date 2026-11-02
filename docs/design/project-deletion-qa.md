# Project deletion QA

Verified on 2026-11-02 in `codex/project-deletion`, from base `51aeffe16a141b7986b88ee2ac2e09992c60933f`. The accepted base contains card details and notes, initial status sets and both card-creation entries. This change adds confirmed project deletion without changing the database schema or introducing MCP tools.

## Automated checks

`E2E_PORT=4182 npm run check` passed: architecture boundaries, 192 unit/UI tests, three existing Node transport tests, TypeScript/production build and 98 Chromium browser tests. Node 24.21.0 and Playwright 1.64.0 served the production build at `http://127.0.0.1:4182/tracker/`. The versioned pre-push hook remains configured. No hook or required check was bypassed.

The eight new browser tests exercise both entry points in RU/EN at 320, 390 and 1280 px, plus a real IndexedDB transaction failure and explicit retry in both languages. Existing detail-page, creation, priority, navigation, localization and offline tests continue to pass.

## Data and error handling

Repository tests cover empty/populated projects, identical names with distinct IDs, unchanged foreign projects and notes, conditional cleanup of the last-opened project, repeat deletion and reopening. A single transaction reads current relationships and removes project/status/card/note records. Faults after notes are deleted and after the project is deleted restore every table and preference, then a retry succeeds. A late status/card/note added after the UI summary is also removed. Status creation now checks the parent, counts positions and inserts in one read-write transaction over projects/statuses. Regression tests start creation/deletion in both orders and reopen the database without orphan statuses; five simultaneous creations receive distinct dense positions preserved after reopening.

Store/UI tests confirm there is no optimistic hiding, stale connections cannot delete, pending confirmation dispatches once, and failed transactions retain the project, preference, route and dialog for retry. Catalogue summaries read without opening or remembering a board; loading/failed summaries cannot confirm deletion, and retry/cancellation/stale results are covered.

A failed catalogue read after a successful commit produces the unavailable state, with the deleted data still absent. It does not report a failed deletion or offer to repeat it. A dedicated test confirms that leaving a deleted board performs only the preference write inside the cascade; the subsequent transition changes the route without another preference write.

## Navigation, focus and browser persistence

Cancellation returns to the selected project menu or settings gear. Settings close before confirmation and the app bar is inert while it is open. Successful deletion in the catalogue focuses the next project, otherwise the previous one, otherwise project creation; deletion from a board focuses project creation in the catalogue. Project deletion is absent from catalogue/card-page/service settings. Existing renaming and language selection remain available.

The browser matrix creates a project with a card and saved note, deletes it from the catalogue, and verifies the remaining project is independent and focused. Old board and card addresses return to the catalogue without exposing deleted content. It then deletes the last empty project from board settings using the keyboard while offline, uses Back, reloads offline, and verifies all project/status/card/note stores remain empty.

The injected browser failure occurs at project removal after child deletion has started. All counts and the previous last-project value remain unchanged, the localized error is readable, Cancel is focused, and an explicit retry completes the entire cascade.

## Actual browser screenshots

PNG files below are copied from the completed browser runs. Representative RU/EN narrow/wide, board and failure views were inspected visually. Long unbroken names wrap; counts, warnings and actions remain readable with no horizontal page/dialog overflow. Cancellation begins on Cancel, the primary action remains reachable with Tab/Space, and the sheet/dialog uses existing application controls.

| Width | Catalogue RU | Catalogue EN | Board RU | Board EN |
| --- | --- | --- | --- | --- |
| 320 px | [Screenshot](project-deletion-screenshots/project-delete-catalogue-ru-320.png) | [Screenshot](project-deletion-screenshots/project-delete-catalogue-en-320.png) | [Screenshot](project-deletion-screenshots/project-delete-board-ru-320.png) | [Screenshot](project-deletion-screenshots/project-delete-board-en-320.png) |
| 390 px | [Screenshot](project-deletion-screenshots/project-delete-catalogue-ru-390.png) | [Screenshot](project-deletion-screenshots/project-delete-catalogue-en-390.png) | [Screenshot](project-deletion-screenshots/project-delete-board-ru-390.png) | [Screenshot](project-deletion-screenshots/project-delete-board-en-390.png) |
| 1280 px | [Screenshot](project-deletion-screenshots/project-delete-catalogue-ru-1280.png) | [Screenshot](project-deletion-screenshots/project-delete-catalogue-en-1280.png) | [Screenshot](project-deletion-screenshots/project-delete-board-ru-1280.png) | [Screenshot](project-deletion-screenshots/project-delete-board-en-1280.png) |

Failure and retry at 320 px: [Russian](project-deletion-screenshots/project-delete-failure-ru-320.png), [English](project-deletion-screenshots/project-delete-failure-en-320.png).

Specification sync/archival, integration review and publication belong to the integration branch. This report does not claim production deployment or testing the future MCP/DnD implementations.
