# offline-installed-app Specification

## Purpose

Делает EasyTrack устанавливаемым local-first приложением, которое безопасно
повторно открывается без сети и честно сообщает границы локального хранения.

## Requirements

### Requirement: EasyTrack is installable and identifiable
The system SHALL expose installable web-app metadata for the `/tracker/` application, identifying it as `EasyTrack`, using local icons, and requesting standalone display. It SHALL provide a persistent, accessible way to open installation guidance.

#### Scenario: Visitor opens installation guidance
- **WHEN** a visitor activates the persistent EasyTrack installation control
- **THEN** the system explains how to install on the current platform without requiring an installation prompt to be available

#### Scenario: Compatible browser can install EasyTrack
- **WHEN** a visitor opens the production app in a browser that supports installable web apps
- **THEN** the browser receives the manifest and local icons required to offer EasyTrack as an installed application

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
