# Spec Delta

## MODIFIED Requirements

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
