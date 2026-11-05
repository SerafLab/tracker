# Spec Delta

## MODIFIED Requirements

### Requirement: Shared application bar across states
The system SHALL show one application bar containing the EasyTrack brand, the current screen or state heading, and a settings gear on the catalogue, board, full card page, loading, storage-unavailable, and restart-required screens. Except on the full card page, the heading SHALL be the page's primary heading; on the full card page the bar SHALL show the card's project and status as plain-text context, and the card name in the content SHALL be the primary heading. With a card panel open, the application bar SHALL retain the board context. The settings panel opened from the bar SHALL contain the sole accessible language selector.

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
- **THEN** общий AppBar показывает «Проект › Статус» простым текстом без ссылок и настройки с единственным выбором языка, а единственным основным заголовком страницы является сохранённое название карточки в блоке «Основное»; редактирование черновика не меняет заголовок до сохранения

#### Scenario: User opens a card panel
- **WHEN** пользователь открывает карточку с доски
- **THEN** общий AppBar сохраняет заголовок и действия доски, а панель имеет доступное название области и заголовок блока «Основное» с сохранённым названием карточки

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
