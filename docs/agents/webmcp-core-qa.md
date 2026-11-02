# WebMCP core: состояния приёмки

Дата: 2026-11-02. Обычный app использует native WebMCP; [failed WS и successful production marker feasibility](mcp-browser-qa.md) остаются историческими доказательствами отдельных transport prerequisites. Пользователь явно одобрил замену Node/stdio на browser-native: «Да, реализовать WebMCP». Marker proof не принимается за task CRUD proof.

| Этап | Фактическое состояние |
| --- | --- |
| Failed production WS gate | Записан без изменения результата |
| Native production marker-only feasibility | PASS ранее, PR23 ae3dd32, Chrome156; panel visibility=false, document visible |
| Core repository/application, schemas/ledger, UI/lifecycle | Локальные focused checks PASS; core commits 677ffb2, 0747a3b, ac16157, bd1b872 |
| Автоматизированный native-contract fixture | PASS: все 14 tools → adapter → IndexedDB → UI, RU/EN, offline reload, description/notes, drafts, isolation, lost host acknowledgement и настоящий storage versionchange; это fixture, не native availability proof |
| Полная обязательная проверка core | PASS: `E2E_PORT=4186 npm run check`, 247 unit/UI + 3 historical probe + 125 browser; architecture, TypeScript/production build/PWA, strict OpenSpec и diff check PASS |
| Фактическая native candidate приёмка | Pending: выполняет интегрирующий агент в отдельном тестовом контексте |
| Готовый PR / merge / deployment | Pending |
| Production native task workflow | Pending после публикации; marker proof не заменяет |
| Реальный пользовательский новый чат | Pending / user-required; агент не создаёт его самостоятельно |

Focused проверки включают authoritative missing/conflict/status_not_empty/unchanged/rollback, concurrent description/attributes в обоих порядках, atomic notes cascade и отсутствие orphan records при concurrent createStatus/deleteProject из принятого предшественника. Store/adapter проверяют pending UI commit+refresh, DnD recovery, stale connection, late refresh vs new navigation, сохранённый успех с view warning и read-only retry, независимые field/note drafts и конфликт dirty target. Runtime проверяет 64 completed results/high-water, exact duplicates, mismatch/eviction, pre-dispatch refusal, 15s timeout и abort read/mutation, late commit, partial/deferred registration, StrictMode/pagehide/BFCache и pending lease через замену runtime.

Перед merge требуется фактическая native candidate discovery всех14tools и полный task workflow с UI agreement/show/reload, независимый review, strict OpenSpec/diff/check и интеграция repository skill. После merge — успешная Pages публикация/smoke и отдельная native production task приёмка на разрешённых disposable данных. Пользователь затем открывает новый чат либо отдельно явно просит его создать, устанавливает/применяет [skill](easytrack-skill.md), проверяет app-closed add, ID resolution, show и unshown/reopen. До фактического результата эти этапы остаются pending.

Финальная автоматизированная проверка выполнена после добавления versionchange regression. Исходный код кандидата bd1b872 после check не изменён; документация и тестовая fixture не подменяют его реальную native приёмку. Полный локальный лог: `/private/tmp/tracker-webmcp-core-final-check.log`. Штатный `npm ci` настроил `.githooks`, обходов hook/CI нет. Схема IndexedDB не мигрировала; в тесте versionchange моделируется физическая версия40 (Dexie schema3 хранится в IndexedDB как30).
