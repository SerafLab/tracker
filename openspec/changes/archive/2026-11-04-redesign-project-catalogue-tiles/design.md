# Design

## Context

See `proposal.md` - Why. `ProjectCatalogueView` currently receives only `Project[]`; the repository exposes projects and full boards separately. Cards belong to statuses, so a project's total is the sum of cards in all of its statuses. The catalogue and interface strings are localized in Russian and English.

## Goals / Non-Goals

**Goals:**
- Supply a card count alongside each project for catalogue display.
- Keep counting in the data access path and avoid loading full card records into the UI.
- Preserve project creation, opening, renaming, and empty-catalogue behavior.

**Non-Goals:**
- Persisting a derived count or changing the IndexedDB schema.
- Showing status counts, recent activity, or card previews on tiles.

## Decisions

### Use a catalogue summary with a repository-side count

Expose catalogue entries as a project plus a card count. Compute counts from the existing status and card tables through the repository, rather than loading every complete board or storing a duplicated count that could become stale after card mutations. Keep the project identity and name unchanged, and pass the summary through the application/store to the catalogue view. Ensure the count includes cards in every status, including any project with no statuses (count zero).

The alternative of loading every project board for the catalogue is simple but fetches full card content and ordering that the screen does not need. Persisting counters would require updating every card mutation atomically and reconciling them with existing local data; that complexity is unnecessary for this view.

### Render a responsive tile grid

Change the catalogue list styles to a responsive CSS grid with one column at narrow widths and additional columns as space allows. Each tile presents the project name as the primary open action, a localized card count, and the existing rename action menu. Keep the existing empty state and primary create control outside the grid. Allow long names to wrap and keep the count and menu readable without page-level horizontal overflow.

Use localized singular/plural count text in the existing English and Russian resources. Keep the count visible as text so it is not conveyed by color or icon alone.

## Risks / Trade-offs

- [Counting can add catalogue read work] → Aggregate using indexed status-to-project and card-to-status lookups, without reading full card payloads; do not add persisted counters.
- [Plural forms can read awkwardly across languages] → Use the project's existing i18next pluralization conventions and cover zero, one, and multiple cards.
- [Long names can crowd compact tiles] → Allow wrapping and verify the narrow layout keeps opening and rename controls reachable.

## Migration Plan

No data migration is needed. Existing projects and cards remain unchanged; compute the summary when loading the catalogue. Rollback requires only reverting the application change.
