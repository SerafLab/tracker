# Design

## Context

See `proposal.md` for the motivation. `ActionMenu` is shared by project, status, and card views. Its button has a 44 px minimum height and centers an 18 px icon, while the card title's first line is 22.5 px high. The card heading aligns its children at the top.

## Goals / Non-Goals

**Goals:** Align the icon's visual center with the center of the card title's first line, including when the title wraps. Preserve the button's 44 px target and visible focus.

**Non-Goals:** Change the shared menu component, menu placement behavior, card data, or the size of other action menus.

## Decisions

- Scope the styling to the card heading in `src/styles.css`. Align the icon within the top title line while leaving the button box and its menu anchor intact. This avoids changing the shared `ActionMenu` and preserves pointer, keyboard, and touch behavior.
- Retain the current icon dimensions. Its 18 px glyph already fits within the 22.5 px title line; the vertical position of the glyph within the 44 px button causes the mismatch. Shrinking the glyph or the button would not address that cause while preserving the touch target.

## Risks / Trade-offs

- [Focus or hover treatment looks off-center relative to the icon] → Inspect the title-only and wrapped-title states with pointer hover and keyboard focus at desktop and narrow widths; adjust only the card-scoped presentation if needed.
- [A tall button keeps the title-only card's current height] → Accepted: this change addresses alignment, while preserving a comfortable touch area.
