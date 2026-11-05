# Proposal

## Why

The settings panel opened from the application-bar gear centers its action labels and puts the language choice in a nested drop-down. Its labels don't line up, and switching language takes two interactions inside an already open menu. It also behaves differently from the card menu, which is already a left-aligned menu with arrow-key navigation.

## What Changes

- Turn the settings panel into a settings menu that matches the card menu: left-aligned items, the same item styling, arrow-key navigation, and focus on the first item when it opens.
- Replace the nested Russian/English drop-down with two menu items, «Русский» and «English». Each is labelled in its own language, and the current one is marked as selected.
- Place the language items after a horizontal separator and under a non-interactive caption «Язык приложения» / «Application language». The separator appears only when actions precede the language group.
- Choosing a language keeps the menu open, so the user sees the menu in the new language and any warning that the choice may not persist. All other items still close the menu.
- Apply this on every screen that has the settings gear: catalogue, board, full card page and service states.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `interface-language`: The language choice becomes a captioned group of two selectable menu items instead of a single drop-down selector.
- `application-shell`: The settings panel becomes a settings menu with menu semantics, left-aligned items, arrow-key navigation, a separator before the language group, and language selection that keeps the menu open.

## Impact

- `src/ui/app-bar.tsx`, `src/i18n/provider.tsx` (`LocaleSelector`), `src/styles.css` (settings panel and locale-selector rules), and possibly a small keyboard helper shared with `src/features/project-board/presentation/controls.tsx`.
- Translation resources in `src/i18n/resources.ts` for the language item names.
- Unit and e2e tests that open settings or switch language through the `combobox` role (`src/ui/app-bar.test.tsx`, `src/i18n/locale.test.tsx`, about 20 Playwright specs and their language helpers).
- No data, storage, API or dependency changes. Saved language preference keeps its format.
