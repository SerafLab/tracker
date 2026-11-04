# Spec Delta

## MODIFIED Requirements

### Requirement: Shared application bar across states
The system SHALL show one application bar containing the EasyTrack brand, the current screen or state heading, and a settings gear on the catalogue, board, full card page, loading, storage-unavailable, and restart-required screens. The heading SHALL be the page's primary heading. With a card panel open, the application bar SHALL retain the board context and the panel SHALL identify its own card. The settings panel opened from the bar SHALL contain the sole accessible language selector.

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

#### Scenario: User opens a card panel
- **WHEN** пользователь открывает карточку с доски
- **THEN** общий AppBar сохраняет заголовок и действия доски, а панель имеет собственный доступный заголовок с сохранённым названием карточки


### Requirement: Contextual navigation and primary action
The application bar SHALL show an icon-only plus for project creation in the catalogue and status creation on a board. On a board, the EasyTrack brand SHALL return to the catalogue, replacing the separate catalogue-return control. The settings gear SHALL expose project renaming and project deletion on a board. The full card page SHALL provide an explicit return to its project board, brand navigation to the catalogue, and language settings, without creation, project-renaming or project-deletion actions. The card panel SHALL provide close and full-page actions while retaining board navigation. Leaving either card presentation SHALL respect unsaved-draft protection. Service states SHALL omit creation, project-renaming and project-deletion actions.

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
- **THEN** the application bar has no creation, project-renaming or project-deletion action, its settings panel provides language selection, and the state message retains its relevant guidance or recovery action

#### Scenario: User navigates from a card page
- **WHEN** пользователь открывает страницу карточки
- **THEN** доступен возврат к её доске, бренд ведёт в каталог через защиту черновиков, настройки содержат выбор языка, а создание статуса, переименование и удаление проекта отсутствуют

#### Scenario: User navigates from a card panel
- **WHEN** пользователь открывает панель карточки на доске
- **THEN** доступны закрытие панели и «Открыть на всю страницу», а действия доски и бренд проходят через защиту черновиков при уходе с карточки


### Requirement: Responsive application bar presentation
The application bar SHALL be a visually distinct, full-width light surface with a bottom boundary and content aligned with the main content width. In the catalogue, on the full card page and in service states it SHALL scroll with the document. On a project board, with or without an open card panel, the board workspace SHALL be bounded by the available viewport height below the application bar, using the dynamic viewport height on mobile browsers; the application bar SHALL remain at the top while the board content scrolls inside the workspace, and the page itself SHALL not scroll. On narrow screens the installation-guidance entry SHALL follow the board content inside the bounded workspace. At a 320 px viewport, the brand, heading, settings gear and creation plus when applicable SHALL remain visible and operable without horizontal page overflow or hiding the plus in a menu.

#### Scenario: User works on a narrow screen
- **WHEN** the catalogue or board is viewed at a width of 320 or 390 px
- **THEN** the bar uses two layout rows, with the brand and action icons above a full-width heading, and no horizontal page overflow

#### Scenario: User works on a wide screen
- **WHEN** the catalogue or board is viewed at a width of 1280 or 1440 px with a short heading
- **THEN** the brand, heading, creation plus and settings gear occupy a single layout row in that order

#### Scenario: User scrolls the page
- **WHEN** the user scrolls below the top of a long catalogue or full card page
- **THEN** the application bar moves with the document rather than remaining fixed above the content

#### Scenario: User scrolls a board
- **WHEN** the user scrolls a board's content vertically, with or without an open card panel, at 320, 390, 1280 or 1440 px
- **THEN** the board workspace scrolls inside the viewport-bounded area, the application bar stays at the top of the viewport, and the document itself does not scroll
