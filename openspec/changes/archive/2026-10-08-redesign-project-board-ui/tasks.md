# Tasks

## 1. Preconditions and visual foundation

- [x] 1.1 Confirm that `adopt-modular-project-board-architecture` is complete and that `src/app/app.tsx` composes `ProjectBoardApp` from `src/features/project-board/presentation`; verify `npm run check:architecture` and the pre-change test suite pass before editing the visual layer.
- [x] 1.2 Replace the ad-hoc global styles in `src/styles.css` with the documented system-font, color, spacing, typography, radius, shadow, focus, reduced-motion and responsive tokens; verify the production build passes and the CSS contains no external font request or UI-library dependency.
- [x] 1.3 Implement base styles for primary, secondary, quiet and disabled buttons, fields, error banners and surface cards; verify keyboard focus is visible and disabled controls cannot be activated in RTL tests.

## 2. Reusable accessible presentation controls

- [x] 2.1 Add a reusable focus-managed action dialog that renders as a compact dialog on desktop and bottom sheet at 640 px and below; verify its form receives focus, Escape/Cancel dismisses without invoking callbacks, and focus returns to the opener.
- [x] 2.2 Add an accessible secondary-action menu for project, status and card actions; verify keyboard opening/closing, accessible labels, Escape behaviour and invocation of each menu action in component tests.
- [x] 2.3 Adapt `NameForm` and rename controls to the dialog workflow while preserving labels, whitespace validation and error announcements; verify the existing empty-name scenario passes through the new controls.

## 3. Catalogue redesign

- [x] 3.1 Redesign `ProjectCatalogueView` with its header, primary create action, quiet project cards and project action menu; verify opening and renaming a project call the existing callbacks without changing its ID or navigation result.
- [x] 3.2 Add the explanatory empty catalogue card with directly available first-project form and a distinct populated-catalogue creation dialog; verify both flows create a project and open its board in RTL tests.
- [x] 3.3 Verify catalogue visual hierarchy at desktop and 320 px-wide viewport against the token values, including 44 px touch targets and readable error text.

## 4. Board, status and card redesign

- [x] 4.1 Redesign `ProjectBoardView` into breadcrumb/header, status-creation action and horizontally scrollable 304 px status columns with textual card counts; verify return-to-catalogue, status creation and the no-status state retain their current callbacks and semantics.
- [x] 4.2 Put status rename and explicit left/right ordering actions in its secondary-action menu, including visibly inactive boundary actions; verify first/last actions are disabled and a completed-named status receives no special business or colour semantics.
- [x] 4.3 Redesign `CardView` as a compact card with progressive rename/move actions and a destination form; verify a move still removes the card from its source and appends it to the selected destination without drag-and-drop.
- [x] 4.4 Cover board interaction at 320 px and desktop widths in RTL tests; verify every column and primary operation remains reachable through semantic controls and no status-specific palette is introduced.

## 5. Workspace feedback and regression coverage

- [x] 5.1 Restyle `ProjectBoardApp` loading and unavailable-storage views with accessible loading and recovery content; verify loading does not expose mutation controls and unavailable storage remains announced.
- [x] 5.2 Restyle mutation errors as an inline alert over the last confirmed catalogue or board content; verify a rejected save shows the existing message and does not display unpersisted project, status or card data.
- [x] 5.3 Update `src/app.test.tsx` helpers and scenario assertions for menus and dialogs while retaining multi-project isolation, last-open restoration, status ordering, card movement and validation coverage; verify `npm test -- --run` passes.

## 6. Integration and visual readiness

- [x] 6.1 Run `npm run check:architecture` and `npm run test:production`; verify the presentation-only change preserves module boundaries and produces a production bundle.
- [x] 6.2 Perform manual visual QA in current desktop Chrome plus 320 px and 390 px mobile viewports: catalogue empty/populated, no-status board, multi-column board, dialog/sheet, validation, storage error, inactive controls and keyboard focus; record the checked browsers/devices with the release notes.
- [x] 6.3 Confirm the finished screens meet the review checklist: one teal accent, neutral statuses, system typography, no permanently expanded technical forms on populated screens, consistent spacing/radii/shadows, and no feature beyond the existing project-board model.
