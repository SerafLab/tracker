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
