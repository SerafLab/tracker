# Design

## Context

See [proposal.md](proposal.md) for motivation and [specs/interface-language/spec.md](specs/interface-language/spec.md) for required behavior. The current React views and PWA notices contain Russian strings directly. The app sets a Russian title on mount; `index.html` declares `lang="ru"`; Vite PWA generates one manifest with a Russian description. Project data and the last-open-project preference live in IndexedDB. The latter is replaced wholesale by `setLastProject`, so extending that row for language would also require changing its write behavior. The language selector must work before IndexedDB opens and when it fails.

## Goals / Non-Goals

**Goals:**
- Keep one authoritative active locale for the app shell, board presentation, PWA UI, and page metadata.
- Make a manual choice available before and independently of project database initialization.
- Bundle both languages for offline use and avoid remounting active forms when switching.

**Non-Goals:**
- Translate user-authored project, status, or card data.
- Put the language in project records or a future data backup. It belongs to the browser or installed-app storage context.
- Add a localization service, network-loaded translations, or languages beyond Russian and English.

## Decisions

### Use app-level localization with bundled resources

Use `i18next` and `react-i18next` with typed, statically imported Russian and English message resources. Initialize the locale before the first React render and expose translation through a root provider. Keep the `EasyTrack` name as a common resource. Pass translated display messages from presentation code rather than storing rendered Russian errors in the project-board state; the current `saveError` string should become an error code or boolean. Keep domain validation independent of locale.

Alternative considered: a custom translation function and dictionary. The established library is preferable for accessible labels, interpolation, and future growth, while the static resources keep offline startup deterministic.

### Store only an explicit override outside IndexedDB

Read a dedicated `localStorage` key synchronously at startup. Accept only `ru` or `en`; if absent or invalid, choose `ru` when the primary browser language has the `ru` language subtag and `en` otherwise. Do not write the inferred language: a later browser-language change should affect the next launch until the user makes a manual choice. A manual selection updates the in-memory locale immediately, then writes the override. Catch storage read/write errors. A failed write keeps the session language and shows a translated persistence warning.

Alternative considered: add locale to the IndexedDB workspace preference. That database can be unavailable when the selector must still work; its current `setLastProject` also replaces the whole row. `localStorage` is scoped to the same browser or installed-app storage context and avoids a database migration.

### Render the selector above workspace state branches

Place one compact, labelled language selector at the app-shell level so it remains present for loading, catalogue, board, unavailable, and restart-required views. Use native controls or equivalently accessible semantic buttons with visible `Русский` and `English` names. Changing locale updates the provider without changing the current route or keys of forms/dialogs, preserving unfinished input and focus where practical.

Alternative considered: duplicate a selector in each screen. A shared control prevents divergent behavior and keeps failure states reachable.

### Localize document and install metadata without a server

Update `document.documentElement.lang`, title, and description when the active locale changes. Use a neutral initial HTML title/description to avoid briefly advertising the wrong language before initialization. Produce two static, same-origin manifests with identical app name, icons, scope, start URL, and stable app identity, differing in localized description and language. Point the manifest link at the active locale before an installation prompt. Include both manifests in the offline app shell; adapt Vite PWA configuration so it does not inject a competing fixed-language manifest link.

Alternative considered: one bilingual or fixed-language manifest. That would leave install metadata out of step with the selected interface. Static variants retain GitHub Pages compatibility.

## Risks / Trade-offs

- [Browser blocks `localStorage`] → Keep the selected language in memory, show a persistence warning, and continue to allow switching even if IndexedDB also fails.
- [PWA tooling or browser caches a manifest after a locale change] → Keep both manifests' app identity identical and verify the active link, content, installation identity, and offline availability in production-browser tests.
- [Existing tests assume Russian] → Give tests an explicit Russian browser locale or saved preference, then add English and language-switch cases so expected copy is deterministic.
- [A hard-coded string is missed] → Inventory rendered strings, accessible names, error messages, metadata, and platform-specific installation guidance; exercise both locales in component and browser checks.

## Migration Plan

1. Ship both message bundles, selector, storage override, and localized manifests in one application build. Existing project records and IndexedDB schema stay intact.
2. For existing users with no explicit override, choose the current browser language at each launch; no one-time preference migration is needed.
3. Update PWA/browser tests and run the repository's `npm run check` gate before any Git delivery. Rollback is an application-code rollback; no stored project data needs conversion.
