# Spec Delta

## MODIFIED Requirements

### Requirement: User can select and retain an interface language
The system SHALL provide exactly one accessible Russian/English selector inside settings opened from the application-bar gear on every workspace and service screen. It SHALL be available only while settings are open and no modal dialog is open. Settings SHALL identify the choice as application-wide. A selection SHALL take effect without reloading, apply across all projects in the current storage context, and override browser preference on later visits.

#### Scenario: User switches language while editing
- **WHEN** the user closes an unfinished create or rename dialog, opens settings and changes language while viewing a project
- **THEN** application text changes immediately while the same project remains open, and no language selector appears inside the create or rename dialog

#### Scenario: User opens and closes a modal dialog
- **WHEN** the user opens a create, rename, move, or installation-guidance dialog and then closes it
- **THEN** settings remain closed, no language selector appears in the dialog, and the application-bar gear can open the selector again after the dialog closes

#### Scenario: User returns after selecting English
- **WHEN** the user selects English in settings, closes EasyTrack, and opens it again in the same browser or installed-app storage context
- **THEN** English remains selected regardless of the browser's current preferred language

#### Scenario: Project database is unavailable
- **WHEN** the project database cannot open or a stale tab requires a restart
- **THEN** the settings gear remains usable, its panel offers the language selector without project actions, and the current error or restart message follows the selected language

#### Scenario: Language choice cannot be saved
- **WHEN** the user selects a language but browser preference storage rejects the write
- **THEN** the current session changes language and the settings panel explains in that language that the choice may not persist

#### Scenario: Language applies to other projects
- **WHEN** the user selects English in board settings and then opens another project
- **THEN** the other project's interface is also English, and settings describe the choice as the application language

#### Scenario: Settings are closed
- **WHEN** the settings panel is closed
- **THEN** there is no visible or keyboard-accessible standalone language selector in the application bar or page content
