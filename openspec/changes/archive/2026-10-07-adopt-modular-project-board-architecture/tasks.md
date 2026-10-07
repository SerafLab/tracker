# Tasks

## 1. Architecture contract and toolchain

- [x] 1.1 Add `docs/adr/0004-modular-project-board-architecture.md` that records the modular-monolith boundary, directed dependencies, Zustand runtime-state decision, and deliberately deferred server/mobile choices; verify it follows the repository ADR format and links consistently to ADR-0001 and ADR-0002 where relevant.
- [x] 1.2 Add Zustand as a locked dependency and a local TypeScript-based static import-boundary checker with a reproducible package script; verify `npm ci` and the new architecture-check command succeed on the untouched source before the structural migration.

## 2. Domain, application, and persistence boundary

- [x] 2.1 Move project-board entities, name validation, identifiers, and ordering rules into `features/project-board/domain` without platform imports; add or relocate unit tests and verify they pass without React, Dexie, or browser-location dependencies.
- [x] 2.2 Define the asynchronous `ProjectBoardRepository` port and project-board use cases in `features/project-board/application`; test creation, rename, move, project isolation, and failed-operation behavior against a test-double implementation of the port.
- [x] 2.3 Move `TrackerDatabase` and the Dexie implementation behind `features/project-board/infrastructure/indexeddb`, preserving database name, v1 table definitions, indexes, transactions, and operation results; verify adapter integration tests open pre-existing schema-v1-shaped data and retain status/card order, project isolation, and write-failure behavior.

## 3. Confirmed runtime state and presentation

- [x] 3.1 Implement a dependency-injected Zustand project-board store that owns loading, catalogue/board snapshot, save error, and scenario actions; verify store tests commit only confirmed use-case results and preserve the previous snapshot after a rejected mutation.
- [x] 3.2 Split the current React UI into `presentation` views, including prop-driven `CardView`, forms with local transient state, and project/board views that select confirmed data and actions from the store; verify React Testing Library scenarios retain validation, accessible controls, error announcements, and narrow-board reachability.
- [x] 3.3 Introduce the `app` composition root that creates the IndexedDB adapter, use cases, and Zustand store, and exclusively owns hash parsing, hash-change subscription, and navigation writes; verify route/startup tests retain direct project links, last-open restoration, stale-selection fallback, and storage-unavailable handling.

## 4. Enforced boundaries and regression verification

- [x] 4.1 Configure the static import-boundary rule so feature internals are reached only through public entry points, `application` does not depend on `presentation` or `infrastructure`, `domain` remains platform-independent, and only the IndexedDB adapter imports Dexie; verify intentional fixture violations fail the architecture check and the migrated source passes it.
- [x] 4.2 Remove superseded root-level implementation files and update imports, test helpers, and source references to the new module paths; verify no production code retains direct imports of legacy domain/storage modules or direct Dexie access outside the adapter.
- [x] 4.3 Run the full configured automated suite and production build, including the architecture check; verify the existing multi-project board scenario, reload persistence, ordering, and failed-save behavior remain unchanged against the production build.
- [x] 4.4 Update the GitHub Actions build job to run the architecture check and automated tests before publishing; verify the workflow file invokes the same package commands that pass locally.
