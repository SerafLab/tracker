# application-shell Specification

## Purpose

Обеспечивает единый видимый контекст, навигацию и основные действия на всех экранах EasyTrack, включая служебные состояния приложения.

## Requirements

### Requirement: Shared application bar across states
The system SHALL show one application bar containing the EasyTrack brand and the current screen or state heading on the catalogue, board, full card page, settings page, loading, storage-unavailable, and restart-required screens. Every screen except the settings page SHALL also show a settings gear that opens the settings page. Except on the full card page, the heading SHALL be the page's primary heading; on the full card page the bar SHALL show the card's project and status as plain-text context, and the card name in the content SHALL be the primary heading. With a card panel open, the application bar SHALL retain the board context. The settings page SHALL contain the sole accessible language choice and the sole accessible color theme choice.

#### Scenario: User navigates from catalogue to board
- **WHEN** the user opens a project from the catalogue
- **THEN** the application bar changes its heading from the catalogue title to the project name without showing a second page heading in the content

#### Scenario: Application enters a service state
- **WHEN** the application is loading, its storage is unavailable, or it requires a restart
- **THEN** the application bar identifies that state and still provides a settings gear that opens the settings page with the language choice

#### Scenario: User opens a dialog
- **WHEN** the user opens a create, rename, move, or installation-guidance dialog
- **THEN** the application bar is unavailable and the modal dialog contains no language or color theme choice

#### Scenario: User opens a card page
- **WHEN** пользователь открывает страницу карточки
- **THEN** общий AppBar показывает «Проект › Статус» простым текстом без ссылок и шестерёнку настроек без выбора языка в самой панели, а единственным основным заголовком страницы является сохранённое название карточки в блоке «Основное»; редактирование черновика не меняет заголовок до сохранения

#### Scenario: User opens a card panel
- **WHEN** пользователь открывает карточку с доски
- **THEN** общий AppBar сохраняет заголовок и действия доски, а панель имеет доступное название области и заголовок блока «Основное» с сохранённым названием карточки

### Requirement: Contextual navigation and primary action
The application bar SHALL show an icon-only plus for project creation in the catalogue and status creation on a board. On a board, the EasyTrack brand SHALL return to the catalogue, replacing the separate catalogue-return control, and a «⋯» project-actions control SHALL expose project renaming and project deletion. The full card page SHALL provide an explicit return to its project board and brand navigation to the catalogue, without creation, project-renaming or project-deletion actions. The card panel SHALL provide close and full-page actions while retaining board navigation. Leaving either card presentation, including opening settings, SHALL respect unsaved-draft protection. Service states and the settings page SHALL omit creation and project actions.

#### Scenario: User works in the catalogue
- **WHEN** the catalogue is displayed, whether empty or populated
- **THEN** its application bar offers one plus with the localized accessible name «Создать проект» and a settings gear, without a project-actions control

#### Scenario: User works on a board
- **WHEN** a project board is displayed, whether or not it has statuses
- **THEN** its application bar identifies the project and provides, in this order, a plus with the localized accessible name «Добавить статус», a «⋯» control named «Действия проекта» containing «Переименовать проект» and «Удалить проект», and a settings gear

#### Scenario: User returns through the brand
- **WHEN** the user activates the EasyTrack brand from a board using a pointer or keyboard
- **THEN** the catalogue opens using normal application navigation, no project data changes, and there is no separate «Все проекты» control in the bar

#### Scenario: User encounters a service state
- **WHEN** the application is loading, its storage is unavailable, or a restart is required
- **THEN** the application bar has no creation or project-actions control, its settings gear opens the settings page, and the state message retains its relevant guidance or recovery action

#### Scenario: User navigates from a card page
- **WHEN** пользователь открывает страницу карточки
- **THEN** доступен возврат к её доске, бренд и шестерёнка ведут в каталог и на страницу настроек через защиту черновиков, а создание статуса и меню действий проекта отсутствуют

#### Scenario: User navigates from a card panel
- **WHEN** пользователь открывает панель карточки на доске
- **THEN** доступны закрытие панели и «Открыть на всю страницу», а действия доски, бренд и шестерёнка проходят через защиту черновиков при уходе с карточки

### Requirement: Responsive application bar presentation
The application bar SHALL be a visually distinct, full-width light surface with a bottom boundary and content aligned with the main content width. In the catalogue, on the full card page, on the settings page and in service states it SHALL scroll with the document. On a project board, with or without an open card panel, the board workspace SHALL be bounded by the available viewport height below the application bar, using the dynamic viewport height on mobile browsers; the application bar SHALL remain at the top while the whole board scrolls inside the workspace vertically and horizontally, and the page itself SHALL not scroll. At a 320 px viewport, the brand, heading, settings gear or settings-page return, creation plus and project-actions control when applicable SHALL remain visible and operable without horizontal page overflow or hiding the plus in a menu.

#### Scenario: User works on a narrow screen
- **WHEN** the catalogue, a board or the settings page is viewed at a width of 320 or 390 px
- **THEN** the bar uses two layout rows, with the brand and action icons above a full-width heading, and no horizontal page overflow; on a board the top row shows the brand, plus, «⋯» and gear in that order

