# Proposal

## Why

Status columns blend into the shared workspace, and wrapped status names make their card lists start at different vertical positions. Clear column boundaries and aligned card starts will make the board easier to scan.

## What Changes

- Give each status column a restrained visual boundary that fits the existing warm, neutral board.
- Align the status header areas to a shared height so every column's cards start on the same horizontal line, regardless of title wrapping.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `project-boards`: Define visual separation between status columns and consistent card-list starting positions.

## Impact

- Board presentation styles and status-column markup in `src/styles.css` and `src/features/project-board/presentation/project-board-view.tsx`.
- The `project-boards` OpenSpec capability.
