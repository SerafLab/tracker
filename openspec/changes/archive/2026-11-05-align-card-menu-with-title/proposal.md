# Proposal

## Why

On a board card containing only a short title, the menu icon sits noticeably below the title. The shared 44 px menu button centers its 18 px icon against a 22.5 px first line of title text, making simple cards look misaligned.

## What Changes

- Visually align the card menu icon with the first line of the card title on both single-line and wrapped titles.
- Keep the menu control easy to use by touch and keyboard, including its visible focus state.
- Scope the visual adjustment to board cards; project and status menus retain their current presentation.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `project-boards`: Specify first-line visual alignment of the card title and menu icon while preserving menu accessibility.

## Impact

Board card styling in `src/styles.css` and focused visual coverage. No data, API, dependency, or menu behavior changes.