#### Scenario: User works on a wide screen
- **WHEN** the catalogue or board is viewed at a width of 1280 or 1440 px with a short heading
- **THEN** the brand, heading, creation plus, project-actions control when applicable and settings gear occupy a single layout row in that order

#### Scenario: User scrolls the page
- **WHEN** the user scrolls below the top of a long catalogue, full card page or settings page
- **THEN** the application bar moves with the document rather than remaining fixed above the content

#### Scenario: User scrolls a board
- **WHEN** the user scrolls a board's content vertically or horizontally, with or without an open card panel, at 320, 390, 1280 or 1440 px
- **THEN** every status scrolls together inside the viewport-bounded workspace, the application bar stays at the top of the viewport in full on every width, and the document itself does not scroll

### Requirement: Calm application bar hierarchy
The system SHALL retain a warm light application bar with a restrained creation plus in the active color theme's accent and visually secondary project-actions, settings and return controls. Every application-bar heading or card-page context SHALL occupy one line; text that exceeds the available width SHALL end with an ellipsis without changing the bar height, hiding controls, or causing page-level horizontal overflow. On the card page the project and status SHALL truncate independently. The complete text SHALL remain available to assistive technology and, when truncated, in a hint on pointer hover or keyboard focus. The same visual tokens SHALL apply to service screens and the settings page.

#### Scenario: User views the chosen board direction
- **WHEN** a project board is displayed at 320, 390, 1280 or 1440 px
- **THEN** the heading remains on one line, the plus precedes the «⋯» control and the settings gear, all required controls remain operable, and the page has no horizontal overflow

#### Scenario: User has a long project name
- **WHEN** the current project name exceeds the available title width, including a name without spaces
- **THEN** it ends with an ellipsis within the title area, the application bar keeps the same height as with a short name at that viewport, and the brand and actions remain visible without overlap; on narrow screens the title retains the full second row

#### Scenario: User discovers the complete project name
- **WHEN** a visually truncated project heading is hovered or focused with the keyboard
- **THEN** a hint shows the complete project name, while the primary heading exposes the complete text to assistive technology

#### Scenario: Another application state has a long heading
- **WHEN** a catalogue or service-state heading exceeds the available width
- **THEN** that heading also occupies one line with an ellipsis and retains its complete semantic text

#### Scenario: Card page has a long project and status
- **WHEN** на странице карточки названия проекта и статуса не помещаются в шапке на ширине 320 или 1280 px
- **THEN** контекст занимает одну строку, проект и статус обрезаются многоточием каждый в своей части с видимым разделителем, высота шапки не меняется, а наведение или фокус на обрезанной части показывает её полный текст

### Requirement: Accessible compact application bar controls
The system SHALL give the creation plus, project-actions control, settings gear and settings-page return localized accessible names and purpose tooltips available on hover and keyboard focus. The brand navigation SHALL retain EasyTrack in its accessible name and explain its catalogue destination. Interactive bar controls SHALL have targets of at least 44 by 44 CSS pixels and visible keyboard focus.

#### Scenario: User discovers compact controls
- **WHEN** a user hovers or focuses the board's brand, plus, «⋯» or gear
- **THEN** localized hints explain «Все проекты», «Добавить статус», «Действия проекта» or «Настройки» respectively, and assistive technology can identify each control's purpose

#### Scenario: User discovers project creation
- **WHEN** a user hovers or focuses the catalogue's plus
- **THEN** its localized hint and accessible name explain «Создать проект»

### Requirement: Shared notification area
The system SHALL show notifications in one application-wide area at the bottom centre of the viewport, clear of the device safe area. Notifications SHALL overlay the content without shifting the layout. The area SHALL serve every screen, and callers SHALL not choose a different position per notification. Transient notifications SHALL appear above persistent notices without overlapping them.

#### Scenario: Notification appears on a board
- **WHEN** a notification is shown while a board is displayed at 320, 390, 1280 or 1440 px
- **THEN** it appears at the bottom centre of the viewport, the status columns and application bar keep their position and size, and the page gains no horizontal overflow

#### Scenario: Installed app on a device with a home indicator
- **WHEN** the installed app shows a notification on a device with a bottom safe-area inset
- **THEN** the notification is placed above the inset and remains fully visible

#### Scenario: Transient notification over a persistent notice
- **WHEN** a transient notification is shown while the application-update offer is visible
- **THEN** the transient notification appears directly above the offer, both remain fully visible, and the offer keeps its position when the transient notification disappears

### Requirement: Informational, accessible transient notifications
Transient notifications SHALL carry only short informational text in the interface language, with no controls and no error messages. They SHALL never take focus and SHALL be announced politely to assistive technology, including while a dialog is open. At most one SHALL be visible; a new one SHALL replace the current one, and repeating the same text SHALL be announced again. Each SHALL disappear on its own within a few seconds, without motion when reduced motion is preferred.

