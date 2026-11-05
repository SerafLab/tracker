# Spec Delta

## ADDED Requirements

### Requirement: Shared notification area
The system SHALL show notifications in one application-wide area at the bottom centre of the viewport, clear of the device safe area. Notifications SHALL overlay the content without shifting the layout. The area SHALL serve every screen, and callers SHALL not choose a different position per notification. Transient notifications SHALL appear above persistent notices without overlapping them.

#### Scenario: Notification appears on a board
- **WHEN** a notification is shown while a board is displayed at 320, 390, 1280 or 1440 px
- **THEN** it appears at the bottom centre of the viewport, the status columns and application bar keep their position and size, and the page gains no horizontal overflow

#### Scenario: Installed app on a device with a home indicator
- **WHEN** the installed app shows a notification on a device with a bottom safe-area inset
- **THEN** the notification is placed above the inset and remains fully visible

#### Scenario: Transient notification over a persistent notice
- **WHEN** a transient notification is shown while the application-update offer is visible
- **THEN** the transient notification appears directly above the offer, both remain fully visible, and the offer keeps its position when the transient notification disappears

### Requirement: Informational, accessible transient notifications
Transient notifications SHALL carry only short informational text in the interface language, with no controls and no error messages. They SHALL never take focus and SHALL be announced politely to assistive technology, including while a dialog is open. At most one SHALL be visible; a new one SHALL replace the current one, and repeating the same text SHALL be announced again. Each SHALL disappear on its own within a few seconds, without motion when reduced motion is preferred.

#### Scenario: Notification is announced without moving focus
- **WHEN** a transient notification appears while focus is on a control
- **THEN** assistive technology announces its text politely and focus stays on the same control

#### Scenario: Notification disappears by itself
- **WHEN** a transient notification has been shown and the user does nothing
- **THEN** it disappears within a few seconds and leaves no visible trace or focusable element

#### Scenario: New notification replaces the current one
- **WHEN** a second notification is requested while one is visible, including one with identical text
- **THEN** only the second is visible, its display time starts anew, and assistive technology announces it

#### Scenario: User taps beneath a notification
- **WHEN** a transient notification overlays a card or a creation entry and the user taps or clicks that element
- **THEN** the element beneath receives the interaction as if the notification were absent

#### Scenario: User prefers reduced motion
- **WHEN** the operating system requests reduced motion and a notification appears or disappears
- **THEN** it does so without a movement or fade transition

#### Scenario: User works in English
- **WHEN** English is the selected interface language and a notification is shown
- **THEN** its text is in English

### Requirement: Persistent notices with actions
A persistent notice SHALL show short text in the interface language with one or more actions and SHALL remain until the user chooses an action. It SHALL be announced politely when it appears, SHALL not take focus by itself, and its actions SHALL be keyboard-reachable. While a modal dialog is open or the card panel isolates the workspace, it SHALL be unavailable to focus and assistive technology, and available again afterwards.

#### Scenario: Update offer stays while transient notifications come and go
- **WHEN** the application-update offer is visible and a transient notification appears and disappears
- **THEN** the offer remains visible with its «Обновить» and «Позже» actions unchanged

#### Scenario: Keyboard user reaches a notice
- **WHEN** a persistent notice is visible and no dialog is open
- **THEN** the user can move focus to its actions with Tab and activate them

#### Scenario: Dialog opens over a notice
- **WHEN** a modal dialog opens while a persistent notice is visible
- **THEN** Tab inside the dialog never reaches the notice's actions and assistive technology does not expose them until the dialog closes
