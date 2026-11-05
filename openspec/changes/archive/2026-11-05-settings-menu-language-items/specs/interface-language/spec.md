# Spec Delta

## MODIFIED Requirements

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