#### Scenario: Notification is announced without moving focus
- **WHEN** a transient notification appears while focus is on a control
- **THEN** assistive technology announces its text politely and focus stays on the same control

#### Scenario: Notification disappears by itself
- **WHEN** a transient notification has been shown and the user does nothing
- **THEN** it disappears within a few seconds and leaves no visible trace or focusable element

#### Scenario: New notification replaces the current one
- **WHEN** a second notification is requested while one is visible, including one with identical text
- **THEN** only the second is visible, its display time starts anew, and assistive technology announces it

#### Scenario: User taps beneath a notification
- **WHEN** a transient notification overlays a card or a creation entry and the user taps or clicks that element
- **THEN** the element beneath receives the interaction as if the notification were absent

#### Scenario: User prefers reduced motion
- **WHEN** the operating system requests reduced motion and a notification appears or disappears
- **THEN** it does so without a movement or fade transition

#### Scenario: User works in English
- **WHEN** English is the selected interface language and a notification is shown
- **THEN** its text is in English

### Requirement: Persistent notices with actions
A persistent notice SHALL show short text in the interface language with one or more actions and SHALL remain until the user chooses an action. It SHALL be announced politely when it appears, SHALL not take focus by itself, and its actions SHALL be keyboard-reachable. While a modal dialog is open or the card panel isolates the workspace, it SHALL be unavailable to focus and assistive technology, and available again afterwards.

#### Scenario: Update offer stays while transient notifications come and go
- **WHEN** the application-update offer is visible and a transient notification appears and disappears
- **THEN** the offer remains visible with its «Обновить» and «Позже» actions unchanged

#### Scenario: Keyboard user reaches a notice
- **WHEN** a persistent notice is visible and no dialog is open
- **THEN** the user can move focus to its actions with Tab and activate them

#### Scenario: Dialog opens over a notice
- **WHEN** a modal dialog opens while a persistent notice is visible
- **THEN** Tab inside the dialog never reaches the notice's actions and assistive technology does not expose them until the dialog closes

### Requirement: Supported viewports
The system SHALL support every viewport width of 320 CSS px and wider in the last two major versions of Chrome and Edge on desktop, Chrome on Android and Safari on iOS. At every supported viewport the page SHALL have no horizontal overflow, and the primary controls of the displayed screen SHALL remain visible and operable. The reference sizes 320×568, 390×844, 568×320, 820×1180, 1280×800 and 1440×900 SHALL be the checkpoints for requirements that refer to a supported viewport.

#### Scenario: Screen at a reference size
- **WHEN** the catalogue, a board, a board with an open card panel, a full card page or the settings page is displayed at any reference size in either language
- **THEN** the page has no horizontal overflow, and the application bar brand, heading, settings gear or settings-page return, creation plus and project-actions control when applicable are visible and operable; a card panel that covers the whole screen on a narrow viewport instead keeps its open-full-page and close controls visible and operable

#### Scenario: Short landscape viewport
- **WHEN** a board is displayed at 568×320
- **THEN** the application bar stays visible, the document does not scroll, and every status is reachable by scrolling the board workspace

#### Scenario: Width between reference sizes
- **WHEN** a screen is displayed at a width of 320 px or more that is not a reference size
- **THEN** the page has no horizontal overflow and its primary controls remain operable

### Requirement: Board project actions menu
The board's «⋯» control SHALL open and close one non-modal menu with «Переименовать проект» and «Удалить проект». Opening it SHALL focus its first enabled item; Arrow Up and Arrow Down SHALL move between items, wrapping at the ends. Escape SHALL close it and return focus to «⋯»; outside interaction SHALL close it. Choosing an item SHALL close the menu, move focus to «⋯» and open the item's dialog. Cancelling either dialog and successful renaming SHALL return focus to «⋯».

#### Scenario: User renames the current project
- **WHEN** the user opens «⋯» on a board and chooses «Переименовать проект»
- **THEN** the menu closes, the existing rename dialog opens for the current project, and completing or cancelling it returns focus to «⋯»

#### Scenario: User navigates project actions with the keyboard
- **WHEN** the user opens «⋯» with the keyboard and presses Arrow Down repeatedly
- **THEN** focus starts on «Переименовать проект», moves to «Удалить проект» and wraps to «Переименовать проект»

#### Scenario: User dismisses project actions
- **WHEN** the user presses Escape while focus is within the project-actions menu
- **THEN** the menu closes and focus returns to «⋯»

#### Scenario: User starts deleting the current project
- **WHEN** пользователь выбирает «Удалить проект» в меню «⋯» доски
- **THEN** меню закрывается, открывается подтверждение текущего проекта, а панель приложения недоступна до закрытия диалога

#### Scenario: User opens a creation dialog
- **WHEN** the user opens a create-status dialog with the plus while the project-actions menu is open
- **THEN** the menu is closed, the dialog receives focus, and completing or cancelling returns focus to the plus

#### Scenario: Narrow viewport
- **WHEN** the user opens «⋯» at a 320 px viewport in either language
- **THEN** the whole menu stays within the viewport and the page has no horizontal overflow
