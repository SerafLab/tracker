# Spec Delta

## MODIFIED Requirements

### Requirement: Contextual navigation and primary action
The application bar SHALL show an icon-only plus for project creation in the catalogue and status creation on a board. On a board, the EasyTrack brand SHALL return to the catalogue, replacing the separate catalogue-return control. The settings gear SHALL expose project renaming and project deletion on a board. The full card page SHALL provide an explicit return to its project board, brand navigation to the catalogue, and language settings, without creation, project-renaming or project-deletion actions. The card panel SHALL provide close and full-page actions while retaining board navigation. Leaving either card presentation SHALL respect unsaved-draft protection. Service states SHALL omit creation, project-renaming and project-deletion actions. On every screen the settings menu SHALL contain the installation entry. On the catalogue, a board and the full card page the settings menu SHALL also contain «Выгрузить резервную копию» and «Восстановить из резервной копии» directly before the installation entry; service states SHALL omit both.

#### Scenario: User works in the catalogue
- **WHEN** the catalogue is displayed, whether empty or populated
- **THEN** its application bar offers one plus with the localized accessible name «Создать проект» and a settings gear containing only «Выгрузить резервную копию», «Восстановить из резервной копии», the installation entry, application-language settings and color theme settings

#### Scenario: User works on a board
- **WHEN** a project board is displayed, whether or not it has statuses
- **THEN** its application bar identifies the project and provides a plus with the localized accessible name «Добавить статус» and a settings gear containing «Переименовать проект», «Удалить проект», «Выгрузить резервную копию», «Восстановить из резервной копии», the installation entry and application-language settings, without a separate project-actions control

#### Scenario: User returns through the brand
- **WHEN** the user activates the EasyTrack brand from a board using a pointer or keyboard
- **THEN** the catalogue opens using normal application navigation, no project data changes, and there is no separate «Все проекты» control in the bar

#### Scenario: User encounters a service state
- **WHEN** the application is loading, its storage is unavailable, or a restart is required
- **THEN** the application bar has no creation, project-renaming or project-deletion action, its settings menu provides the installation entry, language selection and color theme selection without backup export or restore, and the state message retains its relevant guidance or recovery action

#### Scenario: User navigates from a card page
- **WHEN** пользователь открывает страницу карточки
- **THEN** доступен возврат к её доске, бренд ведёт в каталог через защиту черновиков, настройки содержат «Выгрузить резервную копию», «Восстановить из резервной копии», пункт установки и выбор языка, а создание статуса, переименование и удаление проекта отсутствуют

#### Scenario: User navigates from a card panel
- **WHEN** пользователь открывает панель карточки на доске
- **THEN** доступны закрытие панели и «Открыть на всю страницу», а действия доски и бренд проходят через защиту черновиков при уходе с карточки

### Requirement: Settings menu interaction
The settings gear SHALL open and close one non-modal settings menu. Opening it SHALL move focus to its first available item. Arrow Up and Arrow Down SHALL move focus between available items, wrapping at the ends and skipping the separator and caption. The menu SHALL close on Escape or outside interaction and restore focus to the gear on Escape. Starting project renaming, project deletion, backup export, backup restore or installation SHALL close the menu and move focus to the gear before opening its dialog, file chooser, share sheet or the browser installation prompt. Choosing a language or color theme SHALL keep the menu open. Cancelling a renaming or deletion dialog and closing the installation dialog SHALL return focus to the gear; successful renaming SHALL also return focus to the gear, while successful deletion SHALL follow project-deletion navigation and focus rules.

#### Scenario: User renames the current project
- **WHEN** the user opens board settings and chooses «Переименовать проект»
- **THEN** settings close, the existing rename dialog opens for the current project, and completing or cancelling it returns focus to the gear

#### Scenario: User opens installation guidance from settings
- **WHEN** the user opens settings and chooses «Как установить EasyTrack»
- **THEN** settings close, the installation dialog opens, and closing it returns focus to the gear

#### Scenario: User navigates settings with the keyboard
- **WHEN** the user opens board settings with the keyboard and presses Arrow Down repeatedly
- **THEN** focus starts on «Переименовать проект» and moves through «Удалить проект», «Выгрузить резервную копию», «Восстановить из резервной копии», the installation entry, «Русский» and «English», then wraps to «Переименовать проект» without stopping on the separator or caption

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

#### Scenario: User starts a backup action from settings
- **WHEN** пользователь открывает настройки и выбирает «Выгрузить резервную копию» или «Восстановить из резервной копии»
- **THEN** меню закрывается до начала выгрузки или выбора файла, а после завершения или отмены действия фокус находится на шестерёнке

### Requirement: Settings menu layout
The settings menu SHALL list its actions first, then the language group, then the color theme group last, with every item label aligned to the start edge. A horizontal separator SHALL divide the actions from the language group only when at least one action precedes the group, and another separator SHALL divide the language group from the color theme group. Directly above the language items the menu SHALL show a non-interactive caption «Язык приложения» / «Application language», and directly above the theme items «Цветовая тема приложения» / «Application color theme»; each caption also names its group for assistive technology.

#### Scenario: Board settings layout
- **WHEN** the user opens settings on a project board in Russian
- **THEN** the menu shows «Переименовать проект», «Удалить проект», «Выгрузить резервную копию», «Восстановить из резервной копии» and «Как установить EasyTrack», then a separator, the caption «Язык приложения», the items «Русский» and «English», a separator, the caption «Цветовая тема приложения» and the items «Зелёная» and «Чернильная», with all labels aligned to the same start edge

#### Scenario: Settings without preceding actions
- **WHEN** settings open in a state that offers no action before the language group
- **THEN** the menu shows the language caption and its two items without a separator above them, followed by a separator and the color theme group

#### Scenario: Narrow viewport
- **WHEN** the user opens settings at a 320 px viewport in either language
- **THEN** the whole menu stays within the viewport, labels remain start-aligned, and the page has no horizontal overflow
