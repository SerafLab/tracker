# WebMCP core: состояния приёмки

Дата: 2026-11-02. Обычный app использует native WebMCP; [failed WS и successful production marker feasibility](mcp-browser-qa.md) остаются историческими доказательствами отдельных transport prerequisites. Пользователь явно одобрил замену Node/stdio на browser-native: «Да, реализовать WebMCP». Marker proof не принимается за task CRUD proof.

| Этап | Фактическое состояние |
| --- | --- |
| Failed production WS gate | Записан без изменения результата |
| Native production marker-only feasibility | PASS ранее, PR23 ae3dd32, Chrome156; panel visibility=false, document visible |
| Core repository/application, schemas/ledger, UI/lifecycle | Локальные focused checks PASS; core commits 677ffb2, 0747a3b, ac16157, bd1b872 |
| Автоматизированный native-contract fixture | PASS: все 14 tools → adapter → IndexedDB → UI, RU/EN, offline reload, description/notes, drafts, isolation, lost host acknowledgement и настоящий storage versionchange; это fixture, не native availability proof |
| Полная обязательная проверка core | PASS: `E2E_PORT=4186 npm run check`, 247 unit/UI + 3 historical probe + 125 browser; architecture, TypeScript/production build/PWA, strict OpenSpec и diff check PASS |
| Фактическая native candidate приёмка | PASS: все14tools в реальном IAB, UI/drafts/show/reload/session; разрешённые пользователем delete_card/delete_status и итоговый reload |
| Готовый PR / merge / deployment | Pending |
| Production native task workflow | Pending после публикации; marker proof не заменяет |
| Реальный пользовательский новый чат | Pending / user-required; агент не создаёт его самостоятельно |

Focused проверки включают authoritative missing/conflict/status_not_empty/unchanged/rollback, concurrent description/attributes в обоих порядках, atomic notes cascade и отсутствие orphan records при concurrent createStatus/deleteProject из принятого предшественника. Store/adapter проверяют pending UI commit+refresh, DnD recovery, stale connection, late refresh vs new navigation, сохранённый успех с view warning и read-only retry, независимые field/note drafts и конфликт dirty target. Runtime проверяет 64 completed results/high-water, exact duplicates, mismatch/eviction, pre-dispatch refusal, 15s timeout и abort read/mutation, late commit, partial/deferred registration, StrictMode/pagehide/BFCache и pending lease через замену runtime.

До готового PR фактическая native candidate discovery всех14tools и task workflow с UI agreement/show/reload прошли. Слои и итоговый core совместно со skill4419c73 приняты независимыми reviewers; skill объединён с кодом. Объединённый `E2E_PORT=4185 npm run check` прошёл:247unit/UI+3probe+125browser. После merge — успешная Pages публикация/smoke и отдельная native production task приёмка на разрешённых disposable данных. Пользователь затем открывает новый чат либо отдельно явно просит его создать, устанавливает/применяет [skill](easytrack-skill.md), проверяет app-closed add, ID resolution, show и unshown/reopen. До фактического результата эти этапы остаются pending.

Финальная автоматизированная проверка выполнена после добавления versionchange regression. Исходный код кандидата bd1b872 после check не изменён; документация и тестовая fixture не подменяют его реальную native приёмку. Полный локальный лог: `/private/tmp/tracker-webmcp-core-final-check.log`. Штатный `npm ci` настроил `.githooks`, обходов hook/CI нет. Схема IndexedDB не мигрировала; в тесте versionchange моделируется физическая версия40 (Dexie schema3 хранится в IndexedDB как30).

## Actual native candidate execution — 2026-11-02

Candidate: detached `bd1b872`, production build served at `http://127.0.0.1:4192/tracker/`, separate origin from published task data. Codex IAB browser2 (same Chrome156 host used for native feasibility), tab12. No flags, exposure settings, stdio, relay or task CRUD through DOM were used. Ordinary UI was used only to create a synthetic description/note and inspect protected drafts.

Actual `fetchTools` discovered all14 task tools with native suffixed names and input schemas/annotations. `get_connection` returned ready/version1, original session `07a41d0e-55f8-4dd4-a064-66b0509fe041`, sequence0. `list_projects` returned an empty catalogue. `create_project` created `42d6041e-69aa-4e9c-b7f1-7902175b1d6f`, initially «WebMCP QA 2026-11-02 — candidate», and the catalogue refreshed without implicit navigation. Two status creations returned IDs and positions. `show_workspace` confirmed the exact applied board route and same-origin URL.

Three card creations confirmed empty descriptions/default flags and priority order. The ordinary card page saved «Native WebMCP candidate description — preserve me.» and a synthetic note. Native `update_card` renamed the card and set important=true; `move_card` appended it after its important peer and before the lower-priority card. Returned data retained the stored description, and the mounted page retained notes. The moved card is `048790aa-74e8-432f-96fd-e73cd4a1ce96`; native board showed exactly three cards after intentionally repeating the already-confirmed create requestId5: the cached creation receipt was reused without a fourth card.

Dirty field and new-note drafts caused native `show_workspace` and conflicting `update_card` to return conflict without navigation or loss of input. Unrelated `rename_project` succeeded while both drafts remained. Project became «WebMCP QA 2026-11-02 — verified candidate». After clearing the field draft by restoring its saved value and saving the synthetic second note, native `rename_status` and `move_status` preserved the card route and changed persisted status order. Empty status is `fb87a60d-5032-4728-88c2-083907881c6a` («QA empty status»).

Operations completed while browser visibility was false. `show_workspace` later applied the board route; host reported selectedTabId12 and visibility=false. Host visibility was then settrue, with the same selectedTabId12. Screenshot: [candidate board](screenshots/webmcp-candidate-proof.jpg). This proves unshown-panel calls and showing the same tab, without a hidden/unloaded-document claim.

Reload preserved route, three cards, priority positions and description. Fresh discovery returned new native handles and session `07516250-0a61-4e36-b612-e5a82f660ed0`, sequence0. Calling a fresh get_board handle with the old session returned disconnected. Calling it with the fresh session returned the saved board. Opening the moved card in UI showed the saved description and both synthetic notes after reload. Detail screenshot: [persisted details](screenshots/webmcp-candidate-details.jpg).

The user explicitly answered «Да, удалить эти тестовые объекты» for the named local card and empty status. Fresh discovery and ready/session verification preceded native delete_card(request1) and delete_status(request2), each returning saved:true/deletedId. The card page became Card unavailable; get_board returned only QA second with the two unaffected cards at positions0/1. show_workspace(request3) applied the actual board route. A final reload kept exactly that one status/two cards: neither deleted object returned. Browser panel was then hidden. Native candidate gate6.2 passed. Published-origin task verification and the real user new-chat walkthrough remain pending after delivery.

Final deletion/reload proof: [candidate board after deletion](screenshots/webmcp-candidate-deleted.jpg).
