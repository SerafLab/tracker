# Active changes — 2026-11-03

Base: origin/main ef20669e202b061905ab37aa83c9d999ef9897ac. Original dirty worktree codex/compact-app-bar is preserved. Integration: codex/active-changes-nov03, /private/tmp/traker-nov03-integration.

Existing accepted features: project/card deletion, DnD, selective screenshot review and native WebMCP. Their archived contracts and production evidence remain authoritative. Older local stdio/loopback proposal is superseded; new status-set requirements extend native WebMCP rather than reinstate rejected transport.

User decision: empty boards retain header card-creation plus buttons; only lower buttons hide when the whole board has no cards.

Implementation graph: catalogue tiles, AppBar truncation and card-details panel can run independently in isolated branches. Integrate catalogue, truncation, details; then recent notes (depends on final details navigation), then column boundaries/aligned headers, then bounded per-column scrolling/creation controls. Status-set application and native tools consume final repository/state contracts and integrate last. Each feature gets a branch and worktree, reviewer acceptance, and npm run check after integration.

Shared contracts: keep Dexie v3 description/notes and accepted CardPlacement interface. Details has one card URL, session history presentation panel/page; direct/reloaded links use page. Board remains mounted beside panel and its confirmed snapshot refreshes after mutations. Editor persists during expansion. Guard protects card switches, history, close, catalogue and PWA update. Latest note previews are read via notes index with limit five per card, sorted createdAt/id ascending, no copied history in Card. Catalogue summaries are distinct ProjectSummary records with cardCount; native list_projects still returns Project shape. Built-in status-set IDs remain stable and labels resolve in browser locale; create_project requires explicit set ID including none, apply_status_set forbids none and checks empty project atomically. Background operations preserve navigation and preference; description/note writes remain UI-only. Native protocol keeps session/dedup/unknown-outcome semantics.

All accepted deltas must retain existing project deletion, DnD semantics and native tool behavior when synced. Board visual delta must not reintroduce removed move arrows. Repeated proposals for existing features are reconciled against current requirements; tasks are completed only after their actual behavior/checks pass. Required acceptance includes RU/EN and 320/390/1280/1440 layouts, history, draft retention, indexed note limits, summary counts, atomic status sets, native contract tests, full npm run check and independent review. One PR with synchronized specs and archived completed changes; required GitHub checks, squash merge and Pages deployment before delivery is reported.

Branches/worktrees and exact feature bases are appended as created. Role-specific requested models are unavailable; inherited available model is used.

## Execution record (continued 2026-11-04)

| Function | Branch / worktree | Exact base | State / accepted commit |
|---|---|---|---|
| AppBar headings | codex/nov03-headings; /private/tmp/traker-nov03-headings | a4fa010 | 0682615 independently reviewed, merged893f50c, full combined check254 unit+3probe+127browser PASS; synced/archived4046463 |
| Catalogue tiles | codex/nov03-catalogue; /private/tmp/traker-nov03-catalogue | a4fa010 | 35ddc2d independently reviewed, feature258 unit+3probe+133browser PASS; merged awaiting combined check |
| Card panel | codex/nov03-card-panel; /private/tmp/traker-nov03-card-panel | a4fa010 | runner resume_panel; independent reviewer resume_catalogue; scroll-container and cross-project read-race regressions in progress |
| Apply status set | codex/nov04-apply-status-set; /private/tmp/traker-nov04-apply-status-set | 991ab2f | runner review_headings; independent of panel/catalogue code, native extension remains later |

Original user worktree remains untouched. Baseline253 unit+3probe+125browser PASS. Several concurrent jsdom suites exhausted local resources; VITEST_MAX_WORKERS=2 bounds parallelism without reducing required checks. All local test servers use distinct ports4280(integration),4281(panel),4282(headings),4283(catalogue),4284(presets). Every npm ci retains prepare/pre-push setup; sandbox escalation is needed for git config and local server binding.
