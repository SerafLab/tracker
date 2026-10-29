# Spec Delta

## ADDED Requirements

### Requirement: Calm application bar hierarchy
The system SHALL present a warm light application bar with a restrained green primary action. On catalogue and board screens it SHALL separate screen identity and language from navigation and creation actions into two layout rows, retaining the single primary heading, sole accessible language selector and existing controls. The same visual tokens SHALL apply to service screens.

#### Scenario: User views the chosen board direction
- **WHEN** a project board is displayed at 320, 390, 1280 or 1440 px
- **THEN** its heading and language appear above navigation and creation actions, all required controls remain operable, and the page has no horizontal overflow

#### Scenario: User has a long project name
- **WHEN** the current project name exceeds the available title width
- **THEN** it wraps within the bar without hiding the language selector or navigation and creation actions

### Requirement: Non-overlapping mobile installation guidance entry
The system SHALL place the installation-guidance entry after the workspace content in normal document flow on narrow screens so it does not cover cards or their controls. The entry SHALL remain accessible with its existing installation behavior.

#### Scenario: User reaches the end of a mobile board
- **WHEN** a user scrolls a board at 320 or 390 px
- **THEN** the installation-guidance entry can be reached after the board and does not overlay a card or its controls
