# Spec Delta

## MODIFIED Requirements

### Requirement: Local-storage limits are communicated
The system SHALL make a non-blocking persistent-storage request after meaningful user interaction where supported. It SHALL explain in its installation guidance that, without an account, projects are local to the browser or installed-app storage context, do not synchronize, and can be lost when site data is cleared, and that signing in to an account synchronizes them.

#### Scenario: Persistent storage is unavailable or denied
- **WHEN** the browser does not support persistent storage or declines the request
- **THEN** EasyTrack remains usable and does not present the failure as a data-loss error

#### Scenario: User installs from Safari on iPhone or iPad
- **WHEN** a user views EasyTrack's installation guidance on iOS or iPadOS
- **THEN** it explains that the installed app has separate local storage from Safari, that existing Safari projects are not transferred automatically without an account, and that signing in to the same account in both synchronizes them
