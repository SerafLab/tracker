# Tasks

## 1. Project catalogue summaries

- [x] 1.1 Add a project catalogue summary type and repository query that returns each project's card count across all its statuses; verify repository tests cover zero, one, and multiple cards and projects with no statuses.
- [x] 1.2 Pass catalogue summaries through use cases and workspace state to the catalogue view; verify application and store tests assert summaries update when the catalogue is loaded.

## 2. Tile catalogue interface

- [x] 2.1 Replace the vertical project rows with responsive project tiles showing the project name, localized card count, and existing rename menu; verify presentation tests cover opening, renaming, and zero/one/multiple-card labels in English and Russian.
- [x] 2.2 Add responsive grid and tile styling for narrow and wide screens, including long project names; verify the rendered catalogue remains usable without horizontal page overflow at supported mobile widths.

## 3. Integration

- [x] 3.1 Review catalogue creation, empty, error, and navigation states with the new summary contract; verify existing relevant checks pass and the catalogue remains functional when there are no projects.
