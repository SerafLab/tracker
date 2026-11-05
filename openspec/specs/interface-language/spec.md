# interface-language Specification

## Purpose

Lets people use EasyTrack in Russian or English while keeping their own project data and local workflow intact.

## Requirements

### Requirement: Initial interface language follows the browser
The system SHALL use Russian when the browser's primary preferred language is Russian and English otherwise, until the user explicitly selects a language.

#### Scenario: First visit with Russian browser preference
- **WHEN** the user opens EasyTrack with no saved language choice and the browser's primary preferred language is `ru` or a Russian regional variant
- **THEN** the interface is presented in Russian

#### Scenario: First visit with another browser preference
- **WHEN** the user opens EasyTrack with no saved language choice and the browser's primary preferred language is English or another language
- **THEN** the interface is presented in English

#### Scenario: Browser preference changes before manual selection
- **WHEN** the browser's primary preferred language changes and the user reopens EasyTrack without having selected a language
- **THEN** the interface follows the new browser preference according to the Russian/English fallback rule

### Requirement: User can select and retain an interface language
The system SHALL provide exactly one accessible Russian/English language group inside the settings menu opened from the application-bar gear on every workspace and service screen. The group SHALL offer «Русский» and «English» as separate menu items, each named in its own language, with the current language marked as selected. It SHALL be available only while the settings menu is open and no modal dialog is open. The group's caption SHALL identify the choice as application-wide. A selection SHALL take effect without reloading, apply across all projects in the current storage context, and override browser preference on later visits.

#### Scenario: User switches language from the settings menu
- **WHEN** Russian is active and the user opens settings and chooses «English»
- **THEN** application text changes to English immediately, the settings menu stays open, its caption reads «Application language», and «English» is now marked as selected while «Русский» is not

#### Scenario: User chooses the current language
- **WHEN** the user opens settings and chooses the language that is already marked as selected
- **THEN** the interface language does not change and the settings menu stays open

#### Scenario: User switches language while editing
- **WHEN** the user closes an unfinished create or rename dialog, opens settings and changes language while viewing a project
- **THEN** application text changes immediately while the same project remains open, and no language choice appears inside the create or rename dialog

#### Scenario: User opens and closes a modal dialog
- **WHEN** the user opens a create, rename, move, or installation-guidance dialog and then closes it
- **THEN** settings remain closed, no language choice appears in the dialog, and the application-bar gear can open the language group again after the dialog closes

#### Scenario: User returns after selecting English
- **WHEN** the user selects English in settings, closes EasyTrack, and opens it again in the same browser or installed-app storage context
- **THEN** English remains selected regardless of the browser's current preferred language

#### Scenario: Project database is unavailable
- **WHEN** the project database cannot open or a stale tab requires a restart
- **THEN** the settings gear remains usable, its menu offers the language group without project actions, and the current error or restart message follows the selected language

#### Scenario: Language choice cannot be saved
- **WHEN** the user selects a language but browser preference storage rejects the write
- **THEN** the current session changes language, the settings menu stays open, and it explains in that language that the choice may not persist

#### Scenario: Language applies to other projects
- **WHEN** the user selects English in board settings and then opens another project
- **THEN** the other project's interface is also English, and settings describe the choice as the application language

#### Scenario: Settings are closed
- **WHEN** the settings menu is closed
- **THEN** there is no visible or keyboard-accessible standalone language choice in the application bar or page content

### Requirement: Application-owned content follows the selected language
The system SHALL present all application-owned visible text and accessible labels in the selected language, including catalogue and board controls, forms, validation, loading and error states, installation guidance, update and restart notices. The `EasyTrack` product name SHALL remain unchanged.

#### Scenario: English interface with existing Russian project data
- **WHEN** the user switches to English while viewing a project, status, or card named in Russian
- **THEN** controls and messages are in English while the saved names remain exactly as entered

#### Scenario: English installation and update guidance
- **WHEN** English is selected and the user opens installation guidance or sees an update notice
- **THEN** the guidance, actions, and their accessible names are in English

### Requirement: Page and installation metadata follow the interface language
The system SHALL set the document language, title, description, and installable-app description to the active interface language while retaining the `EasyTrack` name and existing installation identity.

#### Scenario: User switches language before installing
- **WHEN** the user selects English before installing EasyTrack
- **THEN** the document declares English and the page and installable-app descriptions are in English

#### Scenario: Saved language loads offline
- **WHEN** a user who selected Russian reopens a previously cached EasyTrack offline in the same storage context
- **THEN** the interface, document metadata, and available installable-app description are in Russian without requiring a network request

### Requirement: Localized initial status sets
Система SHALL показывать названия наборов, подписи выбора и предварительный список статусов на текущем языке интерфейса. При создании проекта система SHALL сохранять названия статусов на языке интерфейса в момент отправки формы. Английские наборы SHALL иметь следующий состав и порядок.

#### Scenario: English status-set catalogue
- **WHEN** пользователь открывает создание проекта на английском языке
- **THEN** поле «Status set» предлагает «Simple», «Search and selection», «Applications and documents», «Development», «Job search» и «No statuses»; выбран «Simple»

#### Scenario: English simple set
- **WHEN** пользователь создаёт проект с набором «Simple»
- **THEN** статусы: «To do», «In progress», «Done»

#### Scenario: English search and selection set
- **WHEN** пользователь создаёт проект с набором «Search and selection»
- **THEN** статусы: «Found», «Under consideration», «Shortlisted», «Not suitable»

#### Scenario: English applications and documents set
- **WHEN** пользователь создаёт проект с набором «Applications and documents»
- **THEN** статусы: «To prepare», «Submitted», «Awaiting response», «Completed»

#### Scenario: English development set
- **WHEN** пользователь создаёт проект с набором «Development»
- **THEN** статусы: «Planned», «On hold», «In development», «In review», «Done»

#### Scenario: English job search set
- **WHEN** пользователь создаёт проект с набором «Job search»
- **THEN** статусы: «Interested», «Applied», «Interviews», «Offer», «Rejected»

### Requirement: Saved preset names become project data
После создания проекта система SHALL считать названия его статусов сохранёнными данными пользователя: смена языка интерфейса SHALL не переводить, не заменять и не восстанавливать их, включая изменённые пользователем названия. Новый проект SHALL использовать язык интерфейса на момент своего создания. Набор, применённый позже к существующему проекту без статусов, SHALL использовать язык интерфейса, действующий в момент применения.

#### Scenario: Interface language changes after creation
- **WHEN** пользователь создаёт проект на русском языке, переименовывает один из статусов и переключает интерфейс на английский
- **THEN** все сохранённые названия, включая переименованное, остаются прежними после переключения и перезагрузки

#### Scenario: Another project uses the newly selected language
- **WHEN** после переключения на английский пользователь создаёт ещё один проект с тем же набором
- **THEN** новый проект содержит английские статусы, а прежний проект не меняется

#### Scenario: Existing empty project receives a set after language change
- **WHEN** пользователь создал проект без статусов на русском языке, переключил интерфейс на английский и применил к этому проекту набор
- **THEN** новые статусы получают английские названия, которые затем сохраняются как данные проекта при дальнейшей смене языка
