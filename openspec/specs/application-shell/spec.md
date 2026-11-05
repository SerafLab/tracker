# application-shell Specification

## Purpose

Обеспечивает единый видимый контекст, навигацию и основные действия на всех экранах EasyTrack, включая служебные состояния приложения.

## Requirements

### Requirement: Shared application bar across states
The system SHALL show one application bar containing the EasyTrack brand, the current screen or state heading, and a settings gear on the catalogue, board, full card page, loading, storage-unavailable, and restart-required screens. Except on the full card page, the heading SHALL be the page's primary heading; on the full card page the bar SHALL show the card's project and status as plain-text context, and the card name in the content SHALL be the primary heading. With a card panel open, the application bar SHALL retain the board context. The settings menu opened from the bar SHALL contain the sole accessible language choice.

#### Scenario: User navigates from catalogue to board
- **WHEN** the user opens a project from the catalogue
- **THEN** the application bar changes its heading from the catalogue title to the project name without showing a second page heading in the content

#### Scenario: Application enters a service state
- **WHEN** the application is loading, its storage is unavailable, or it requires a restart
- **THEN** the application bar identifies that state and still provides a settings gear that opens the language choice

#### Scenario: User opens a dialog
- **WHEN** the user opens a create, rename, move, or installation-guidance dialog
- **THEN** the settings menu is closed, its language choice is unavailable, the application bar is unavailable, and the modal dialog contains no language choice

#### Scenario: User opens a card page
- **WHEN** пользователь открывает страницу карточки
- **THEN** общий AppBar показывает «Проект › Статус» простым текстом без ссылок и настройки с единственным выбором языка, а единственным основным заголовком страницы является сохранённое название карточки в блоке «Основное»; редактирование черновика не меняет заголовок до сохранения

#### Scenario: User opens a card panel
- **WHEN** пользователь открывает карточку с доски
- **THEN** общий AppBar сохраняет заголовок и действия доски, а панель имеет доступное название области и заголовок блока «Основное» с сохранённым названием карточки

### Requirement: Contextual navigation and primary action
The application bar SHALL show an icon-only plus for project creation in the catalogue and status creation on a board. On a board, the EasyTrack brand SHALL return to the catalogue, replacing the separate catalogue-return control. The settings gear SHALL expose project renaming and project deletion on a board. The full card page SHALL provide an explicit return to its project board, brand navigation to the catalogue, and language settings, without creation, project-renaming or project-deletion actions. The card panel SHALL provide close and full-page actions while retaining board navigation. Leaving either card presentation SHALL respect unsaved-draft protection. Service states SHALL omit creation, project-renaming and project-deletion actions. On every screen the settings menu SHALL contain the installation entry.

#### Scenario: User works in the catalogue
- **WHEN** the catalogue is displayed, whether empty or populated
- **THEN** its application bar offers one plus with the localized accessible name «Создать проект» and a settings gear containing only the installation entry and application-language settings

#### Scenario: User works on a board
- **WHEN** a project board is displayed, whether or not it has statuses
- **THEN** its application bar identifies the project and provides a plus with the localized accessible name «Добавить статус» and a settings gear containing «Переименовать проект», «Удалить проект», the installation entry and application-language settings, without a separate project-actions control

#### Scenario: User returns through the brand
- **WHEN** the user activates the EasyTrack brand from a board using a pointer or keyboard
- **THEN** the catalogue opens using normal application navigation, no project data changes, and there is no separate «Все проекты» control in the bar

#### Scenario: User encounters a service state
- **WHEN** the application is loading, its storage is unavailable, or a restart is required
- **THEN** the application bar has no creation, project-renaming or project-deletion action, its settings menu provides the installation entry and language selection, and the state message retains its relevant guidance or recovery action

#### Scenario: User navigates from a card page
- **WHEN** пользователь открывает страницу карточки
- **THEN** доступен возврат к её доске, бренд ведёт в каталог через защиту черновиков, настройки содержат пункт установки и выбор языка, а создание статуса, переименование и удаление проекта отсутствуют

#### Scenario: User navigates from a card panel
- **WHEN** пользователь открывает панель карточки на доске
- **THEN** доступны закрытие панели и «Открыть на всю страницу», а действия доски и бренд проходят через защиту черновиков при уходе с карточки

### Requirement: Responsive application bar presentation
The application bar SHALL be a visually distinct, full-width light surface with a bottom boundary and content aligned with the main content width. In the catalogue, on the full card page and in service states it SHALL scroll with the document. On a project board, with or without an open card panel, the board workspace SHALL be bounded by the available viewport height below the application bar, using the dynamic viewport height on mobile browsers; the application bar SHALL remain at the top while the whole board scrolls inside the workspace vertically and horizontally, and the page itself SHALL not scroll. At a 320 px viewport, the brand, heading, settings gear and creation plus when applicable SHALL remain visible and operable without horizontal page overflow or hiding the plus in a menu.

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
- **WHEN** the user scrolls a board's content vertically or horizontally, with or without an open card panel, at 320, 390, 1280 or 1440 px
- **THEN** every status scrolls together inside the viewport-bounded workspace, the application bar stays at the top of the viewport in full on every width, and the document itself does not scroll

