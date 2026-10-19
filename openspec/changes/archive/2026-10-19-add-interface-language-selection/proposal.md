# Proposal

## Why

EasyTrack currently presents its interface, installation guidance, and error messages only in Russian. Adding an English interface lets people use the existing local-first application in their preferred language without changing their project data.

## What Changes

- Add a persistent, accessible Russian/English language selector throughout the application, including loading and unavailable states.
- Select the interface language from the browser while no explicit choice exists: Russian for Russian browser preferences and English otherwise. Apply an explicit choice immediately and retain it for the current browser or installed-app storage context.
- Localize all application-owned visible and accessible text, page metadata, and installable-app description. Keep the `EasyTrack` product name and user-entered project, status, and card names unchanged.
- Keep language selection usable when the project database cannot open or when a stale tab requires a restart.

## Capabilities

### New Capabilities

- `interface-language`: Selects, remembers, and applies the language of EasyTrack's interface and metadata.

### Modified Capabilities

None. Existing project-board and offline-installation behavior remains governed by their current requirements; this capability specifies the language in which that behavior is presented.

## Impact

- Application shell, project catalogue and board controls, forms and errors, PWA guidance and update/restart notices, document metadata, and the web-app manifest.
- Browser-local language preference storage independent of the project database so the selector remains available during database failure.
- Component and production-browser tests for both languages, preference persistence, offline use, and install metadata.
