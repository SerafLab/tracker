# Tasks

## 1. Baseline and PWA build configuration

- [x] 1.1 Rebase or merge the completed project-board UI work into the implementation baseline; verify the current `main` passes `npm run check` before PWA edits.
- [x] 1.2 Add compatible `vite-plugin-pwa` and Playwright dependencies, `test:e2e` scripts, and CI browser installation; verify `npm ci`, `npm run test:e2e -- --help`, and the existing unit suite succeed on Node 24.
- [x] 1.3 Configure Vite PWA `generateSW` prompt registration for `/tracker/` with no runtime caching; verify a production build emits a manifest, service-worker files, and a precache whose entries stay under `/tracker/`.

## 2. EasyTrack identity and installation guidance

- [x] 2.1 Add local launcher and Apple-touch icons plus manifest metadata for the standalone `EasyTrack` application; verify generated manifest name, scope, start URL, icon URLs, and HTTP status of every icon in a production preview.
- [x] 2.2 Update the document and visible application identity to EasyTrack while retaining the personal-project-tracker context; verify heading/title assertions and the existing project-board scenarios continue to pass.
- [x] 2.3 Implement an accessible persistent installation control, deferred Chromium prompt, and platform-specific manual guidance; verify RTL tests cover native-prompt availability, prompt absence, one-session dismissal, keyboard dialog operation, and iOS/iPadOS storage-isolation wording.
- [x] 2.4 Document installation, offline boundaries, iOS/iPadOS isolated storage, and clear-site-data risk in the README or linked user guide; verify the documented installation and local-preview commands match the implemented production paths.

## 3. Offline runtime, storage, and safe updates

- [x] 3.1 Add the app-layer PWA registration state and accessible update notice with explicit Update and Later actions; verify component tests prove a deferred update does not reload and an accepted update invokes activation then reload.
- [x] 3.2 Request persistent storage once after the first successfully saved user mutation, without changing normal behavior on absent, rejected, or failing APIs; verify unit/component tests cover granted, rejected, unsupported, and failed requests.
- [x] 3.3 Subscribe to Dexie `versionchange`, close the stale connection, guard store mutations, and render an accessible restart-required state; verify a controlled database-version test disables editing and the restart action reloads the app.
- [x] 3.4 Integrate PWA controls with the final responsive UI without exposing mutation actions during restart-required state; verify desktop and narrow-viewport RTL scenarios retain the existing project, status, and card flows.

## 4. Browser-level PWA verification and deployment checks

- [x] 4.1 Add a Chromium Playwright suite against the built `/tracker/` application for manifest/icon delivery, service-worker registration, and online-create → offline-reopen → offline-change → offline-reopen using real IndexedDB; verify the suite passes locally.
- [x] 4.2 Add a same-origin two-release fixture for the Playwright update lifecycle; verify the new worker waits while the user chooses Later and activates only after the explicit Update action.
- [x] 4.3 Extend `npm run check`, pull-request CI, and deploy smoke so release artifacts are blocked on PWA browser checks and published manifest/service-worker availability; verify workflows remain least-privileged and `npm run check` passes locally.
- [x] 4.4 Add the physical-release checklist for latest iPhone/Safari and Android/Chrome: install first, offline reopen and mutation, deferred/applied update, and iOS storage isolation; verify release notes record the tested OS and browser versions.

## 5. Final integration

- [x] 5.1 Run `npm run check` from a clean install and inspect the production `dist` precache to confirm no external runtime cache or user data is bundled; verify all automated checks pass.
- [x] 5.2 Execute the physical-release checklist on the supported iPhone and Android devices after deployment; verify EasyTrack meets the offline-installed-app specification or record a blocking issue with device, browser, and observed behavior.
