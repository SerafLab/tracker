# Design

## Context

See `proposal.md` — Why and `specs/application-shell/spec.md`. `AppBar` renders a single `<h1 className="page-title">` on all screens. Its grid already reserves a shrinking middle column on desktop and a full-width second row on mobile. `.page-title` currently uses `overflow-wrap: anywhere`, so a long name increases the bar's height. Existing bar hints appear on hover and focus; the current title has neither a hint nor a keyboard focus stop. Browser tests already exercise 320, 390, 1280 and 1440 px in Russian and English.

## Goals / Non-Goals

**Goals:**

- Keep one semantic `<h1>` containing the unmodified title string.
- Keep the title's visual height to one line while preserving the existing responsive grid and action targets.
- Make only a truncated title an additional keyboard focus stop, with a complete-title hint available on hover and focus.

**Non-Goals:**

- Truncating project names in catalogue tiles, forms, or stored data.
- Changing the App Bar's one-row desktop and two-row mobile layout.

## Decisions

### CSS controls the visible line

Use `white-space: nowrap`, `overflow: hidden`, and `text-overflow: ellipsis` on `.page-title`, with `min-width: 0` retained. Apply the same rule to every `AppBar` title. The existing responsive grid supplies the available width; do not shorten the actual string or set a character limit. This avoids language-dependent string slicing and works for names without spaces. A line clamp is unnecessary for one line, and a fixed pixel height would be brittle across font settings.

### Measure truncation only for the hint and focus stop

After layout, compare the title element's `scrollWidth` with `clientWidth`; update this when the title or available width changes. Observe the title container's size and handle viewport resize as needed. A truncated title receives a keyboard focus stop and a complete-title hint; a short title stays out of the tab order. Keep the complete string as `<h1>` text so its accessible name never becomes the ellipsis. A `title` attribute alone is insufficient because keyboard focus does not reliably reveal a native browser tooltip.

Place the hint outside the clipped title element, within a positioned wrapper, using the existing bar-hint visual treatment. Bound its width to the viewport and allow long unbroken names to wrap inside the hint. If the complete name is taller than the available viewport, the hint needs a reachable scrolling surface while focused; the heading's accessible text remains complete regardless. Avoid duplicating the title in the accessibility tree through the visual hint.

## Risks / Trade-offs

- [Overflow measurement can become stale after a width or title change] → Re-measure after title changes and on responsive resize; cover a rename and viewport change in a browser test.
- [A focusable title adds a tab stop] → Enable it only when text is actually truncated; verify the existing control tab order for short titles.
- [A very long hint can cover nearby content] → Constrain it to the viewport and keep the App Bar controls usable; verify a long no-space title on mobile and desktop.

## Migration Plan

No data migration. The visual change is reversible by restoring the previous title presentation and removing the title hint behavior.
