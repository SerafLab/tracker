# application-shell Specification

## Purpose

Обеспечивает единый видимый контекст, навигацию и основные действия на всех экранах EasyTrack, включая служебные состояния приложения.

## Requirements

### Requirement: Shared application bar across states
The system SHALL show one application bar containing the EasyTrack name, the current screen or state heading, and the sole accessible language selector on the catalogue, board, loading, storage-unavailable, and restart-required screens. The current heading SHALL be the page's primary heading.

#### Scenario: User navigates from catalogue to board
- **WHEN** the user opens a project from the catalogue
- **THEN** the application bar changes its heading from the catalogue title to the project name without showing a second page heading in the content

#### Scenario: Application enters a service state
- **WHEN** the application is loading, its storage is unavailable, or it requires a restart
- **THEN** the application bar identifies that state and still provides the language selector

#### Scenario: User opens a dialog
- **WHEN** the user opens a create, rename, move, or installation-guidance dialog
- **THEN** the dialog contains no language selector and the application bar remains the sole location of that control

### Requirement: Contextual navigation and primary action
The application bar SHALL show a project-creation action in the catalogue and a catalogue-return control, project-actions control, and status-creation action on a board. It SHALL omit creation actions in loading, storage-unavailable, and restart-required states.

#### Scenario: User works in the catalogue
- **WHEN** the catalogue is displayed, whether empty or populated
- **THEN** its application bar offers the localized «Создать проект» action and no status-creation action

#### Scenario: User works on a board
- **WHEN** a project board is displayed, whether or not it has statuses
- **THEN** its application bar identifies the project and provides localized «Все проекты», project actions, and «Добавить статус» controls

#### Scenario: User encounters a service state
- **WHEN** the application is loading, its storage is unavailable, or a restart is required
- **THEN** its application bar has no project- or status-creation action and the state message retains its relevant guidance or recovery action

### Requirement: Responsive application bar presentation
The application bar SHALL be a visually distinct, full-width light surface with a bottom boundary and content aligned with the main content width. It SHALL scroll with the document. At a 320 px viewport, its heading, language selector, navigation control when applicable, and primary action when applicable SHALL remain visible and operable without horizontal page overflow or hiding those controls in a menu.

#### Scenario: User works on a narrow screen
- **WHEN** the catalogue or board is viewed at a width of 320 px
- **THEN** the application bar occupies no more than two layout rows while its heading, language selector, navigation, and primary action remain readable and reachable

#### Scenario: User scrolls the page
- **WHEN** the user scrolls below the top of a long catalogue or board
- **THEN** the application bar moves with the document rather than remaining fixed above the content

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
