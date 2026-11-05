# Tasks

## 1. Shared reference sizes

- [x] 1.1 Add `e2e/viewports.ts` exporting the six named reference sizes. Verify with the type check.
- [x] 1.2 Switch e2e tests that set a reference size to the shared module; keep sizes that probe missing height. Verify with a search that no reference width and height pair is hand-written outside `e2e/viewports.ts`, and run each changed file with `--repeat-each=5`.

## 2. Viewport matrix test

- [x] 2.1 Add a browser test that, for each reference size in RU and EN, opens the catalogue, a four-status board with cards, the card panel and the full card page, and asserts no horizontal document overflow and visible, operable application bar brand, heading, gear and plus when applicable. Run it with `--repeat-each=5`.
- [x] 2.2 Fix small CSS defects the test finds in `src/styles.css`. If a fix needs a layout rework, stop and report to the user.

## 3. Documentation

- [x] 3.1 In `DESIGN.md`, replace the draft size section: link the requirement, list the reference sizes with their purpose, the supported browsers, the Popover API minimum and the CSS breakpoints.
- [x] 3.2 In `docs/manual-visual-qa.md`, use the reference sizes including 820×1180 and keep the real-device Safari and Chrome section pointing to them.

## 4. Verification

- [x] 4.1 Run `openspec validate define-supported-viewports --strict` and `npm run check` with a unique `E2E_PORT`.
- [x] 4.2 If CSS changed, inspect the affected screens at the affected reference sizes in RU and EN and report what was viewed.
