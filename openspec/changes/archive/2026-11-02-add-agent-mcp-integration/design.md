# Design

## Context

Мотивация и объём — в `proposal.md`. EasyTrack опубликован на `https://seraflab.github.io/tracker/`; composition root `src/app/app.tsx` собирает repository, use cases и Zustand. Hash-навигация включает доску и страницу карточки; данные локальны для origin и браузерного storage context. Принятые описания/заметки, наборы статусов и удаление проектов сохраняются. Перед apply требуется принять актуальную реализацию DnD и сверить её публичный контракт, общий pending guard и восстановление после ошибки чтения.

Loopback WS production gate **FAILED**; native WebMCP production feasibility **PASS** в реальном Codex IAB Chrome156, PR23 `ae3dd32`, deploy/smoke успешны. Пройдены native discovery трёх diagnostic tools, echo, запись synthetic marker с `saved:true`, закрытие/повторное открытие и чтение того же marker. Вызов завершился при browser-panel visibility=false, но документ сообщил visibilityState=visible. Это не доказательство работы выгруженной/hidden страницы и не приёмка task tools. Запись и реальный снимок — `docs/agents/mcp-browser-qa.md`; не удалять неуспешную WS историю.

Пользователь 2026-11-02 явно одобрил browser-native WebMCP вместо Node/stdio MCP. Название существующего change сохраняется, публичный транспорт заменяется без совместимого stdio endpoint.

## Goals / Non-Goals

**Goals:** typed ID-based команды в runtime выбранного документа, подтверждённые результаты хранения, общий UI/agent guard и предсказуемый workflow поддерживаемого browser-host.

**Non-Goals:** собственный MCP wire protocol, локальный relay/сервер, Node SDK, pairing secrets, доступ к профилю, универсальный stdio-клиент, отдельная база задач, новый origin, синхронизация, заметки/описание/project deletion как агентные операции. Жизнь документа ограничивает доступность; reload не даёт exactly-once через новую сессию.

## Decisions

### 1. Native page tools и граница поддержки

Регистрировать команды через `document.modelContext.registerTool` внутри обычного EasyTrack. Agent-host выбирает конкретную внутреннюю вкладку, получает её native tool handles и вызывает их. Операции не зависят от DOM-форм. Native API отсутствует или host не умеет discovery/execution — интеграция недоступна, обычный UI продолжает работать. Не включать browser flags, не менять защиту, origin-trial credentials или глобальную конфигурацию ради доступа.