### Requirement: Calm application bar hierarchy
The system SHALL retain a warm light application bar with a restrained green creation plus and a visually secondary settings gear. Every application-bar heading or card-page context SHALL occupy one line; text that exceeds the available width SHALL end with an ellipsis without changing the bar height, hiding controls, or causing page-level horizontal overflow. On the card page the project and status SHALL truncate independently. The complete text SHALL remain available to assistive technology and, when truncated, in a hint on pointer hover or keyboard focus. The same visual tokens SHALL apply to service screens.

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

#### Scenario: Card page has a long project and status
- **WHEN** на странице карточки названия проекта и статуса не помещаются в шапке на ширине 320 или 1280 px
- **THEN** контекст занимает одну строку, проект и статус обрезаются многоточием каждый в своей части с видимым разделителем, высота шапки не меняется, а наведение или фокус на обрезанной части показывает её полный текст

### Requirement: Accessible compact application bar controls
The system SHALL give the creation plus and settings gear localized accessible names and purpose tooltips available on hover and keyboard focus. The board's brand navigation SHALL retain EasyTrack in its accessible name and explain its catalogue destination. Interactive bar controls SHALL have targets of at least 44 by 44 CSS pixels and visible keyboard focus.

#### Scenario: User discovers compact controls
- **WHEN** a user hovers or focuses the board's brand, plus or gear
- **THEN** localized hints explain «Все проекты», «Добавить статус» or «Настройки» respectively, and assistive technology can identify each control's purpose

#### Scenario: User discovers project creation
- **WHEN** a user hovers or focuses the catalogue's plus
- **THEN** its localized hint and accessible name explain «Создать проект»

### Requirement: Settings menu interaction
The settings gear SHALL open and close one non-modal settings menu. Opening it SHALL move focus to its first available item. Arrow Up and Arrow Down SHALL move focus between available items, wrapping at the ends and skipping the separator and caption. The menu SHALL close on Escape or outside interaction and restore focus to the gear on Escape. Starting project renaming, project deletion or installation SHALL close the menu before opening its dialog or the browser installation prompt. Choosing a language SHALL keep the menu open. Cancelling a renaming or deletion dialog and closing the installation dialog SHALL return focus to the gear; successful renaming SHALL also return focus to the gear, while successful deletion SHALL follow project-deletion navigation and focus rules.

#### Scenario: User renames the current project
- **WHEN** the user opens board settings and chooses «Переименовать проект»
- **THEN** settings close, the existing rename dialog opens for the current project, and completing or cancelling it returns focus to the gear

#### Scenario: User opens installation guidance from settings
- **WHEN** the user opens settings and chooses «Как установить EasyTrack»
- **THEN** settings close, the installation dialog opens, and closing it returns focus to the gear

#### Scenario: User navigates settings with the keyboard
- **WHEN** the user opens board settings with the keyboard and presses Arrow Down repeatedly
- **THEN** focus starts on «Переименовать проект» and moves through «Удалить проект», the installation entry, «Русский» and «English», then wraps to «Переименовать проект» without stopping on the separator or caption

#### Scenario: User switches language with the keyboard
- **WHEN** the user focuses «English» in the settings menu and activates it with Enter or Space
- **THEN** the interface switches to English, the menu stays open, and focus remains on «English»

#### Scenario: User dismisses settings with the keyboard
- **WHEN** the user presses Escape while focus is within the settings menu
- **THEN** the menu closes and focus returns to the gear

#### Scenario: User opens a creation dialog
- **WHEN** the user opens a create-project or create-status dialog with the plus
- **THEN** settings are closed, the dialog receives focus, and completing or cancelling returns focus to the plus

#### Scenario: User starts deleting the current project
- **WHEN** пользователь выбирает «Удалить проект» в настройках доски
- **THEN** меню закрывается, открывается подтверждение текущего проекта, панель приложения и её выбор языка недоступны до закрытия диалога

#### Scenario: User cancels deleting the current project
- **WHEN** пользователь отменяет удаление проекта в диалоге
- **THEN** доска сохраняется, фокус возвращается к шестерёнке, меню настроек остаётся закрытым

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

### Requirement: Settings menu layout
The settings menu SHALL list its actions first and the language group last, with every item label aligned to the start edge. A horizontal separator SHALL divide the actions from the language group only when at least one action precedes the group. Directly above the language items the menu SHALL show a non-interactive caption «Язык приложения» / «Application language», which also names the group for assistive technology.

#### Scenario: Board settings layout
- **WHEN** the user opens settings on a project board in Russian
- **THEN** the menu shows «Переименовать проект», «Удалить проект» and «Как установить EasyTrack», then a separator, the caption «Язык приложения», and the items «Русский» and «English», with all labels aligned to the same start edge

#### Scenario: Settings without preceding actions
- **WHEN** settings open in a state that offers no action before the language group
- **THEN** the menu shows the caption and the two language items without a separator above them

#### Scenario: Narrow viewport
- **WHEN** the user opens settings at a 320 px viewport in either language
- **THEN** the whole menu stays within the viewport, labels remain start-aligned, and the page has no horizontal overflow
