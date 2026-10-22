# Spec Delta

## MODIFIED Requirements

### Requirement: User can select and retain an interface language
The system SHALL provide exactly one accessible Russian/English selector in the application bar on every workspace and service screen. The selector SHALL be unavailable while a modal dialog is open and SHALL be available again when the dialog closes. A selection SHALL take effect without reloading, apply across all projects in the current storage context, and override browser preference on later visits.

#### Scenario: User switches language while editing
- **WHEN** the user closes an unfinished create or rename dialog and changes language in the application bar while viewing a project
- **THEN** application text changes immediately while the same project remains open, and no language selector appears inside the dialog

#### Scenario: User opens and closes a modal dialog
- **WHEN** the user opens a create, rename, move, or installation-guidance dialog and then closes it
- **THEN** no language selector appears in the dialog, the application bar remains its sole location, and the selector is usable again after the dialog closes

#### Scenario: User returns after selecting English
- **WHEN** the user selects English, closes EasyTrack, and opens it again in the same browser or installed-app storage context
- **THEN** English remains selected regardless of the browser's current preferred language

#### Scenario: Project database is unavailable
- **WHEN** the project database cannot open or a stale tab requires a restart
- **THEN** the language selector remains usable and the current error or restart message follows the selected language

#### Scenario: Language choice cannot be saved
- **WHEN** the user selects a language but browser preference storage rejects the write
- **THEN** the current session changes language and the interface explains in that language that the choice may not persist
