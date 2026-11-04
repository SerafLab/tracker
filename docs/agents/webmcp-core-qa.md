# WebMCP core: состояния приёмки

Актуальное состояние: 2026-11-03. Датированные разделы ниже сохраняют историю проверки. Обычный app использует native WebMCP; [failed WS и successful production marker feasibility](mcp-browser-qa.md) остаются историческими доказательствами отдельных transport prerequisites. Пользователь явно одобрил замену Node/stdio на browser-native: «Да, реализовать WebMCP». Marker proof не принимается за task CRUD proof.

| Этап | Фактическое состояние |
| --- | --- |
| Failed production WS gate | Записан без изменения результата |
| Native production marker-only feasibility | PASS ранее, PR23 ae3dd32, Chrome156; panel visibility=false, document visible |
| Core repository/application, schemas/ledger, UI/lifecycle | Локальные focused checks PASS; core commits 677ffb2, 0747a3b, ac16157, bd1b872 |
| Автоматизированный native-contract fixture | PASS: все 14 tools → adapter → IndexedDB → UI, RU/EN, offline reload, description/notes, drafts, isolation, lost host acknowledgement и настоящий storage versionchange; это fixture, не native availability proof |
| Полная обязательная проверка core | PASS: `E2E_PORT=4186 npm run check`, 247 unit/UI + 3 historical probe + 125 browser; architecture, TypeScript/production build/PWA, strict OpenSpec и diff check PASS |
| Фактическая native candidate приёмка | PASS: все14tools в реальном IAB, UI/drafts/show/reload/session; разрешённые пользователем delete_card/delete_status и итоговый reload |
| Готовый PR / merge / deployment | PASS: PR24 слит squash в80478b6; Pages build/deploy/smoke run41505801538 успешны |
| Production native task workflow | PASS: все14tools на опубликованном URL, unshown/show, close/reopen, description/note сохранены, разрешённые удаления и очистка проверены |
| Реальный пользовательский новый чат | PASS: пользователь явно запросил создание чата, сменил несовместимую модель и подтвердил функциональный walkthrough |

Focused проверки включают authoritative missing/conflict/status_not_empty/unchanged/rollback, concurrent description/attributes в обоих порядках, atomic notes cascade и отсутствие orphan records при concurrent createStatus/deleteProject из принятого предшественника. Store/adapter проверяют pending UI commit+refresh, DnD recovery, stale connection, late refresh vs new navigation, сохранённый успех с view warning и read-only retry, независимые field/note drafts и конфликт dirty target. Runtime проверяет 64 completed results/high-water, exact duplicates, mismatch/eviction, pre-dispatch refusal, 15s timeout и abort read/mutation, late commit, partial/deferred registration, StrictMode/pagehide/BFCache и pending lease через замену runtime.

До готового PR фактическая native candidate discovery всех14tools и task workflow с UI agreement/show/reload прошли. Слои и итоговый core совместно со skill4419c73 приняты независимыми reviewers; skill объединён с кодом. Объединённый `E2E_PORT=4185 npm run check` прошёл:247unit/UI+3probe+125browser. После merge успешно выполнены Pages публикация/smoke, отдельная native production task приёмка и реальный новый чат, явно запрошенный пользователем. В новом чате [skill](easytrack-skill.md) прошёл app-closed add, ID resolution, show и unshown/reopen. Фактические результаты приведены ниже.

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

## Опубликованная версия — 2026-11-02…03

