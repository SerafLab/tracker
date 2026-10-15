# Spec Delta

## ADDED Requirements

### Requirement: Clear workspace interface states
The system SHALL distinguish loading, empty, error, and inactive controls with accessible text and visually distinct presentation. It SHALL not infer that a card is completed from a status name or assign completion semantics to a status.

#### Scenario: User opens an empty catalogue
- **WHEN** local storage opens successfully and contains no projects
- **THEN** the catalogue explains that no projects exist and provides an immediately understandable way to create the first project

#### Scenario: Project has no statuses
- **WHEN** the user opens a project without statuses
- **THEN** the board explains that a status is required before cards can be created and provides a control to add one

#### Scenario: An action is unavailable
- **WHEN** a status is already first or last in the order
- **THEN** its unavailable ordering action is visibly inactive and cannot be invoked

#### Scenario: User names a status "Завершено"
- **WHEN** a user creates or renames a status to "Завершено"
- **THEN** the system continues to treat it as a user-defined status without adding a completed field or automatic completion behavior to its cards

## MODIFIED Requirements

### Requirement: Project catalogue and board navigation
The system SHALL present a distinct project catalogue and one open project board at a time. It SHALL let the user view locally stored projects, create a project with a non-empty name through a primary creation control, rename an existing project, and open a project. Duplicate project names SHALL be permitted. Creating a project SHALL open its board, and the board SHALL provide a clear control to return to the catalogue.

#### Scenario: User creates and opens projects
- **WHEN** the user creates projects named "Поиск квартиры" and "Паспорт" and chooses one from the catalogue
- **THEN** the selected project's board is displayed without the other project's statuses or cards

#### Scenario: User submits an empty project name
- **WHEN** the user tries to create or rename a project with a name containing only whitespace
- **THEN** the project is not created or renamed and the interface indicates that a name is required

#### Scenario: User starts creating a project from a populated catalogue
- **WHEN** the user activates the catalogue's primary project-creation control
- **THEN** the interface exposes a focused form for the name without obscuring the creation action's purpose

### Requirement: Configurable ordered statuses
The system SHALL allow the user to create and rename statuses within the open project and change a status's position with explicit accessible controls. A newly created status SHALL be appended after the project's existing statuses. Duplicate status names SHALL be permitted. Secondary status operations MAY be progressively disclosed, provided their purpose remains reachable through semantic controls.

#### Scenario: User configures a new board
- **WHEN** a user opens a project that has no statuses
- **THEN** the board explains that a status must be created and provides a control to create one

#### Scenario: User reorders a status
- **WHEN** the user moves a status left or right using its explicit ordering control
- **THEN** the board shows the statuses in the resulting order

#### Scenario: User opens a status action menu
- **WHEN** the user activates a status's secondary-action control
- **THEN** the available rename and ordering actions are identifiable and operable without drag-and-drop

### Requirement: Cards always belong to a status
The system SHALL allow the user to create a card with a non-empty name in a selected status, rename it, and move it to another status through an explicit accessible control. Each card SHALL belong to exactly one status. A new or moved card SHALL be placed after the existing cards in its destination status. Secondary card actions MAY be progressively disclosed without removing their semantic labels.

#### Scenario: User moves a card between statuses
- **WHEN** the user moves a card from "Найдено" to "Договорились о просмотре"
- **THEN** the card is no longer shown in "Найдено" and is shown at the end of "Договорились о просмотре"

#### Scenario: Project has no statuses
- **WHEN** an open project has no statuses
- **THEN** the interface does not offer creation of a card until the user creates a status

#### Scenario: User opens a card action menu
- **WHEN** the user activates a card's secondary-action control
- **THEN** rename and move actions are discoverable and the resulting form identifies the card and destination choices

### Requirement: Accessible, mobile-usable board controls
The system SHALL expose primary project, status, and card operations through semantic controls usable without drag-and-drop. It SHALL provide compact contextual forms in a dialog on wider screens and a mobile-appropriate sheet or equivalent focus-managed surface on narrow screens. On a narrow viewport, all status columns and their primary controls SHALL remain reachable, including through horizontal scrolling when necessary.

#### Scenario: User works on a narrow viewport
- **WHEN** the board is displayed in a narrow mobile viewport with several statuses
- **THEN** the user can reach each status and create, rename, reorder, or move items through visible controls

#### Scenario: User edits from a narrow viewport
- **WHEN** the user starts a create, rename, or move action on a narrow viewport
- **THEN** its form is readable, receives focus, and can be completed or dismissed without losing access to the board
