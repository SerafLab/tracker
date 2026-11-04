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

## Execution record (resumed in Claude Code 2026-11-04)

The previous session ended mid-merge of the card panel. Roles follow agent-routing.md with Claude models: runner — sonnet/medium, reviewer — opus/high (read-only by instruction only). Ports: 4281 panel, 4284 status sets, 4287 recent notes.

| Function | Branch / worktree | Exact base | State / accepted commit |
|---|---|---|---|
| Card panel | codex/nov03-card-panel; /private/tmp/traker-nov03-card-panel | a4fa010 | Merge conflict resolved a0b597e (catalogue() summaries + boardSnapshot reset). Reviewer rejected the unspecified fixed AppBar; fixes 3cbf05e, d559731, 28c4ee1, 29b2947 merged (b781ffe, c147d90, 7139ba7). Accepted with minor notes at 7139ba7: 268 unit + 3 probe + 163 browser PASS. Follow-up in progress: desktop install entry over panel, agent delete_card test |
| Apply status set | codex/nov04-apply-status-set; /private/tmp/traker-nov04-apply-status-set | 991ab2f | 3ce3be5 + cb475a9 (focus after apply, not_found → catalogue). Accepted with minor notes; feature 265 unit + 135 browser PASS. Integrates last. Spec sync: drop ADDED requirements identical to main; "Saved preset names…" becomes MODIFIED |
| Recent notes | codex/nov04-recent-notes; /private/tmp/traker-nov04-recent-notes | 7139ba7 | Runner started |
| Column boundaries | codex/nov04-column-boundaries; /private/tmp/traker-nov04-columns | 9c8f10c | e3d9f77 committed earlier, not yet reviewed or merged |

User decision 2026-11-04: on a project board, with or without a card panel, the application bar stays fixed and the board scrolls inside a viewport-bounded workspace; catalogue, full card page and service states keep the bar scrolling with the document (MODIFIED "Responsive application bar presentation" in add-card-details, commits 2f49a80, 0788970).

Spec sync notes: add-card-details re-ADDs requirements already in openspec/specs/card-details; convert them to MODIFIED (or drop identical ones) before archive.

## Checkpoint 2026-11-04 (session stopped at usage limit)

- Integration codex/active-changes-nov03: card details, recent notes and column boundaries synced and archived (16692a2; card-details delta reconciled as MODIFIED, keeping #24 drag/scroll rules, no arrows). Status sets + native status-set tools (contract v2) accepted and merged (a57e0d5); not yet synced/archived — add-project-status-presets: drop ADDED requirements identical to main, "Saved preset names…" as MODIFIED; extend-native-agent-status-sets delta already MODIFIED (686dbab). Test-timing fixes e9112c0 and the native e2e preview wait. Last full check before these fixes: 298 unit PASS, 1 e2e fail (fixed). Rerun full check first.
- Header card creation: codex/nov04-header-card-creation, /private/tmp/traker-nov04-header-creation, base d05bfa0, commits up to a03ea41 accepted with notes; runner stopped mid-fix — inspect uncommitted changes. Remaining fixes: restore dropped delta text (44×44, add-status styling, «Добавить карточку»/«Add card», dedupe scenarios), short viewports (568×320 lower entry reachable; remove overscroll contain on lists), fixed install entry overlap at 844×390, focus ring clip. Merge-tree with integration is clean.
- Then: merge header creation, sync/archive the three remaining changes (line-by-line compare with main specs), full check, final review, one PR to main, CI, squash merge, Pages deploy.

## Final integration (2026-11-04)

All seven changes merged, synced and archived (status sets 9110bb3, header card creation 2d618aa). Final review: ready with minor notes; DESIGN.md, PRODUCT.md and stale project-boards wording (panel vs page, status-set form on an empty board) corrected before the PR, dead `.card-panel .status-columns` rule removed. Two consecutive full checks on 2d618aa: 300 unit + 3 probe + 198 browser PASS.

Follow-ups (not blocking): the agent-refresh error banner (app.tsx ~215) sits above the viewport-bounded board, so while it is shown the page can scroll by its height; toggles inside inert columns may still lose focus in real browsers while a board write is pending; real-device touch-hold on note text, IAB discovery of contract v2 and production smoke remain unverified; installed copies of the EasyTrack skill in other chats must be refreshed for contract v2 (old copies report the app as incompatible).
