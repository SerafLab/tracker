# Spec Delta

## MODIFIED Requirements

### Requirement: Card creation follows its status list
The system SHALL provide two card-creation entries in each status when the board contains at least one card: a square plus in the status header before its action menu, and a button after the card list combining the same plus with a visible label. Both entries SHALL open the same focused form for that status and return focus to the activated entry when the form closes, without forcing the board to scroll to the other entry. When the board contains no cards, header plus controls SHALL remain available in every status, lower card-creation entries SHALL be hidden, and the global add-status control SHALL remain available. The board with cards SHALL fit the available viewport height below the application bar; each status SHALL scroll its card list independently and keep its lower creation entry at the bottom.

#### Scenario: User creates a card after reviewing a status
- **WHEN** a user reaches the end of a status's cards and activates its lower creation entry
- **THEN** the card form opens for that status and closing the form returns focus to the lower button without changing existing cards

#### Scenario: User creates a card from the status header
- **WHEN** a user activates the plus in a status header
- **THEN** the same card form opens for that status and closing it returns focus to the header plus

#### Scenario: User sees creation entries on a board with cards
- **WHEN** at least one card exists anywhere on the board
- **THEN** every status shows a green square plus before its action menu and a lower button after its list with the same plus and a localized visible label; each is one button and one Tab stop

#### Scenario: User sees no card-creation entries on an empty board
- **WHEN** no cards exist in any status, including when statuses exist but are empty
- **THEN** header card-creation plus controls remain available, lower creation entries are hidden, and the global add-status plus remains available

#### Scenario: User creates the first card
- **WHEN** the user creates a card while the board contains no cards
- **THEN** the board shows both card-creation entries in every status

#### Scenario: User deletes the last card
- **WHEN** the only remaining card on the board is deleted
- **THEN** header card-creation plus controls remain available, lower creation entries are hidden again, and the global add-status plus remains available

#### Scenario: User identifies the header action
- **WHEN** a user hovers over or keyboard-focuses the header plus
- **THEN** a readable localized tooltip and an equivalent accessible name identify it as the add-card action

#### Scenario: User adds from the end of a long list
- **WHEN** a user scrolls a status's long card list to its lower creation button, opens the form, and closes it after creating or canceling
- **THEN** the lower button remains available at the bottom of the status, focus returns to it, and the board does not jump to the header

#### Scenario: User creates a card using the keyboard
- **WHEN** a user activates either creation entry with Enter or Space
- **THEN** the form receives focus and, after save, cancel, or Escape, focus returns to the specific entry that opened it

#### Scenario: User sees long status names on different screens
- **WHEN** a board with long status names is displayed at widths of 320, 390, 1280, or 1440 px
- **THEN** names wrap without covering the plus, count, or menu; controls remain reachable, the page has no horizontal overflow, and four statuses fit without horizontal board scrolling at desktop widths

#### Scenario: User works with a long column
- **WHEN** a status contains enough cards to exceed the available height below the application bar
- **THEN** the board height remains bounded by the available viewport height, only that status's card list scrolls vertically, and its lower add-card button remains visible at the bottom

#### Scenario: User works on a narrow viewport
- **WHEN** the board is shown on a narrow mobile viewport or its usable height changes
- **THEN** the board fits below the application bar, its card list remains vertically scrollable, and all status columns remain reachable through horizontal scrolling

#### Scenario: Saving from either entry fails
- **WHEN** a user opens the form from either entry, enters data, and saving fails
- **THEN** no card appears, the form retains its values and error, and closing it returns focus to the originating entry when that entry remains available

#### Scenario: User sees both creation entries
- **WHEN** на доске с хотя бы одной карточкой показан пустой или заполненный статус
- **THEN** перед меню в заголовке виден зелёный квадратный плюс; после списка виден такой же плюс с локализованной подписью, образующие одну кнопку и одну остановку Tab
