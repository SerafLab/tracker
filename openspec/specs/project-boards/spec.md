# project-boards Specification

## Purpose

Позволяет вести несколько личных проектов как локально сохраняемые доски со статусами и карточками, чтобы пользователь видел этапы своих объектов и мог к ним вернуться.

## Requirements

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
The system SHALL allow the user to create a card with a non-empty name in a selected status, rename it, and move it to either adjacent status through always visible, accessible arrow buttons with one activation and no confirmation. It SHALL also offer a secondary action to choose any other status. Each card SHALL belong to exactly one status. A new or moved card SHALL be placed after the existing cards in its destination status. Secondary card actions MAY be progressively disclosed without removing their semantic labels.

#### Scenario: User moves a card between statuses
- **WHEN** the user moves a card from "Найдено" to "Договорились о просмотре"
- **THEN** the card is no longer shown in "Найдено" and is shown at the end of "Договорились о просмотре"

#### Scenario: User moves a card to an adjacent status
- **WHEN** the user activates the card's enabled left or right arrow
- **THEN** the card moves immediately to the adjacent status in that direction, appears after its existing cards, and is saved without a confirmation step

#### Scenario: User reaches a board boundary
- **WHEN** the card is in the first or last status
- **THEN** its arrow toward the missing adjacent status remains visible, is identified as unavailable, and cannot be invoked

#### Scenario: Project has one status
- **WHEN** a card is in the board's only status
- **THEN** both move arrows are unavailable and the action to choose another status is absent

#### Scenario: Project has no statuses
- **WHEN** an open project has no statuses
- **THEN** the interface does not offer creation of a card until the user creates a status

#### Scenario: User opens a card action menu
- **WHEN** the user activates a card's secondary-action control on a board with multiple statuses
- **THEN** rename and "Переместить в…" actions are discoverable, and the resulting move form identifies the card and offers every other status but not its current status

#### Scenario: User chooses a nonadjacent status
- **WHEN** the user selects a nonadjacent status in the move form and confirms
- **THEN** the card is moved directly to the selected status and appears after its existing cards

#### Scenario: Card move cannot be saved
- **WHEN** saving a card move fails
- **THEN** the card remains in its original status and the interface reports the failure

### Requirement: Persistent local board state
The system SHALL preserve projects, statuses, cards, their names, relationships, and explicit order in local browser storage across reloads. After a reload, the system SHALL reopen the last open project when it still exists; otherwise it SHALL show the project catalogue or its empty state.

#### Scenario: User returns after reloading
- **WHEN** the user creates projects, configures statuses, creates or moves cards, and reloads the application
- **THEN** the data and its ordering are retained and the last open project's board is displayed

### Requirement: Accessible, mobile-usable board controls
The system SHALL expose primary project, status, and card operations through semantic controls usable without drag-and-drop. Card move arrows SHALL remain visible and usable by touch and keyboard on narrow screens. After a keyboard-initiated card move succeeds, focus SHALL return to a control on the moved card without an additional programmatic scroll of the board. The system SHALL provide compact contextual forms in a dialog on wider screens and a mobile-appropriate sheet or equivalent focus-managed surface on narrow screens. On a narrow viewport, all status columns and their primary controls SHALL remain reachable, including through horizontal scrolling when necessary.

#### Scenario: User works on a narrow viewport
- **WHEN** the board is displayed in a narrow mobile viewport with several statuses
- **THEN** the user can reach each status and create, rename, reorder, or move items through visible controls

#### Scenario: User edits from a narrow viewport
- **WHEN** the user starts a create, rename, or move action on a narrow viewport
- **THEN** its form is readable, receives focus, and can be completed or dismissed without losing access to the board

#### Scenario: Keyboard user moves a card
- **WHEN** a keyboard user activates an available card move control and the move succeeds
- **THEN** focus remains on an operable control of that card in its new status

#### Scenario: User moves a card on a narrow viewport
- **WHEN** a user activates an available card arrow on a narrow viewport
- **THEN** the card moves to the adjacent status without requiring a menu or form

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

### Requirement: Local-storage failure is explicit
The system SHALL make a local-storage failure visible and SHALL not report a board mutation as saved when the mutation cannot be persisted.

#### Scenario: Browser storage is unavailable
- **WHEN** the application cannot open or write its local storage
- **THEN** the interface displays that the working board is unavailable rather than presenting unsaved data as persistent

### Requirement: Predictable dismissal of action menus
The system SHALL dismiss an open project, status, or card action menu when the user presses outside that menu with a mouse or touch, or moves keyboard focus outside it. The outside target SHALL retain its normal action and focus. Escape SHALL dismiss the menu and return focus to its trigger.

#### Scenario: User presses outside an action menu
- **WHEN** a project, status, or card action menu is open and the user clicks or taps outside its trigger and menu panel
- **THEN** that menu closes and the outside target performs its normal action without moving focus back to the menu trigger

#### Scenario: User switches between action menus
- **WHEN** an action menu is open and the user presses the trigger of another action menu
- **THEN** the first menu closes and the second opens with that single press

#### Scenario: Keyboard focus leaves an action menu
- **WHEN** an action menu is open and the user presses Tab to move focus beyond its trigger and menu panel
- **THEN** the menu closes and focus remains on the next focusable element

#### Scenario: User dismisses an action menu with Escape
- **WHEN** an action menu is open and the user presses Escape
- **THEN** the menu closes and focus returns to its trigger

#### Scenario: User interacts within an action menu
- **WHEN** an action menu is open and the user presses its trigger or an enabled action item
- **THEN** the trigger toggles that menu or the item invokes its action, respectively
