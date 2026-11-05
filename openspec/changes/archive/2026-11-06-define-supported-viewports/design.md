# Design

## Context

See proposal.md for motivation. Layout changes at CSS breakpoints of 360, 650, 960 and 1120 px. Browser tests run only in Chromium and set viewports with 16 different hand-written width and height pairs. The menus use the Popover API (Safari 17+, Chrome 114+). The manual QA plan already requires real-device checks in Safari on iPhone and Chrome on Android.

## Goals / Non-Goals

**Goals:**
- One definition of a supported viewport that specs, `DESIGN.md`, the manual plan and tests share.
- An automated check that every reference size holds on the main screens.

**Non-Goals:**
- Running browser tests in WebKit or Firefox.
- Layout redesign for any width; this change only fixes small CSS defects the new test finds.
- Glossary or ADR updates: the term is a UI detail, not domain language, and the decision is easy to reverse.

## Decisions

- **Range with checkpoints, not a list of points.** Every width from 320 px up is supported, and six reference sizes are what tests check. A points-only list would leave 500 or 1000 px without any guarantee, although users resize windows freely. Per-interval guarantees between breakpoints were rejected as too much specification for no extra safety.
- **Reference sizes and their purpose.**

  | Size | Purpose |
  | --- | --- |
  | 320×568 | Narrowest phone, worst case |
  | 390×844 | Typical phone |
  | 568×320 | Phone in landscape, full guarantee |
  | 820×1180 | Portrait tablet: desktop application bar with a full-screen card panel (650–960 px) |
  | 1280×800 | Laptop, four columns fit |
  | 1440×900 | Wide screen, content width limit |

  1024×768 was rejected because it behaves like 1280. No point above 1440 px: content width is capped and the range covers it.
- **Browsers as last two major versions.** A fixed minimum in the spec would need manual updates with every new platform feature. `DESIGN.md` notes that the Popover API sets the effective minimum today. Chromium is the automated check; Safari stays a manual real-device check.
- **Requirement in `application-shell`.** The shell owns screen-wide layout, and `offline-installed-app` already refers to a supported viewport. A separate capability for one requirement was rejected.
- **Shared sizes in `e2e/viewports.ts`.** Tests that check layout at a reference size import it, so the list cannot drift. Tests that probe missing height (for example 320×250) keep their own sizes.
- **One matrix test.** It visits each reference size × catalogue, board, board with card panel and full card page × RU/EN in a single page per size, and checks document overflow and application bar controls. Service states stay in their own tests.

## Risks / Trade-offs

- [The new matrix finds defects at 820×1180 or 568×320] → Fix small CSS defects here; stop and report to the user if a layout rework is needed.
- [The matrix adds browser test time] → Reuse one page per size and switch language in place instead of reloading the app.
- [Safari regressions are not caught automatically] → Keep the manual real-device section and point it to the reference sizes.
