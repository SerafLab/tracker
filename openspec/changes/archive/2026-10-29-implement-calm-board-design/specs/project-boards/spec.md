# Spec Delta

## ADDED Requirements

### Requirement: Calm board and card presentation
The system SHALL present statuses as open columns on a warm neutral workspace, with individually bounded light cards and restrained green actions. Status headers SHALL show a compact card count. Priority flags SHALL remain readable text with distinct symbols or shapes, without assigning completion meaning to statuses. Existing visible move arrows and secondary controls SHALL remain available.

#### Scenario: User compares cards across statuses
- **WHEN** a board contains cards with all four priority-flag combinations
- **THEN** cards remain individually distinct, only enabled flags are labeled, and both move arrows and the card menu remain reachable

### Requirement: Useful desktop board width and contained mobile scrolling
The system SHALL fit all four status columns of a four-status board at viewport widths 1280 and 1440 px without horizontal board scrolling. At 320 and 390 px, status columns SHALL retain readable cards and touch controls using horizontal scrolling contained within the board, with no horizontal page overflow. Long user names SHALL wrap without covering controls.

#### Scenario: User views a four-status board on desktop
- **WHEN** the viewport is 1280 or 1440 px wide and the board contains four statuses
- **THEN** all four status headers and card widths fit the working area at once

#### Scenario: User reaches another status on mobile
- **WHEN** the viewport is 320 or 390 px wide and the board contains several statuses with long names
- **THEN** the user can horizontally scroll the board to every status while the page width remains within the viewport and controls remain operable

### Requirement: Card creation follows its status list
The system SHALL place each status's card-creation entry after its card list, including when the list is empty. The entry SHALL open the existing focused form and retain its established return-focus behavior.

#### Scenario: User creates a card after reviewing a status
- **WHEN** a user reaches the end of a status's cards and activates its creation entry
- **THEN** the card form opens and closing the form returns focus to that entry without changing existing cards