[Официальная imperative API](https://developer.chrome.com/docs/ai/webmcp/imperative-api) описывает native регистрацию, AbortSignal, discovery и execution. Входная JSON schema передаётся поддерживаемому native API; типизированные схемы результатов документируются и проверяются приложением/тестами. Не обещать, что host публикует не поддерживаемое им поле outputSchema. Использовать один browser-compatible источник схем и поддерживаемую библиотеку runtime-validation, а не ручной MCP-протокол. Node transport dependencies не входят в browser bundle.

Инструменты не получают расширенный exposedTo и не вводят собственные credentials. Доступ регулируют native platform/host capabilities и origin; session ID защищает маршрутизацию вызова, не является секретом или дополнительной аутентификацией. Разные пути `seraflab.github.io` не являются отдельными security origins. Альтернатива stdio/loopback не прошла фактическую проверку; сервер/расширение/DOM CRUD не выбраны пользователем.

### 2. Документ, session и жизненный цикл

`get_connection` — read-only сервис без bootstrap URL. Результат содержит sessionId, contractVersion=1, state, route и lastMutationSequence. Состояния документа: opening, ready, storage_unavailable, restart_required. Host workflow обозначает отсутствие выбранного документа как disconnected, неподдерживаемый API/версию — incompatible. Ни одна операция чтения/записи задач не проходит до storage-ready; stale connection запрещает запись и UI, и агенту.

Agent skill закрепляет `(browserId, tabId, sessionId, contractVersion)`. Все data/navigation tools требуют ожидаемый sessionId; несовпадение отказывается до операций хранения. Другая вкладка может зарегистрировать свои инструменты, но не заменяет выбранный handle и не получает fan-out мутацию. Глобального одного executor, как у удалённого relay, нет: каждый вызов имеет один явно выбранный документ. Разные браузерные контексты не синхронизируются.

Session ID и журнал запросов живут в памяти runtime документа. Маршруты внутри app сессию не меняют. Cleanup, pagehide, замена runtime и versionchange отзывают прежние task handles/разрешение исполнения; восстановление из BFCache и reload требуют свежей регистрации/discovery/session. `disconnect` не предоставляется: закрытие/переход документа завершает доступ, повторное открытие начинает новую сессию.

В React effects применять attempt-local AbortController и проверку актуальности до и после каждого await регистрации; при частичной ошибке отзывать уже зарегистрированные инструменты этой попытки. StrictMode и позднее разрешение старого Promise не регистрируют инструменты новой/закрытой сессии. Lifecycle/get_connection может оставаться диагностически доступным при unavailable/restart_required, но task operation guard действует независимо от доступности старого native handle. Registration AbortSignal отзывает tool, а execute(input,{signal}) получает отдельный сигнал исполнения. Начиная с Chrome153 unregister сам по себе не отменяет in-flight executions; не считать его гарантией отмены уже начатой записи или rollback.

### 3. Внешний контракт инструментов

`get_connection` получает пустой объект. Все остальные входы содержат sessionId. Все изменяющие состояние команды, включая `show_workspace`, дополнительно содержат положительный безопасный целый requestId, возрастающий в пределах сессии; читающим tools он не нужен. Схемы запрещают неизвестные поля.

| Tool | Поля операции помимо session/request metadata | Подтверждённый результат |
| --- | --- | --- |
| `list_projects` | нет | проекты с ID, именем и датой создания |
| `get_board` | projectId | проект, упорядоченные статусы и карточки, включая сохранённое description; история заметок не добавляется |
| `create_project` | name | сохранённый проект; внутренний CreateProjectInput содержит initialStatusNames:[] |
| `rename_project` | projectId, name | сохранённый проект |
| `create_status` | projectId, name | сохранённый статус |
| `rename_status` | statusId, name | сохранённый статус |
| `move_status` | statusId, direction:left/right | подтверждённая доска и результат изменения/unchanged |
| `delete_status` | statusId, confirm:true | удалённый ID либо status_not_empty |
| `create_card` | statusId, name, important=false, urgent=false | сохранённая карточка с description:'' |
| `update_card` | cardId, name, important, urgent | сохранённая карточка с актуальным сохранённым description |
| `move_card` | cardId, statusId, expected:{statusId,important,urgent} | сохранённая карточка и saved/unchanged |
| `delete_card` | cardId, confirm:true | удалённый ID; существующий каскад удаляет её заметки |
| `show_workspace` | необязательный projectId | реально применённый route и канонический app URL |

Не добавлять инструменты удаления проектов, заметок, изменения описания, выбора пресетов или произвольного reorder. Имена разрешаются чтением ID; неоднозначный проект/статус требует уточнения, а не молчаливого создания.

Успех: `{ok:true,sessionId,data}` с подтверждёнными значениями. Для no-op указывается outcome=unchanged, без новой записи. Ошибки приложения: `{ok:false,sessionId,error:{code,message}}`; codes: invalid_argument, not_found, conflict, status_not_empty, storage_unavailable, restart_required, disconnected, incompatible, outcome_unknown. Сообщения не подменяют код; недоступность native host и потеря ответа классифицируются также workflow агента, когда документ уже не может ответить.

Read-only tools имеют readOnlyHint=true. Delete-card/status имеют consequentialHint=true и требуют `confirm:true` плюс явное намерение пользователя в skill; поле не доказывает человеческое согласие. Возвращаемые пользовательские названия/описания отмечаются untrustedContentHint. Существующие UI-подтверждения не отменяются. Ошибки схемы, пустые имена, отсутствующие цели, межпроектный перенос и непустой статус различимы; успешные no-op отсутствующих целей не допускаются.

### 4. Сохранить описание и принятые доменные контракты

Внешний update_card остаётся командой трёх атрибутов. Добавить отдельную явно названную application/repository операцию этого намерения, возвращающую сохранённую Card. В одной транзакции перечитать актуальную карточку, проверить ID/связи, изменить только name/important/urgent, сохранить её текущий description и применить общий priority order. Общую логику записи/группировки переиспользовать с UI, которое продолжает принимать полный четырёхпольный CardInput.

Не читать description в browser adapter перед полным updateCard: конкурентная правка между чтением и записью будет потеряна. Не делать description optional, не присваивать '' при обновлении и не вводить старую перегрузку. Альтернатива обязательных полных четырёх полей расширила бы agent editing description и всё равно позволяла бы затереть конкурентный текст устаревшей копией; она не выбрана. Проверить реальную конкурентную правку description и agent attributes в обоих порядках.

create_card использует пустое описание, как компактная UI-форма. create_project получает только name, передаёт актуальный `{name,initialStatusNames:[]}` и создаёт пустую доску. Для background creation внутри общей операции явно сохранить прежнее предпочтение/маршрут; UI-создание с выбранным набором и remember=true остаётся атомарным по своим правилам. Не компенсировать уже завершённую запись отдельным восстановлением lastProjectId.

move_card строит ровно `{statusId,beforeCardId:null,expected:{statusId,important,urgent}}`. Ожидаемые поля получает агент из подтверждённой доски. Общая domain placement функция ставит карточку в конец её группы, не всей колонки, сохраняя id/описание/заметки; stale expected, чужой проект и отсутствующие цели отвергаются. Внешний anchor/reorder не добавляется. Перед apply сверить окончательные типы и results принятого DnD; не сохранять старую строковую сигнатуру.

### 5. Браузерное исполнение, guard и обновление экрана

Adapter получает зависимости из composition root после открытия storage и вызывает application через публичный API feature. Он не импортирует Dexie и не пишет таблицы напрямую. Проверки существования/принадлежности выполняются в транзакциях authoritative repository operation; не вводить check-then-write гонки. Изменяющие операции возвращают подтверждённые значения из границы записи, чтобы ошибка следующего чтения не уничтожала известный успех.

Общий mutation guard учитывает storage-ready, stale/restart, DnD commit/refresh recovery и conflicting pending writes. Различные agent mutations исполняются по одной; занятость возвращает conflict до dispatch, без очереди для будущего исполнения. Повтор того же in-flight requestId использует его Promise, а не начинает запись заново.

Background mutation сохраняет текущий catalogue/board/card route и независимые React drafts. Обновлять только актуальный context, не применять безусловно store-метод переключения доски. Если агентная мутация затронет/уничтожит текущую карточку с dirty fields/note draft, вернуть conflict до записи; force/discard параметра нет. Несвязанные операции не должны терять черновики при refresh. Ошибка чтения после commit даёт `saved:true` и отдельный view-refresh warning; повторяется только чтение. Сохранять смонтированный редактор/черновики, не превращать read failure в якобы отказ записи. Согласовать recovery/pending block с принятым DnD.

Успешная мутация вызывает существующий callback запроса persistent storage. Отказ записи оставляет подтверждённый snapshot прежним. Обычное UI-приложение и PWA/offline/update продолжают работать без host/API и без relay.

show_workspace при dirty draft или конфликтующем DnD/pending состоянии возвращает conflict без смены маршрута. При чистом состоянии проверяет projectId и применяет обычную app-навигацию/предпочтение, возвращая успех только после фактического перехода. Текущий requestLeave возвращает управление после запроса guard, поэтому одного await такого callback недостаточно для успешного результата. Видимость вкладки меняет host отдельно; после показа нельзя молча открыть другой storage context.

### 6. Bounded ledger, потеря ответа и отмена

После валидации session/input и pre-dispatch guards зарезервировать возрастающий requestId до первого await мутации. Одинаковые ID/tool/arguments делят pending Promise или возвращают cached result. Другие arguments с тем же ID — conflict. Хранить один active mutation и не более 64 завершённых ответов; high-water sequence остаётся после eviction. Старый ID, которого уже нет в журнале, отвергается без повторной записи. Сессия/журнал не переживают reload; старый sessionId не принимается новым документом.

Ожидание результата ограничено (начальный response timeout — 15 секунд). До dispatch можно вернуть disconnected/pre-dispatch без побочного эффекта. После dispatch timeout/abort/обрыв ответа означает outcome_unknown; cancel ожидания не равен rollback. Не освобождать общий pending guard до фактического завершения/подтверждённого abort операции только ради timeout. Продолжающаяся операция не превращается в replay/offline queue; итог фиксируется в журнале живой сессии.

Пока документ жив, adapter может вернуть структурированный outcome_unknown. Закрытая вкладка уже не может ответить: начатый host call, потерявший результат без доказанного pre-dispatch отказа, workflow агента трактует как unknown outcome. Он перечитывает актуальные данные и не повторяет автоматически мутацию с новым ID/сессией. При одинаковых именах невозможно утверждать, что конкретную запись создал потерянный вызов. Новая попытка требует явного решения с учётом фактического состояния. Read-only повтор не выдаётся за подтверждение мутации.

### 7. Skill, конечная приёмка и доставка

Через skill-creator подготовить репозиторный skill: выбрать/переиспользовать конкретную IAB-вкладку, открыть обычный app URL при её отсутствии, проверить native discovery/get_connection/contractVersion/ready, закрепить session, разрешить ID, выполнить команду и обработать errors/unknown outcome. Не запускать shell browser opener, stdio process или DOM CRUD. При unsupported host объяснить ограничение; при поддержке unshown tab использовать её, иначе честно сообщить о видимой внутренней вкладке. Для «покажи» сначала успешно show_workspace, затем host visibility того же tab.

Документировать установку skill в другие чаты без автоматического изменения глобальной конфигурации. Реальный new-chat walkthrough выполняется с пользователем: агент не может самостоятельно создать пользовательский чат без его отдельного явного запроса. Отсутствие такого walkthrough не выдаётся за успешную проверку.

До готового PR: contract/repository/state/fixture browser tests, реальное native исполнение task workflow на подготовленном кандидате в тестовом контексте, общий check и review. После закрытия реализации/OpenSpec и обычного PR→main→Pages: повторить native discovery/CRUD/UI/показ на production с disposable тестовыми данными и затем реальный пользовательский новый чат. Постпубликационная приёмка — отдельный обязательный release handoff, не checkbox, который невозможно честно завершить до merge/архива в том же PR. До неё отчёт различает проверенный код, PR, merge, deploy и непроверенный пользовательский workflow.

## Risks / Trade-offs

- [Native API/host изменяется] → feature detection, contractVersion, поддерживаемый host в QA; обычный UI независим, stdio fallback не обещается.
- [Вкладка выгружена или пользователь меняет контекст] → pinned tab/session, fresh discovery, bounded waits, no replay; browser-panel visibility=false не равна hidden-document guarantee.
- [Timeout после commit] → bounded ledger/high-water, неизвестный исход в host workflow, сверка сохранённых данных перед новой попыткой.
- [Description теряется или DnD нарушает порядок] → отдельный transactional attributes command, общий placement и конкурентные regression tests.
- [Background refresh теряет редактор или route] → targeted dirty/pending conflict, контекстное обновление и отдельный warning после commit.
- [Фикстура принимается за native proof или закрытие change за deploy] → отдельные записи candidate/production/user walkthrough с фактическими результатами.

## Migration Plan

1. Сохранить failed WS и успешную native feasibility evidence, явное одобрение транспорта; текущий gate пройден только для marker-only API поддерживаемого IAB.
2. После принятия DnD внедрить typed contracts, transactional application commands, native lifecycle/ledger, контекстный refresh и skill. Схема/данные IndexedDB не мигрируют.
3. Пройти pre-PR проверки кандидата и review, синхронизировать delta specs и архивировать завершённую реализацию в той же ветке; включить код/закрытие OpenSpec в один обычный PR и соблюсти required CI.
4. После merge/deploy проверить production task tools и UI, затем пользовательский new-chat walkthrough по release-handoff tasks. Сохранять честный pending статус внешних шагов; не создавать пользовательский чат самостоятельно.
5. При rollback отозвать page tools/вернуть исправленную сборку обычным PWA-путём. Нет Node process/global registration для удаления; task data остаются в прежнем браузерном хранилище. Откат не восстанавливает явно удалённые пользователем карточки/статусы.
