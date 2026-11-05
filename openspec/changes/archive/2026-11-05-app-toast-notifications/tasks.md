# Tasks

## 1. Notification area

- [x] 1.1 Add `src/ui/notifications.tsx` with `NotificationProvider` (props `placement: NotificationPlacement`, default `bottom-center`, and `isolated`) and `useToast().showToast(text)`. It keeps one `{ id, text }` entry in an always-mounted `role="status" aria-live="polite" aria-atomic="true"` transient slot, replaces the entry on each call, keys the text by `id`, restarts a 4000 ms timer, and clears it on unmount. Verify with `src/ui/notifications.test.tsx` (fake timers): the slot exists while empty; text appears and disappears after 4000 ms; a second call replaces the first and restarts the timer; identical text twice produces a new DOM node; focus on an outside button does not move; the slot contains no focusable elements.
- [x] 1.2 Add `PersistentNotice` (`label`, `text`, `actions`) that portals into the persistent slot below the transient slot and throws a clear error without a provider. The persistent slot gets `inert` and `aria-hidden="true"` while `useModalOpen()` or `isolated` is true; the transient slot never does. Verify in `src/ui/notifications.test.tsx`: the notice renders below the transient slot with its accessible name; its buttons are reachable with Tab; with a registered modal or `isolated` its buttons cannot be focused and are hidden from the accessibility tree, and become available again afterwards; a toast still appears in the transient slot while a modal is registered.
- [x] 1.3 Add `.notification-area` styles to `src/styles.css`:
  - tokens `--notification-gap` and `--notification-bottom` with `env(safe-area-inset-bottom)`, one selector per `data-placement` value;
  - a column stack with transient above persistent and a `.5rem` gap;
  - `pointer-events: none` on the area and transient slot, `auto` on persistent notices;
  - z-index 3, surface/border/radius/shadow tokens;
  - an opacity transition for transient notifications, disabled under `prefers-reduced-motion: reduce`.

  Do not add a `:has()` override. Verify with `npm run build` and by changing `placement` locally to each value and confirming both slots move together without touching callers.
- [x] 1.4 Mount `NotificationProvider` in `src/app/app.tsx` around both the workspace and `RestartRequired`, passing `isolated={panelIsolated}`, so the area renders outside `main` and every `inert`/`aria-hidden` section. Verify in `src/app/app.test.tsx` that the area is not inside inert content, a toast reaches the transient slot while a modal dialog is open, and run `npm run check:architecture`.
- [x] 1.5 Add a short paragraph about the notification area to `DESIGN.md` under «Типографика и взаимодействие»: position and single placement switch, transient above persistent, transient notifications informational without focus and auto-dismissing, persistent notices with actions unavailable under dialogs, reduced motion. Verify the paragraph matches design.md decisions 2–5 and 7.

## 2. Update offer moves into the area

- [x] 2.1 Render `PwaUpdateNotice` through `PersistentNotice` with `updateLabel`, `updateAvailable`, «Обновить» and «Позже», keeping its props and the `requestLeave` path in `PwaUpdateRegistration`; remove the `<div inert={panelIsolated}>` wrapper in `app.tsx` and the `.pwa-update-notice` CSS. Verify that `rg "pwa-update-notice" src e2e` finds nothing, that `src/app/pwa/update-notice.test.tsx` (wrapped in `NotificationProvider`) still proves «Позже» keeps the session and «Обновить» calls the update, and that `src/i18n/locale.test.tsx` still finds the offer by its localized name in RU and EN.
- [x] 2.2 Add tests in `src/app/app.test.tsx`: with the update offer visible, a toast appears above it and disappears while the offer and its actions remain; with a modal dialog open, Tab never reaches «Обновить»; with the card panel isolating the workspace, the offer is unavailable and returns after the panel closes. Verify with `npm run test:run`.

## 3. Card placement uses the toast

- [x] 3.1 In `project-board-view.tsx`, remove `notice`/`setNotice` and the `.placement-status` paragraph; call `showToast(t('placementSaved'))` and `showToast(t('placementUnchanged'))` from `moveCard`, leave `failed` and `refresh-failed` to the existing alerts, and replace `setNotice` in the retry handler. Remove `.placement-status` CSS. Verify that `rg "placement-status|setNotice" src` finds nothing and `npx tsc -b` passes.
- [x] 3.2 Update `src/features/project-board/presentation/card-placement.test.tsx`:
  - saved and unchanged results appear in the transient slot in RU and EN;
  - during a pending write no «Сохраняем…» text is shown and the board stays blocked;
  - a failed write shows only the `saveError` alert, with no toast and no duplicate text;
  - a successful «Повторить чтение» shows the saved toast;
  - a keyboard move keeps focus on the card menu.

  Verify with `npm run test:run`.
- [x] 3.3 Update `e2e/card-drag.spec.ts` to read the result from the transient slot (not a bare `getByRole('status')`) and add a check that the top of `.status-columns` keeps the same `boundingBox().y` before and after a saved drop at 390 and 1280 px. Verify with `npm run test:e2e -- e2e/card-drag.spec.ts`.
- [x] 3.4 Optionally remove the now-unused `placementSaving` key from both locales in `src/i18n/resources.ts`; verify that `rg placementSaving src` finds nothing and `npx tsc -b` passes.

## 4. Integration

- [x] 4.1 Run `npm run check` and confirm it passes in full.
- [x] 4.2 Manual check in RU and EN at 320, 390 and 1280 px:
  - after a drop or a menu move, the toast appears at the bottom centre without shifting the board;
  - taps beneath it reach cards and «Добавить карточку»;
  - it disappears after about 4 s;
  - with the update offer visible, the toast stacks directly above it and the offer stays in place;
  - the offer's buttons are unreachable while a dialog is open;
  - VoiceOver announces two identical consecutive results.

  Record the result in `docs/manual-visual-qa.md`.
