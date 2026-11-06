# Spec Delta

## MODIFIED Requirements

### Requirement: EasyTrack is installable and identifiable
The system SHALL expose installable web-app metadata for the `/tracker/` application, identifying it as `EasyTrack`, using local icons, and requesting standalone display. It SHALL provide a persistent, accessible installation entry in the «Приложение» section of the settings page in every application state, and SHALL NOT show a floating installation control over application content.

#### Scenario: Visitor opens installation guidance
- **WHEN** a visitor activates the settings installation entry while the browser has not offered a native installation prompt
- **THEN** the system explains how to install on the current platform without requiring an installation prompt to be available, and closing the guidance returns focus to the entry

#### Scenario: Browser offers native installation
- **WHEN** the browser has offered a native installation prompt and the visitor activates the settings installation entry labelled «Установить EasyTrack»
- **THEN** the browser's installation prompt opens, and the entry returns to «Как установить EasyTrack» after the prompt is used

#### Scenario: Installed EasyTrack shows local-data guidance
- **WHEN** EasyTrack runs as an installed application and the user activates the settings installation entry
- **THEN** the guidance dialog opens and explains how locally stored projects behave

#### Scenario: Compatible browser can install EasyTrack
- **WHEN** a visitor opens the production app in a browser that supports installable web apps
- **THEN** the browser receives the manifest and local icons required to offer EasyTrack as an installed application

#### Scenario: Board content is not covered
- **WHEN** a board, card panel or catalogue is displayed at any supported viewport
- **THEN** no installation control overlays content or occupies space in the workspace
