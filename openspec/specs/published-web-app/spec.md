# published-web-app Specification

## Purpose

Публикует минимальную веб-версию трекера на постоянном адресе и позволяет проверить, что доставленная пользователю сборка действительно работает.

## Requirements

### Requirement: Public tracker entry page
The system SHALL publish an HTML entry page for the tracker at `https://seraflab.github.io/tracker/`, where it visibly identifies itself as the tracker application.

#### Scenario: Visitor opens the public application URL
- **WHEN** a visitor requests `https://seraflab.github.io/tracker/`
- **THEN** the response successfully loads an identifiable tracker application page

### Requirement: Project-path asset loading
The system SHALL load the production application's own static assets from the `/tracker/` project path without requiring a server-side route fallback.

#### Scenario: Visitor loads the entry page from GitHub Pages
- **WHEN** the public entry page is opened at `/tracker/`
- **THEN** its required application assets load successfully from the same project path

### Requirement: Automatic publication from main
The system SHALL build and publish the production application to GitHub Pages after a successful push to the `main` branch.

#### Scenario: Main branch receives a valid change
- **WHEN** a commit is pushed to `main` and its deployment workflow succeeds
- **THEN** GitHub Pages serves the production build produced from that commit at the public application URL

### Requirement: Published-version smoke verification
The system SHALL automatically verify the published application URL after deployment by checking that it is reachable and returns the expected application shell.

#### Scenario: A deployment finishes
- **WHEN** the GitHub Pages deployment reports success
- **THEN** the deployment workflow verifies the public URL and fails its smoke-verification step if the URL is unavailable or the expected application shell is absent
