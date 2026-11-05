# Spec Delta

## ADDED Requirements

### Requirement: Supported viewports
The system SHALL support every viewport width of 320 CSS px and wider in the last two major versions of Chrome and Edge on desktop, Chrome on Android and Safari on iOS. At every supported viewport the page SHALL have no horizontal overflow, and the primary controls of the displayed screen SHALL remain visible and operable. The reference sizes 320×568, 390×844, 568×320, 820×1180, 1280×800 and 1440×900 SHALL be the checkpoints for requirements that refer to a supported viewport.

#### Scenario: Screen at a reference size
- **WHEN** the catalogue, a board, a board with an open card panel or a full card page is displayed at any reference size in either language
- **THEN** the page has no horizontal overflow, and the application bar brand, heading, settings gear and creation plus when applicable are visible and operable; a card panel that covers the whole screen on a narrow viewport instead keeps its open-full-page and close controls visible and operable

#### Scenario: Short landscape viewport
- **WHEN** a board is displayed at 568×320
- **THEN** the application bar stays visible, the document does not scroll, and every status is reachable by scrolling the board workspace

#### Scenario: Width between reference sizes
- **WHEN** a screen is displayed at a width of 320 px or more that is not a reference size
- **THEN** the page has no horizontal overflow and its primary controls remain operable
