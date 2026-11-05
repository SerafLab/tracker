# Spec Delta

## MODIFIED Requirements

### Requirement: Calm application bar hierarchy
The system SHALL retain a warm light application bar with a restrained creation plus in the active color theme's accent and a visually secondary settings gear. The heading SHALL remain the single primary heading. Every application-bar heading SHALL occupy one line; text that exceeds the available width SHALL end with an ellipsis without changing the bar height, hiding controls, or causing page-level horizontal overflow. The complete heading SHALL remain available to assistive technology and, when truncated, in a hint on pointer hover or keyboard focus. The same visual tokens SHALL apply to service screens.

#### Scenario: User views the chosen board direction
- **WHEN** a project board is displayed at 320, 390, 1280 or 1440 px
- **THEN** the heading remains on one line, the plus precedes the settings gear, all required controls remain operable, and the page has no horizontal overflow

#### Scenario: User has a long project name
- **WHEN** the current project name exceeds the available title width, including a name without spaces
- **THEN** it ends with an ellipsis within the title area, the application bar keeps the same height as with a short name at that viewport, and the brand and actions remain visible without overlap; on narrow screens the title retains the full second row

#### Scenario: User discovers the complete project name
- **WHEN** a visually truncated project heading is hovered or focused with the keyboard
- **THEN** a hint shows the complete project name, while the primary heading exposes the complete text to assistive technology

#### Scenario: Another application state has a long heading
- **WHEN** a catalogue or service-state heading exceeds the available width
- **THEN** that heading also occupies one line with an ellipsis and retains its complete semantic text