[PR24](https://github.com/SerafLab/tracker/pull/24) прошёл обязательный CI и слит squash в80478b689454897815508dcb1d832d4d5710a81c. [Pages run41505801538](https://github.com/SerafLab/tracker/actions/runs/41505801538) завершил build, deploy и smoke успешно. Чистая локальная main синхронизирована. Последующий06a5d3a меняет правила агентов и ручной QA без изменения src/package проверенного выпуска.

В реальном Codex IAB на обычном https://seraflab.github.io/tracker/ первая загрузка была старой закешированной PWA. Обычная кнопка Update применила опубликованный выпуск; свежая native discovery обнаружила14tools. Флаги браузера, origin, exposedTo, глобальные настройки и транспорт не менялись.

get_connection вернул ready/version1/session661d3674-c16f-40da-9f91-e61d5d77529a. Каталог был пуст. Native команды создали проект a06a339c-0fdd-4d53-95b9-7ca684c887a0, два статуса и карточку574ffb88-0da6-4131-9c4e-02f640fd32b1. Обычный UI сохранил синтетические description и note. Native update_card выставил оба признака и имя «Release QA verified card», move_card перенёс её, сохранив описание и заметку. Rename/move status, rename project, get_board и show_workspace вернули подтверждённые значения, совпавшие с UI. Записи выполнялись при browser visibility=false; показ применил ту же доску в той же выбранной вкладке. [Снимок опубликованной доски](screenshots/webmcp-production-tasks.jpg).

Закрытие и повторное открытие того же внутреннего браузерного контекста сохранило проект, карточку, признаки, описание и заметку. Новый документ получил другую сессию. Первое чтение старой сессией остановила автоматическая проверка доступа из-за usage limit: вызов не выполнился и не считался проверенным. После пользовательского «продолжай» повтор тем же native путём прошёл: old session получила disconnected, новая ready session a1318dea-a5ae-4c8a-b604-a18d6d594ad9 прочитала фактическую доску. Обходов отказа не использовалось.

Пользователь явно разрешил удалить синтетическую карточку с заметкой, пустой статус «QA empty release status», затем созданный проверочный проект. После fresh discovery и проверки точных ID оба native delete вернули saved:true/deletedId; get_board показал оставшийся пустой статус. Обычный UI подтвердил удаление именно проекта «WebMCP release QA 2026-11-02 — verified» с1статусом/0карточками. После перезагрузки каталог пуст, тестовые данные не восстановились. [Снимок после разрешённой очистки](screenshots/webmcp-production-cleaned.jpg).

Все14tools фактически вызваны на опубликованном origin. Это task workflow proof, а не marker-only эксперимент.

## Реальный новый чат — 2026-11-03

Пользователь явно запросил: «Создай новый чат для проверки». Создан чат «Проверка EasyTrack в новом чате», ID01a1a068-b52c-7290-a151-0099adce958c. Он прочитал репозиторный skill и references. Первая попытка остановилась до мутаций: gpt-5.6-luna не поддерживает native команду webmcp_list_tools. Пользователь выбрал «Переключу и продолжу сам», затем запустил исходный сценарий на совместимой модели. Её точное имя в итоговом отчёте не предоставлено. Это ограничение host/model; [официальная документация](https://learn.chatgpt.com/docs/changelog?date=2026-09-03&index=2) отдельно исключает GPT-5.6 Luna из Site tools и указывает GPT-5.6 Sol/Terra.

После пользовательского продолжения native ready/version1 привязалась к session1e2b54dd-c12c-4150-a093-d1c573f3a79a. Проверка существующих проектов исключила молчаливый дубликат. Через WebMCP созданы:

- Проект «EasyTrack new-chat QA 2026-11-03»: ac57ed3c-b7e7-48a7-b812-535faae81c8a.
- Статус «Проверка skill»:660689b9-69ad-4924-b954-413fc9bbbd09.
- Карточка «Проверка из нового чата»: af3512fa-ca93-4ca7-958d-665b0db7e0c3, important=true, urgent=false.

show_workspace фактически применил маршрут доски. get_board подтвердил карточку, включая чтение при скрытой панели; hidden-document execution не заявляется. После закрытия собственной вкладки и повторного открытия canonical URL fresh discovery получила новую session e5fd0f53-3261-4522-b67a-05ff98671c8f; карточка сохранилась и повторный show успешен. Пользователь прислал итог в основной чат; журнал нового чата подтверждает последовательность native вызовов. Вкладка оставлена deliverable, тестовый проект сохранён, поскольку его удаление не запрашивалось. [Снимок из проверочного чата](screenshots/webmcp-new-chat-board.png).

Итоговый отчёт нового чата называет13tools. Это число не используется как независимое доказательство полноты API: контракт содержит13операционных команд и отдельный get_connection, всего14. Полный список14 проверен в основной native production приёмке; новый чат подтверждает функциональный сценарий добавления/показа/unshown/reopen.

## Контракт версии 2: наборы статусов — кандидатная (локальная) проверка

Записи выше относятся к контракту версии 1 (14 tools) и остаются историческими; они не подтверждают версию 2.

Локально проверено на коммите ветки codex/nov04-native-status-sets (кандидат, не опубликовано):

- Unit/contract: схемы create_project (обязательный statusSetId, включая none; отклоняются отсутствующий, неизвестный и «empty») и apply_status_set (none отклоняется), 15 tools, contractVersion 2.
- Repository: создание проекта с упорядоченными независимыми статусами в одной транзакции, apply только к пустому проекту, conflict и not_found без записи, откат при ошибке записи.
- Composition: названия RU/EN в порядке каталога интерфейса, route и preference не меняются, журнал дублей и view_refresh_failed, get_board не раскрывает заметки.
- Browser fixture (Playwright, RU/EN): native-contract fixture вызывает create_project/apply_status_set через адаптер, IndexedDB и UI.

Не выполнялось: фактическая discovery версии 2 в реальном внутреннем браузере (IAB) и production smoke на опубликованном URL. Эти этапы остаются непроверенными до слияния и публикации; fixture не доказывает доступность native WebMCP.
