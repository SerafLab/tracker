# Tasks

## 1. Data foundation

- [x] 1.1 Add the runtime and test dependencies for Dexie-backed browser storage, hash navigation, and React/domain tests; verify `npm ci` and the new test command complete successfully.
- [x] 1.2 Define typed project, status, card, and workspace-preference records with UUIDs and explicit positions; verify unit tests cover entity relationships and name validation.
- [x] 1.3 Implement the versioned Dexie database and repository boundary, including transactional status reordering and card transfer; verify repository tests with IndexedDB test support retain ordering and reject failed persistence.

## 2. Project catalogue and startup

- [x] 2.1 Replace the placeholder entry view with hash-addressable catalogue and board views backed only by the repository; verify an integration test opens a selected project and keeps projects isolated.
- [x] 2.2 Implement empty catalogue, project creation, project rename, and return-to-catalogue controls with required-name feedback; verify React Testing Library scenarios for successful and whitespace-only submissions.
- [x] 2.3 Persist and restore the last open project, falling back to the catalogue for no or stale selection; verify reload-oriented integration tests cover both paths.

## 3. Board workflow

- [x] 3.1 Implement empty-board guidance plus status creation, rename, append order, and explicit left/right reordering controls; verify component and repository tests cover the visible order after each operation.
- [x] 3.2 Implement card creation, rename, and accessible transfer controls, enforcing one status per card and appending transferred cards to the destination; verify tests cover the agreed apartment-board transfer scenario.
- [x] 3.3 Render a storage-unavailable and failed-save state without presenting failed mutations as persisted; verify tests simulate database open and write failures.

## 4. Responsive access and integration verification

- [x] 4.1 Style the catalogue and horizontally reachable status columns for a narrow mobile viewport while retaining semantic forms, buttons, and selectors; verify responsive UI tests or browser assertions can reach every primary control without drag-and-drop.
- [x] 4.2 Add the end-to-end-equivalent automated scenario for two projects, status reordering, card creation/rename/transfer, and reload persistence; verify it passes against a production build.
- [x] 4.3 Run the project’s configured test suite and production build, then manually check the published build’s core board scenario after deployment; record any follow-up needed for the later PWA/offline change.
