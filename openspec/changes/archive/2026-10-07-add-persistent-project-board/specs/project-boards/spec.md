# Spec Delta

## Purpose

Позволяет вести несколько личных проектов как локально сохраняемые доски со статусами и карточками, чтобы пользователь видел этапы своих объектов и мог к ним вернуться.

## ADDED Requirements

### Requirement: Project catalogue and board navigation
The system SHALL let the user view locally stored projects, create a project with a non-empty name, rename an existing project, and open one project's board at a time. Duplicate project names SHALL be permitted. Creating a project SHALL open its board, and the board SHALL provide a control to return to the project catalogue.

#### Scenario: User creates and opens projects
- **WHEN** the user creates projects named "Поиск квартиры" and "Паспорт" and chooses one from the catalogue
- **THEN** the selected project's board is displayed without the other project's statuses or cards

#### Scenario: User submits an empty project name
- **WHEN** the user tries to create or rename a project with a name containing only whitespace
- **THEN** the project is not created or renamed and the interface indicates that a name is required

### Requirement: Configurable ordered statuses
The system SHALL allow the user to create and rename statuses within the open project and change a status's position with explicit controls. A newly created status SHALL be appended after the project's existing statuses. Duplicate status names SHALL be permitted.

#### Scenario: User configures a new board
- **WHEN** a user opens a project that has no statuses
- **THEN** the board explains that a status must be created and provides a control to create one

#### Scenario: User reorders a status
- **WHEN** the user moves a status left or right using its explicit ordering control
- **THEN** the board shows the statuses in the resulting order

### Requirement: Cards always belong to a status
The system SHALL allow the user to create a card with a non-empty name in a selected status, rename it, and move it to another status through an explicit accessible control. Each card SHALL belong to exactly one status. A new or moved card SHALL be placed after the existing cards in its destination status.

#### Scenario: User moves a card between statuses
- **WHEN** the user moves a card from "Найдено" to "Договорились о просмотре"
- **THEN** the card is no longer shown in "Найдено" and is shown at the end of "Договорились о просмотре"

#### Scenario: Project has no statuses
- **WHEN** an open project has no statuses
- **THEN** the interface does not offer creation of a card until the user creates a status

### Requirement: Persistent local board state
The system SHALL preserve projects, statuses, cards, their names, relationships, and explicit order in local browser storage across reloads. After a reload, the system SHALL reopen the last open project when it still exists; otherwise it SHALL show the project catalogue or its empty state.

#### Scenario: User returns after reloading
- **WHEN** the user creates projects, configures statuses, creates or moves cards, and reloads the application
- **THEN** the data and its ordering are retained and the last open project's board is displayed

### Requirement: Accessible, mobile-usable board controls
The system SHALL expose the primary project, status, and card operations through semantic controls usable without drag-and-drop. On a narrow viewport, all status columns and their primary controls SHALL remain reachable, including through horizontal scrolling when necessary.

#### Scenario: User works on a narrow viewport
- **WHEN** the board is displayed in a narrow mobile viewport with several statuses
- **THEN** the user can reach each status and create, rename, reorder, or move items through visible controls

### Requirement: Local-storage failure is explicit
The system SHALL make a local-storage failure visible and SHALL not report a board mutation as saved when the mutation cannot be persisted.

#### Scenario: Browser storage is unavailable
- **WHEN** the application cannot open or write its local storage
- **THEN** the interface displays that the working board is unavailable rather than presenting unsaved data as persistent
