# Proposal

## Why

Supported screen sizes are scattered across specs, `DESIGN.md`, QA notes and tests with different heights, and the installation scenario refers to "any supported viewport" without a definition. Widths between the checked points have no guarantee, and the browsers EasyTrack supports are not stated.

## What Changes

- Define supported viewports as a range: every width from 320 px up, with no horizontal page overflow and operable primary controls.
- Name six reference sizes as checkpoints within the range: 320×568, 390×844, 568×320, 820×1180, 1280×800 and 1440×900.
- State supported browsers: the last two major versions of Chrome and Edge on desktop, Chrome on Android and Safari on iOS.
- Share the reference sizes with tests through one module and check every reference size with one browser test across the main screens in both languages.
- Point `DESIGN.md` and the manual visual QA plan to the requirement.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `application-shell`: Adds the supported viewports and browsers.

## Impact

- `openspec/specs/application-shell/spec.md`, `DESIGN.md`, `docs/manual-visual-qa.md`.
- New `e2e/viewports.ts` and a new viewport browser test; layout tests switch to the shared sizes.
- Small CSS fixes in `src/styles.css` if the new test finds defects.
- No data, storage, API or dependency changes.
