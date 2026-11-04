# application-shell Specification

## Purpose

Обеспечивает единый видимый контекст, навигацию и основные действия на всех экранах EasyTrack, включая служебные состояния приложения.

## Requirements

### Requirement: Shared application bar across states
The system SHALL show one application bar containing the EasyTrack brand, the current screen or state heading, and a settings gear on the catalogue, board, card-detail, loading, storage-unavailable, and restart-required screens. The heading SHALL be the page's primary heading. The settings panel opened from the bar SHALL contain the sole accessible language selector.

#### Scenario: User navigates from catalogue to board
- **WHEN** the user opens a project from the catalogue
- **THEN** the application bar changes its heading from the catalogue title to the project name without showing a second page heading in the content

#### Scenario: Application enters a service state
- **WHEN** the application is loading, its storage is unavailable, or it requires a restart
- **THEN** the application bar identifies that state and still provides a settings gear that opens the language selector

#### Scenario: User opens a dialog
- **WHEN** the user opens a create, rename, move, or installation-guidance dialog
- **THEN** the settings panel is closed, its language selector is unavailable, the application bar is unavailable, and the modal dialog contains no language selector

#### Scenario: User opens a card page
- **WHEN** пользователь открывает страницу карточки
- **THEN** общий AppBar показывает сохранённое название карточки как единственный основной заголовок и настройки с единственным выбором языка; редактирование черновика не меняет заголовок до сохранения

### Requirement: Contextual navigation and primary action
The application bar SHALL show an icon-only plus for project creation in the catalogue and status creation on a board. On a board, the EasyTrack brand SHALL return to the catalogue, replacing the separate catalogue-return control. The settings gear SHALL expose project renaming and project deletion on a board. The card-detail page SHALL provide an explicit return to its project board, brand navigation to the catalogue, and language settings, without creation, project-renaming, or project-deletion actions. Card-page navigation SHALL respect unsaved-draft protection. Service states SHALL omit creation, project-renaming, and project-deletion actions.

#### Scenario: User works in the catalogue
- **WHEN** the catalogue is displayed, whether empty or populated
- **THEN** its application bar offers one plus with the localized accessible name «Создать проект» and a settings gear containing only application-language settings

#### Scenario: User works on a board
- **WHEN** a project board is displayed, whether or not it has statuses
- **THEN** its application bar identifies the project and provides a plus with the localized accessible name «Добавить статус» and a settings gear containing «Переименовать проект», «Удалить проект» and application-language settings, without a separate project-actions control

#### Scenario: User returns through the brand
- **WHEN** the user activates the EasyTrack brand from a board using a pointer or keyboard
- **THEN** the catalogue opens using normal application navigation, no project data changes, and there is no separate «Все проекты» control in the bar

#### Scenario: User encounters a service state
- **WHEN** the application is loading, its storage is unavailable, or a restart is required
- **THEN** the application bar has no creation, project-renaming, or project-deletion action, its settings panel provides language selection, and the state message retains its relevant guidance or recovery action

#### Scenario: User navigates from a card page
- **WHEN** пользователь открывает страницу карточки
- **THEN** доступен возврат к её доске, бренд ведёт в каталог через защиту черновиков, настройки содержат выбор языка, а создание статуса, переименование и удаление проекта отсутствуют

### Requirement: Responsive application bar presentation
The application bar SHALL be a visually distinct, full-width light surface with a bottom boundary and content aligned with the main content width. It SHALL scroll with the document. At a 320 px viewport, the brand, heading, settings gear and creation plus when applicable SHALL remain visible and operable without horizontal page overflow or hiding the plus in a menu.

#### Scenario: User works on a narrow screen
- **WHEN** the catalogue or board is viewed at a width of 320 or 390 px
- **THEN** the bar uses two layout rows, with the brand and action icons above a full-width heading, and no horizontal page overflow

#### Scenario: User works on a wide screen
- **WHEN** the catalogue or board is viewed at a width of 1280 or 1440 px with a short heading
- **THEN** the brand, heading, creation plus and settings gear occupy a single layout row in that order

#### Scenario: User scrolls the page
- **WHEN** the user scrolls below the top of a long catalogue or board
- **THEN** the application bar moves with the document rather than remaining fixed above the content

### Requirement: Calm application bar hierarchy
The system SHALL retain a warm light application bar with a restrained green creation plus and a visually secondary settings gear. The heading SHALL remain the single primary heading. Every application-bar heading SHALL occupy one line; text that exceeds the available width SHALL end with an ellipsis without changing the bar height, hiding controls, or causing page-level horizontal overflow. The complete heading SHALL remain available to assistive technology and, when truncated, in a hint on pointer hover or keyboard focus. The same visual tokens SHALL apply to service screens.

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

### Requirement: Non-overlapping mobile installation guidance entry
The system SHALL place the installation-guidance entry after the workspace content in normal document flow on narrow screens so it does not cover cards or their controls. The entry SHALL remain accessible with its existing installation behavior.

#### Scenario: User reaches the end of a mobile board
- **WHEN** a user scrolls a board at 320 or 390 px
- **THEN** the installation-guidance entry can be reached after the board and does not overlay a card or its controls

### Requirement: Accessible compact application bar controls
The system SHALL give the creation plus and settings gear localized accessible names and purpose tooltips available on hover and keyboard focus. The board's brand navigation SHALL retain EasyTrack in its accessible name and explain its catalogue destination. Interactive bar controls SHALL have targets of at least 44 by 44 CSS pixels and visible keyboard focus.

#### Scenario: User discovers compact controls
- **WHEN** a user hovers or focuses the board's brand, plus or gear
- **THEN** localized hints explain «Все проекты», «Добавить статус» or «Настройки» respectively, and assistive technology can identify each control's purpose

#### Scenario: User discovers project creation
- **WHEN** a user hovers or focuses the catalogue's plus
- **THEN** its localized hint and accessible name explain «Создать проект»

### Requirement: Settings panel interaction
The settings gear SHALL open and close one non-modal panel. The panel SHALL support keyboard access to its controls, close on Escape or outside interaction, and restore focus to the gear on Escape. Starting project renaming or deletion SHALL close the panel before opening its dialog. Cancelling either dialog SHALL return focus to the gear; successful renaming SHALL also return focus to the gear, while successful deletion SHALL follow project-deletion navigation and focus rules.

#### Scenario: User renames the current project
- **WHEN** the user opens board settings and chooses «Переименовать проект»
- **THEN** settings close, the existing rename dialog opens for the current project, and completing or cancelling it returns focus to the gear

#### Scenario: User dismisses settings with the keyboard
- **WHEN** the user presses Escape while focus is within the settings panel
- **THEN** the panel closes and focus returns to the gear

#### Scenario: User opens a creation dialog
- **WHEN** the user opens a create-project or create-status dialog with the plus
- **THEN** settings are closed, the dialog receives focus, and completing or cancelling returns focus to the plus

#### Scenario: User starts deleting the current project
- **WHEN** пользователь выбирает «Удалить проект» в настройках доски
- **THEN** панель закрывается, открывается подтверждение текущего проекта, панель приложения и её выбор языка недоступны до закрытия диалога

#### Scenario: User cancels deleting the current project
- **WHEN** пользователь отменяет удаление проекта в диалоге
- **THEN** доска сохраняется, фокус возвращается к шестерёнке, панель настроек остаётся закрытой
