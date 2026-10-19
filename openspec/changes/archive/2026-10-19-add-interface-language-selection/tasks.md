# Tasks

## 1. Locale foundation

- [x] 1.1 Add `i18next` and `react-i18next` with bundled Russian and English resources; verify dependency installation and a production build succeed.
- [x] 1.2 Implement locale resolution from a saved explicit override or the browser's primary language, with English fallback and safe storage-error handling; verify focused tests cover first visit, regional Russian, unsupported languages, browser changes before manual selection, and persisted manual choice.
- [x] 1.3 Add a single app-level locale provider and persistence warning state; verify a component test changes language immediately and reports a rejected preference write without losing the in-session choice.

## 2. Interface and selector

- [x] 2.1 Place the accessible selector outside workspace-state branches, including loading, database-unavailable, and restart-required views; verify keyboard use and switching on each state in component tests.
- [x] 2.2 Move catalogue, board, card, menu, dialog, validation, and save-error text to translation resources; verify Russian and English component tests, including a language switch with an open project and unfinished form that preserves the typed value and user-authored names.
- [x] 2.3 Translate installation guidance, update and restart notices, including accessible labels and platform-specific instructions; verify their component tests in both languages.

## 3. Page and installation metadata

- [x] 3.1 Update document language, title, and description with the active locale, including initial startup; verify tests for first launch and a manual switch.
- [x] 3.2 Generate Russian and English static manifests with shared EasyTrack identity and local icons, select the active manifest without a competing fixed-language link, and precache both; verify the production build exposes both manifests and the active link resolves to the matching description.
- [x] 3.3 Extend production-browser PWA tests for both locale manifests, persisted language during offline reopen, and existing installation/update behavior; verify those browser tests pass.

## 4. Integration verification

- [x] 4.1 Run `openspec validate add-interface-language-selection --strict` and `npm run check`; verify both pass and inspect the production UI at mobile width for selector reachability.
