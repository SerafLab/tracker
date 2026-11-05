# Design

## Context

- `AppBar` (`src/ui/app-bar.tsx`) renders the settings panel as a `role="region"` popover. Its actions are `.button.button-quiet` elements, which center their labels (`justify-content: center`). Positioning, outside-click, Escape and scroll handling already live in its layout effect.
- `LocaleSelector` (`src/i18n/provider.tsx`) renders a labelled `<select>` and an `role="alert"` warning. `LocalePreferenceContext` exposes `select(locale)` and `warning`.
- The card menu (`src/features/project-board/presentation/controls.tsx`) is the existing menu pattern: `.menu-items` / `.menu-item` styles, `role="menu"` / `menuitem`, focus on the first enabled item when it opens, and wrapping Arrow Up/Down.
- Tests across `src` and `e2e` switch language through `getByRole('combobox')`, and settings tests query `role="region"`.

## Goals / Non-Goals

**Goals:**
- One menu look and keyboard model shared by the card menu and the settings menu.
- Keep the existing settings positioning, dismissal and dialog focus-return behaviour unchanged.

**Non-Goals:**
- Changing the card menu's behaviour, including its close-on-resize rule.
- Changing how the language preference is stored or detected.
- Adding icons to settings items.

## Decisions

1. **Popover wrapper, menu inside.** The popover element stays a plain container (no `region` role). Inside it, a `role="menu"` element with `aria-label` «Настройки» / «Settings» holds the action `menuitem`s, a `role="separator"`, and a `role="group"` labelled by the caption with two `menuitemradio`s. The preference warning stays in the popover after the menu, outside `role="menu"`. ARIA menus may contain only items, groups and separators, so a `role="alert"` paragraph inside the menu would be invalid. *Alternative:* put the warning inside the group. Rejected because it is not a menu item and screen readers in menu mode may skip it.
2. **Gear gets `aria-haspopup="menu"`.** It keeps `aria-expanded` and `aria-controls`, which now point to the menu.
3. **Reuse `.menu-item` for every settings item.** Actions and languages use `.menu-item`, so labels align to the start edge with the card menu's padding and 44 px height. The popover container takes the `.menu-items` surface (border, radius, shadow, 5 px padding) instead of `.settings-panel`'s 1 rem padding and grid gap. A new `.menu-separator` (1 px `var(--border)` line with vertical margin) and `.menu-caption` (small muted, non-interactive text, padded like an item) are added next to the menu rules. The `.locale-*` and `.settings-panel` padding rules are removed. *Alternative:* left-align `.button` inside the panel. Rejected because it keeps two menu styles.
4. **Selected language marker.** `menuitemradio` with `aria-checked`. A checkmark icon is shown at the end edge of the selected item. Placing it at the start would indent the language labels, which breaks the user's request that all labels share one start edge. Each language item gets `lang="ru"` / `lang="en"`, and its label is a constant endonym, not a translation key.
5. **Shared keyboard helper.** Extract the card menu's Arrow Up/Down wrap logic into one small function, for example `moveMenuFocus(menu, key)` in `src/ui/`, and use it in both menus. Items are queried by role (`[role^="menuitem"]:not(:disabled)`), so the separator and caption are skipped by construction. On open, the settings menu focuses its first enabled item, like the card menu.
6. **Language choice keeps the menu open.** Language items call `preference.select(locale)` and do nothing else. They don't close the menu and don't move focus. The re-render keeps the same DOM elements, so focus stays on the chosen item. Choosing the already-selected language is a no-op through the same path.
7. **`LocaleSelector` becomes `LanguageMenuGroup`.** It renders the caption and the two items, and returns `null` without a preference context, as now. The warning moves to a separate small component that `AppBar` places after the menu, so the alert sits outside `role="menu"`.

## Risks / Trade-offs

- [Many tests depend on the `combobox` role and the `region` role] → Add one shared Playwright helper (open settings, choose a language item, close) and update the unit tests to query `menu`, `menuitemradio` and `group`. Search for `combobox` and `'region', { name: 'Настройки'` to catch every caller.
- [Focus moves into the menu on open, where it used to stay on the gear] → This matches the card menu and the ARIA menu pattern. Tests that opened settings and then pressed Escape still work, because Escape returns focus to the gear.
- [The menu re-renders with new text after a language switch, which can change its width] → The existing `ResizeObserver` repositioning already handles size changes.

## Migration Plan

None. This is a UI change only. The saved language preference keeps its key and values.
