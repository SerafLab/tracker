# Tasks

## 1. Install state and platform detection

- [x] 1.1 Fix `isAppleMobile` to also match iPadOS (`Macintosh` UA with `maxTouchPoints > 1`); verify with a unit test in `src/app/pwa/install-guidance.test.tsx` that iPhone, iPad and iPadOS-desktop UAs select the iOS instruction and a desktop Mac without touch does not.
- [x] 1.2 Add the `localStorage` dismissal module (`easytrack.installInvitationDismissed`) with `try`-wrapped read and write; verify with unit tests that set/read works and that throwing storage reads as not dismissed and ignores write failures.
- [x] 1.3 Extend `useInstallState` with `standalone` detection (`display-mode: standalone` or `navigator.standalone`), an `appinstalled` listener that clears the deferred prompt and saves the dismissal, and saving the dismissal on an accepted `userChoice`; verify with unit tests for each signal.

## 2. Settings installation entry replaces the floating button

- [x] 2.1 Add the `src/ui` settings-entry context and render its entry in the `AppBar` settings panel before the language selector, closing the panel before `onSelect(gear)`; verify in `src/ui/app-bar.test.tsx` that the entry appears with its label, closes the panel when selected, and is absent when no provider is given.
- [x] 2.2 Provide the entry from `App` around both the workspace and `RestartRequired`, with the label `install` when a deferred prompt exists and `installHelp` otherwise; it opens the browser prompt or the guidance dialog with focus returning to the gear. Verify in `src/app/app.test.tsx` that the entry works on catalogue, board, card page, panel and restart screens, and that the captured prompt survives navigation (this replaces the `card-details.test.tsx` "one install entry" test).
- [x] 2.3 Remove `.install-help` rendering, its CSS and three `static` overrides, `installSlot` from `ProjectBoardApp`, `ProjectBoardView` and `App`, and the portal; lower `.pwa-update-notice` to the standard bottom offset. Verify that `rg "install-help|installSlot" src e2e` finds nothing, and that the remaining `e2e/card-panel.spec.ts` checks pass after its install placement and overlap tests are removed.
- [x] 2.4 Update `docs/manual-visual-qa.md` (panel isolation no longer lists an installation control; add the settings entry and invitation to the RU/EN 320/390/1280 checks) and verify the doc matches the new UI.

## 3. First-visit invitation

- [x] 3.1 Add ru/en strings for the invitation intro, the iOS "install before creating projects" sentence, «Больше не показывать» and «Закрыть»; verify that `tsc` passes (`en` is typed by `keyof typeof ru`, so a missing key fails the type check).
- [x] 3.2 Implement the invitation variant of the install dialog (intro, platform instruction, `localData`, checkbox, live «Установить EasyTrack» while a deferred prompt exists, «Закрыть»); closing with the checkbox, or an accepted prompt, saves the dismissal. Verify with unit tests: checkbox unchecked does not save; checked saves; a prompt that arrives while the dialog is open shows the action; accepting the prompt closes the dialog and saves.
- [x] 3.3 Implement the once-per-launch trigger in `App` on the first ready workspace kind (catalogue, board, card or card-missing), skipping it when running standalone, dismissed, a modal is open or a restart is required. Verify with unit tests for each skip condition and that navigation after closing does not reopen it.
- [x] 3.4 Suppress the invitation by default in tests: set the flag in `src/test/setup.ts`, add `use.storageState` with the flag for the base-URL origin in `playwright.config.ts`, and apply the same state in the manual `browser.newContext()` calls in `e2e/webmcp-core.spec.ts` and `e2e/card-drag.spec.ts`. Verify that the full Vitest and Playwright suites pass unchanged otherwise.
- [x] 3.5 Add Playwright coverage in `e2e/pwa.spec.ts` with empty storage state: the invitation opens on first visit in RU and EN, does not reopen after dismissing with the checkbox and reloading, reopens after closing without it, does not open with `display-mode: standalone` emulated, and leaves the settings entry available; check 320 and 1280 px without horizontal overflow.

## 4. Integration

- [x] 4.1 Run `npm run check` and verify all required checks pass on the completed change; visually check the invitation and settings entry at 320/390/1280 px in RU and EN.
