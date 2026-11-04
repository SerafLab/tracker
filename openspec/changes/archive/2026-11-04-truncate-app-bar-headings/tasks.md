# Tasks

## 1. One-line App Bar title

- [x] 1.1 Apply one-line ellipsis styling to every `.page-title` without changing the desktop/mobile grid; extend `e2e/app-bar.spec.ts` to verify the title stays one line, the bar height matches a short title, and brand/actions do not overlap at 320, 390, 1280 and 1440 px with a long name without spaces.
- [x] 1.2 Keep the complete title in the sole `<h1>` and add a full-title hint for truncated titles on hover and keyboard focus; verify in `src/ui/app-bar.test.tsx` that short titles do not add a tab stop and in `e2e/app-bar.spec.ts` that truncated titles reveal the full name without page overflow.
- [x] 1.3 Re-measure truncation when the title changes or the viewport resizes, constrain very long hint content to the viewport, and verify in browser tests that a rename and viewport change update focus/hint behavior while the controls remain operable.

## 2. Integration

- [x] 2.1 Run `npm run check` and verify all required checks pass on the completed change.
