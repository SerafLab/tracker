# offline-installed-app Specification

## Purpose

Делает EasyTrack устанавливаемым local-first приложением, которое безопасно
повторно открывается без сети и честно сообщает границы локального хранения.

## Requirements

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

### Requirement: EasyTrack works offline after initial online launch
The system SHALL cache only its own production app shell and local assets. After a successful online launch in one storage context, it SHALL reopen without a network connection and allow the user to read and change locally stored projects.

#### Scenario: Installed EasyTrack reopens offline
- **WHEN** a user opens EasyTrack online, creates or changes a project, closes it, disables the network, and opens EasyTrack again in the same storage context
- **THEN** the application shell loads, the stored project is available, and a new local change persists through another offline reopen

#### Scenario: External content is unavailable offline
- **WHEN** a user opens an external link from EasyTrack without a network connection
- **THEN** EasyTrack does not claim to provide or cache that external content

### Requirement: Updates require confirmation
The system SHALL download a ready EasyTrack update without interrupting the current session, show an accessible update action, and activate the update with a reload only after explicit user confirmation.

#### Scenario: User defers an available update
- **WHEN** a new EasyTrack version is ready while the current version is open and the user declines or dismisses the update action
- **THEN** the current version remains usable without an automatic reload

#### Scenario: User accepts an available update
- **WHEN** a new EasyTrack version is ready and the user activates the update action
- **THEN** the update becomes active and EasyTrack reloads into the new version

### Requirement: Stale database clients stop editing
The system SHALL stop mutations from a tab whose IndexedDB connection becomes stale because another EasyTrack version has changed the database, close that connection, and provide an explicit restart action.

#### Scenario: Database changes while an older tab remains open
- **WHEN** an open EasyTrack tab receives an IndexedDB version-change notification
- **THEN** it no longer offers editing actions and explains that the user must restart the application

### Requirement: Local-storage limits are communicated
The system SHALL make a non-blocking persistent-storage request after meaningful user interaction where supported. It SHALL explain in its installation guidance that projects are local to the browser or installed-app storage context, do not synchronize, and can be lost when site data is cleared.

#### Scenario: Persistent storage is unavailable or denied
- **WHEN** the browser does not support persistent storage or declines the request
- **THEN** EasyTrack remains usable and does not present the failure as a data-loss error

#### Scenario: User installs from Safari on iPhone or iPad
- **WHEN** a user views EasyTrack's installation guidance on iOS or iPadOS
- **THEN** it explains that the installed app has separate local storage from Safari and that existing Safari projects are not transferred automatically

### Requirement: First-visit installation invitation
The system SHALL open a modal installation invitation when the catalogue, a board or a card is ready, no other modal dialog is open, EasyTrack does not run as an installed application, and the invitation has not been dismissed permanently in the current storage context. The invitation SHALL explain installation for the current platform and the local storage of projects, and SHALL open at most once per application launch.

#### Scenario: First visit in a browser
- **WHEN** a visitor opens EasyTrack in a browser for the first time and the catalogue is displayed
- **THEN** a modal invitation explains that EasyTrack can be installed, how to install it on this platform, and that projects are stored locally

#### Scenario: First visit on iPhone or iPad
- **WHEN** a visitor opens EasyTrack in Safari on iOS or iPadOS, including an iPad reporting a desktop browser
- **THEN** the invitation gives the «Поделиться» → «На экран “Домой”» instruction and states that projects created in Safari are not transferred to the installed application, so installing before creating projects is recommended

#### Scenario: Native prompt arrives while the invitation is open
- **WHEN** the browser offers a native installation prompt while the invitation is displayed
- **THEN** the invitation gains an «Установить EasyTrack» action that opens the browser prompt

#### Scenario: Application is running as installed
- **WHEN** EasyTrack is launched as an installed application
- **THEN** no installation invitation opens

#### Scenario: Service state is displayed
- **WHEN** the application is loading, its storage is unavailable, or a restart is required
- **THEN** no installation invitation opens over that state

#### Scenario: User navigates within one launch
- **WHEN** the user closes the invitation without dismissing it permanently and navigates between catalogue, boards and cards
- **THEN** the invitation does not reopen until EasyTrack is launched again

### Requirement: Installation invitation can be dismissed permanently
The invitation SHALL provide an unchecked «Больше не показывать» checkbox. Closing the invitation with the checkbox selected, or a successful installation, SHALL stop future invitations in the current storage context. Closing it without the checkbox SHALL let the invitation open again on the next launch. Failure to save the choice SHALL NOT be presented as an error.

#### Scenario: User closes without dismissing
- **WHEN** the user closes the invitation with «Больше не показывать» unchecked and later launches EasyTrack again
- **THEN** the invitation opens again

#### Scenario: User dismisses permanently
- **WHEN** the user selects «Больше не показывать», closes the invitation, and later launches EasyTrack again in the same storage context
- **THEN** the invitation does not open, while the settings installation entry remains available

#### Scenario: User installs from the browser prompt
- **WHEN** the user accepts the browser's installation prompt from the invitation or settings
- **THEN** later launches in that browser storage context do not open the invitation

#### Scenario: Choice cannot be saved
- **WHEN** browser preference storage rejects saving the permanent dismissal
- **THEN** the invitation closes without an error message and may open again on the next launch
