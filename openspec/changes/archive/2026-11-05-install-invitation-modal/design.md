# Design

## Context

See `proposal.md` — Why and the deltas in `specs/offline-installed-app` and `specs/application-shell`.

Current state:

- `src/app/pwa/install-guidance.tsx` owns `useInstallState()`: it captures `beforeinstallprompt` and holds the dialog flag. `App` calls the hook once so the captured event survives view remounts. `InstallGuidanceView` renders the floating `.install-help` button and the guidance `ActionDialog`.
- `App` renders the entry inline or portals it into `installSlot`, which `ProjectBoardApp` and `ProjectBoardView` pass down so the button follows the board on narrow screens or when the panel is open. `styles.css` has three `position: static` overrides for `.install-help`. `.pwa-update-notice` sits at `bottom: 4.8rem` to stay clear of the button.
- `AppBar` (`src/ui/app-bar.tsx`) is rendered separately by every view and service screen, with keys that force remounts. Its settings popover holds optional rename and delete actions and `LocaleSelector`, which it imports from `src/i18n`. `useModalOpen()` from `src/ui/modal-state.ts` reports whether any `ActionDialog` is open.
- The language preference is stored under `easytrack.locale` in `localStorage`, with reads and writes wrapped in `try`. `src/test/setup.ts` clears `localStorage` before each Vitest test. Playwright specs set the locale with `addInitScript`, and two specs (`webmcp-core`, `card-drag`) create contexts manually.
- `isAppleMobile()` checks the UA for `iPad|iPhone|iPod`, so it misses iPadOS 13+, which reports a Mac UA.

## Goals / Non-Goals

**Goals:**

- One install state per application launch, shared by the settings entry and the invitation.
- `AppBar` stays independent of `src/app`.
- Existing tests start with the invitation suppressed, set in one place per test runner.

**Non-Goals:**

- Moving the language preference or the new flag into IndexedDB.
- Detecting that a Chromium-installed EasyTrack is open in a regular tab (`getInstalledRelatedApps` requires `related_applications` and is unreliable for same-origin PWAs).
- Browser-specific suppression, for example of Firefox desktop. The general instruction already covers "your browser does not offer installation".

## Decisions

### Install state is provided to the bar through a `src/ui` context

Add a small context in `src/ui`, for example `SettingsEntryContext`, carrying an optional `{ label, onSelect(returnFocus) }`. `AppBar` renders that entry in the settings panel before `LocaleSelector`. Selecting it closes the panel, then calls `onSelect` with the gear element, mirroring how rename and delete close the panel first. `App` provides the value from the install state. Its label depends on whether a deferred prompt exists: `install` or `installHelp`.

Alternative rejected: threading an `install` prop through `ProjectBoardApp`, the catalogue, board, card and service views into every `AppBar` call. That touches seven call sites only to forward a value. Importing `src/app/pwa` from `src/ui` would invert the dependency direction.

`RestartRequired` is rendered by `App` outside `ProjectBoardApp`, so the provider wraps both branches.

### One install module, two dialog variants

`useInstallState()` additionally tracks:

- `standalone`: `matchMedia('(display-mode: standalone)').matches || navigator.standalone === true`, read once at startup;
- `appinstalled`: clears the deferred prompt and saves the permanent dismissal;
- whether the invitation was already handled in this launch.

One `InstallDialog` renders both variants from shared paragraphs (`installApple` / `installBrowser`, `localData`):

- **guidance** (from settings): as today, with a single «Понятно» action;
- **invitation**: a short intro, a stronger iOS sentence about Safari projects not transferring, the platform instruction, `localData`, the «Больше не показывать» checkbox, «Установить EasyTrack» while a deferred prompt exists, and «Закрыть».

Both variants use the existing `ActionDialog`, so focus trapping, Escape, `registerModal` and bar `inert` stay unchanged. `returnFocus` points to the gear for the settings entry. Because the bar is `inert` while a modal is open, the invitation has no natural opener; focus goes to the default `ActionDialog` target, and on close focus follows `ActionDialog`'s existing fallback.

Accepting the native prompt from the invitation closes the invitation, because the browser shows its own UI. `prompt()` resolves after the user's choice. On `userChoice.outcome === 'accepted'` the dismissal is saved without waiting for `appinstalled`.

### Invitation trigger: first ready workspace, evaluated once

`App` subscribes to the workspace kind from the store. The first time it becomes `catalogue`, `board`, `card` or `card-missing`, the trigger is evaluated once:

1. not `standalone`;
2. the flag is not set;
3. `useModalOpen()` is false;
4. `restartRequired` is false.

If all pass, the invitation opens. Either way the launch is marked as handled, so later navigation never reopens it. If a modal happens to be open at that moment, the invitation is skipped for this launch instead of queuing behind it. The case is rare at startup, and queuing would pop a second modal right after the user closes theirs.

Alternative rejected: waiting a few seconds for `beforeinstallprompt` before deciding. The invitation is shown regardless of the prompt, and the action appears live when the event arrives, so waiting would only delay first use.

### Flag in `localStorage`

The flag uses the key `easytrack.installInvitationDismissed` with the value `'1'`, in a tiny module beside the install code, following `locale.ts`. Reads and writes are wrapped in `try`. A failed read counts as not dismissed, and a failed write is ignored. The language preference already uses `localStorage`, so this adds no new storage mechanism, and no IndexedDB schema version is needed.

### iPadOS detection

`isAppleMobile = /iPad|iPhone|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1)`.

### Test defaults

- **Vitest:** `src/test/setup.ts` sets the flag in its `beforeEach`. Invitation tests remove it explicitly.
- **Playwright:** `playwright.config.ts` sets `use.storageState` with a `localStorage` entry for the base URL's origin, so every default `page` starts with the invitation dismissed. Export the same state for the two specs that call `browser.newContext()`. Invitation e2e tests use `test.use({ storageState: { cookies: [], origins: [] } })`. Existing `addInitScript` locale writes keep working because they only set another key.

### Removal

Delete `.install-help` and its three overrides, `installSlot` from `ProjectBoardApp` and `ProjectBoardView` and their slot element, the portal and wrapper in `App`, and the related e2e checks (`e2e/card-panel.spec.ts` placement and overlap tests, and the `card-details.test.tsx` "one install entry" test). Lower `.pwa-update-notice` to the bottom offset that no longer reserves space for the button.

## Risks / Trade-offs

- [The invitation interrupts the first visit] → It opens once per launch, has a permanent opt-out and does not open over service states. The product reason (install before creating projects on iOS) favours early display.
- [Chromium-installed EasyTrack opened in a tab still invites] → After installation through EasyTrack, `appinstalled` sets the flag. Installation through the browser menu also fires `appinstalled` in Chromium. The remaining case (installed elsewhere, flag cleared) only shows a dismissible invitation.
- [Each launch reopens the invitation until it is dismissed] → This is accepted by product decision. The checkbox is visible in the invitation itself.
- [`storageState` hides the invitation from all e2e tests by default] → Dedicated invitation e2e tests opt out explicitly. Unit tests cover the trigger conditions.
- [The settings panel grows by one item on narrow screens] → The panel is a popover sized to its content, so the bar layout is unaffected. Verify at 320 px.

## Migration Plan

No data migration. Users who had the floating button get the invitation on their next launch unless EasyTrack is running installed. Rollback restores the previous component and styles. The orphaned `localStorage` key is harmless.
