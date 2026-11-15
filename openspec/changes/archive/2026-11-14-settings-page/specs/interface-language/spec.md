# Spec Delta

## MODIFIED Requirements

### Requirement: User can select and retain an interface language
The system SHALL provide exactly one accessible Russian/English language group, in the «Внешний вид» section of the settings page, including when that page is opened from a service state. The group SHALL offer «Русский» and «English» as separate options, each named in its own language, with the current language marked as selected. The group's caption SHALL identify the choice as application-wide. A selection SHALL take effect without reloading, apply across all projects in the current storage context, and override browser preference on later visits.

#### Scenario: User switches language from the settings menu
- **WHEN** Russian is active and the user opens settings and chooses «English»
- **THEN** application text changes to English immediately, the settings page stays open, its group caption reads «Application language», and «English» is now marked as selected while «Русский» is not

#### Scenario: User chooses the current language
- **WHEN** the user opens settings and chooses the language that is already marked as selected
- **THEN** the interface language does not change and the settings page stays open

#### Scenario: User switches language while editing
- **WHEN** the user closes an unfinished create or rename dialog, opens settings from a project board, changes language and returns with «Назад»
- **THEN** application text is in the new language, the same project board is shown, and no language choice appears inside the create or rename dialog

#### Scenario: User opens and closes a modal dialog
- **WHEN** the user opens a create, rename, move, or installation-guidance dialog and then closes it
- **THEN** no language choice appears in the dialog, and the application-bar gear can open the settings page again after the dialog closes

#### Scenario: User returns after selecting English
- **WHEN** the user selects English in settings, closes EasyTrack, and opens it again in the same browser or installed-app storage context
- **THEN** English remains selected regardless of the browser's current preferred language

#### Scenario: Project database is unavailable
- **WHEN** the project database cannot open or a stale tab requires a restart
- **THEN** the settings gear remains usable, the settings page offers the language group without the data section, and the current error or restart message follows the selected language

#### Scenario: Language choice cannot be saved
- **WHEN** the user selects a language but browser preference storage rejects the write
- **THEN** the current session changes language, the settings page stays open, and it explains next to the language group in that language that the choice may not persist

#### Scenario: Language applies to other projects
- **WHEN** the user selects English in settings opened from one board and then opens another project
- **THEN** the other project's interface is also English, and settings describe the choice as the application language

#### Scenario: Settings are closed
- **WHEN** the settings page is not open and the catalogue, a board, a card or a service screen is displayed
- **THEN** there is no visible or keyboard-accessible language choice in the application bar or page content
