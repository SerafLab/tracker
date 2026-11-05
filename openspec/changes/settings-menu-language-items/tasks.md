# Tasks

## 1. Shared menu keyboard helper

- [ ] 1.1 Extract the card menu's wrapping Arrow Up/Down focus logic into one helper in `src/ui/` that selects items by `menuitem` roles and skips disabled ones, and switch `controls.tsx` to it. Verify that existing card-menu unit and e2e tests (`card-moves`, `deletion`) pass unchanged.

## 2. Language menu group

- [ ] 2.1 Replace `LocaleSelector` in `src/i18n/provider.tsx` with a language group: a caption from `applicationLanguage` that labels a `role="group"`, plus `menuitemradio` items «Русский» (`lang="ru"`) and «English» (`lang="en"`) with `aria-checked` and an end-edge checkmark. Choosing an item calls `preference.select` and does not close the menu. Move the warning into a separate component. Update `src/i18n/locale.test.tsx` and verify it covers the switch, the selected state, a repeat choice of the current language, and the storage-failure warning.

## 3. Settings menu in the application bar

- [ ] 3.1 Rebuild the `AppBar` settings popover as a container holding a `role="menu"` (actions as `.menu-item` `menuitem`s, a separator only when actions precede the language group, then the language group) and the warning after the menu. Give the gear `aria-haspopup="menu"`, focus the first enabled item on open, and use the shared arrow-key helper. Keep the existing positioning, outside and Escape dismissal, and dialog focus-return. Verify in `src/ui/app-bar.test.tsx`: roles and order, separator presence and absence, focus on open, arrow wrap skipping the separator and caption, language choice keeping the menu open with focus on the chosen item, and Escape returning focus to the gear.
- [ ] 3.2 Update `src/styles.css`: the popover uses the `.menu-items` surface, add `.menu-separator` and `.menu-caption`, and remove the `.settings-panel` padding/gap and `.locale-*` rules. Verify with a search that no `.locale-` selector or `button button-quiet` remains in the settings markup.

## 4. Test callers and visual check

- [ ] 4.1 Add a shared Playwright helper that switches language through the settings menu and replace every `combobox`-based language switch and `region` settings query in `e2e/` and `src/**/*.test.tsx`. Verify with a search that no language `combobox` query remains, and run each changed e2e file with `--repeat-each=5` and each changed unit file with `--repeats=10`.
- [ ] 4.2 Extend `e2e/app-bar.spec.ts` to assert start-aligned labels (equal left offsets of item text), the separator and caption, and no horizontal overflow at 320 px and 1280 px in both languages. Verify that the spec passes.
- [ ] 4.3 Run `npm run check`, then visually inspect the open settings menu on the board and the catalogue at 320 px and 1280 px in Russian and English, including keyboard focus on a language item and the storage-failure warning. Report what was viewed and the result.
