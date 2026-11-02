# Tasks

Текущий native gate подтверждает только marker-only feasibility и выбор транспорта. Task API, skill, candidate/production task workflows и пользовательский новый чат ещё не реализованы/не проверены. Failed WS и успешная native история сохраняются в `docs/agents/mcp-browser-qa.md`.

## 1. Подтверждённый транспорт и решение

- [x] 1.1 Сохранить фактический failed production HTTPS→loopback WS gate и его ограничения без подмены localhost-тестами; проверить существующую запись `docs/agents/mcp-browser-qa.md`, где отсутствие handshake не выдаётся за успех.
- [x] 1.2 Подтвердить native WebMCP feasibility на неизменном production origin: фактические discovery/echo/store_marker/saved:true, browser-panel visibility=false и close/reopen/read того же marker в реальном IAB Chrome156; проверить QA record, PR23 `ae3dd32`, deploy/smoke и реальный снимок, не приписывая документу hidden execution или task CRUD.
- [x] 1.3 Получить и зафиксировать явный выбор пользователя от 2026-11-02 «Да, реализовать WebMCP» вместо Node/stdio MCP; сверить proposal/design с этим решением и отличать одобрение транспорта от готовности основной интеграции.

## 2. Typed контракты и authoritative операции

- [x] 2.1 Сверить принятый результат DnD и зафиксировать используемые CardPlacement/result/pending-recovery контракты без старой строковой сигнатуры; определить общие session/input/result/error schemas всех 14 tools из design и проверить contract tests на типы, unknown fields, defaults, discovery и отсутствие project-deletion/note/description/preset/disconnect tools.
- [x] 2.2 Устранить успешные no-op отсутствующих целей и обеспечить транзакционные проверки ID/принадлежности и возврат подтверждённых результатов в нужных application/repository операциях; repository tests должны различать not_found, conflict, status_not_empty, unchanged и rollback, включая конкурентную запись без orphan records.
- [x] 2.3 Добавить отдельную явную attributes-команду update_card для name/important/urgent с сохранением актуального description ВНУТРИ той же транзакции и общей priority logic с UI; тестами конкурентных description/attributes операций в обоих порядках проверить отсутствие перезаписи описания/заметок, полную сохранность четырёхпольного UI CardInput и отсутствие optional/совместимой перегрузки.
- [x] 2.4 Адаптировать name-only create_project к явному `{name,initialStatusNames:[]}` и remember:false внутри общей операции/транзакции; проверить пустую agent-доску, сохранение прежних route/preference при каталоге и открытой доске, rollback, отсутствие компенсационной второй записи и сохранение UI atomic preset/remember=true поведения. create_card должен подтверждать description:'' и defaults обоих flags тестами.
- [x] 2.5 Адаптировать move_card(cardId,statusId,expected) к `{statusId,beforeCardId:null,expected}` принятого DnD; domain/repository tests должны проверять append собственной группы, dense order, saved/unchanged, stale expected, чужой проект, отсутствующие цели, сохранение description/notes и отсутствие внешнего anchor/reorder.
- [x] 2.6 Добавить browser command adapter через публичный API feature, storage-ready gate и общий stale/mutation guard; unit/state tests должны подтверждать ID targeting при одинаковых именах, отсутствие Dexie imports/прямой записи в adapter, ошибки записи без ложного успеха и запрет мутаций после versionchange.
- [ ] 2.7 Описать фактическую таблицу tools, schemas, session metadata и error/result envelopes в `docs/agents/mcp-integration.md`; сверить каждый пример contract tests, отсутствие stdio/relay setup и отдельной task database, различие подтверждённого результата и host exception.

## 3. Native регистрация, document binding и bounded вызовы

- [x] 3.1 Подключить native page-tool registration и read-only get_connection в composition root с sessionId/contractVersion/state/route/lastMutationSequence; fixture/unit tests должны покрыть opening/ready/storage_unavailable/restart_required, отсутствие API, неподдерживаемую версию и независимую обычную работу приложения без Node SDK/relay.
- [x] 3.2 Реализовать attempt-local lifecycle с проверками до/после await регистрации, отзывом частичной попытки и cleanup/pagehide/BFCache/reload; deferred-registration/StrictMode/browser tests должны исключать позднюю регистрацию старой сессии, дубли и приравнивание unregister к rollback/in-flight execution abort. Задокументировать свежую discovery после смены lifetime.
- [x] 3.3 Проверять ожидаемый sessionId и не расширять native origin exposure; tests двух документов/старого handle/reload должны подтверждать отказ до task access при неверной/истёкшей сессии, один адресат вызова и отсутствие silent replacement/fan-out, не обещая глобального relay executor или аутентификации через session ID.
- [x] 3.4 Реализовать один active mutation, 64 completed results, возрастающие requestId/high-water и bounded response wait по design; tests должны покрыть shared pending duplicate, cached response, разные arguments с тем же ID, eviction/старый ID без новой записи, busy conflict до dispatch, отсутствие offline queue и сброс/отказ старой сессии после reload.
- [ ] 3.5 Добавить различение pre-dispatch отказа, timeout/abort после dispatch, late commit и потерянного native host ответа; fault tests и руководство должны подтверждать outcome_unknown, сохранение pending guard до фактического конца, отсутствие автоматического replay и невозможность обещать structured reply после закрытия документа.

## 4. Подтверждённый UI, черновики и явная навигация

- [x] 4.1 Реализовать контекстное обновление catalogue/board/card после commit без неявной навигации, успешный persistent-storage callback и saved:true/view-warning при read failure; state/RTL tests должны покрыть текущую доску, другой проект, background project creation и повтор только чтения без повторной мутации.
- [x] 4.2 Согласовать UI/agent/DnD pending-recovery guard и dirty-editor conflict до записи; тестами проверить отказ конфликтующего update/delete/move текущей dirty карточки и отсутствие потери независимых field/note drafts или смонтированного редактора при несвязанной мутации/ошибке refresh.
- [x] 4.3 Реализовать show_workspace через checked/awaitable обычную навигацию с фактической проверкой route/workspace и предпочтения; browser/state tests должны проверять каталог/доску по ID, not_found, dirty/pending conflict без смены route/preference, отсутствие ложного успеха после void requestLeave и отсутствие повторных history entries при повторном requestId.
- [ ] 4.4 Прогнать offline/update/restart и отсутствие native API в обычном приложении; browser/UI regressions должны сохранять origin, IndexedDB schema, установленную офлайн-работу и принятую защиту черновиков/PWA без relay. Руководство должно точно отличать unshown browser panel от hidden/закрытого документа.

## 5. Skill и документы поддерживаемого workflow

- [ ] 5.1 Через skill-creator создать репозиторный EasyTrack skill для pinned browser/tab/session, discovery/get_connection/version/ready, разрешения ID и native CRUD/show; validator и сценарии должны покрыть неоднозначный проект, отсутствие молчаливого создания, явное удаление/confirm:true, stale handles, outcome_unknown и unsupported host без DOM CRUD/внешнего браузера/stdio.
- [ ] 5.2 Дополнить README и `docs/agents/mcp-integration.md` установкой skill в других чатах и точными шагами поддерживаемого native host; пройти доступные шаги инструкции, не меняя глобальную конфигурацию и не создавая пользовательский чат. Отдельно описать, что настоящий new-chat walkthrough требует пользователя или его отдельного явного запроса на создание чата.
- [ ] 5.3 Обновить продуктовые границы и ADR native document-bound интеграцией, сохранив исходное failed WS и successful native marker evidence; проверить отсутствие обещаний task/core/new-chat readiness до их фактической приёмки и подготовить QA record с отдельными candidate/production/user-walkthrough состояниями.

## 6. Pre-PR приёмка реализации

- [x] 6.1 Добавить интеграционный native-contract host fixture → page adapter → IndexedDB → UI сценарий всех tool операций, description preservation, append placement, изоляции, потерь ответа и отказов; test names/QA должны явно называть fixture и не выдавать её за native availability proof.
- [ ] 6.2 Проверить фактический native task workflow на подготовленной candidate-сборке в отдельном тестовом браузерном контексте: discovery/get_connection, создание проекта/статусов/карточек, чтение/изменение/перенос/разрешённое удаление, UI agreement, show и reload. Записать реальный host/version/visibility и границу candidate-проверки; не подменять ею production task acceptance.
- [ ] 6.3 Выполнить `npm run check`, strict OpenSpec validation и diff check; проверить architecture boundaries, типы/production bundle, unit/UI/contract/browser tests, отсутствие Node transport dependencies и обхода pre-push/CI. Исправить все ошибки до успешного результата.
- [ ] 6.4 Получить независимый review соответствия спецификации и объединённым CardInput/presets/notes/deletion/DnD контрактам; устранить существенные замечания и подготовить проверенный implementation result для синхронизации/архивирования и одного PR по правилам репозитория.

## Release handoff после pre-PR приёмки

Это обязательные последующие шаги доставки, а не checkbox реализации, который можно честно закрыть до merge в том же PR. Они **ещё не пройдены**. В итоговом отчёте их состояние указывается отдельно; закрытие planning/code checklist не означает публикацию или успешный пользовательский walkthrough.

1. После принятия реализации синхронизировать дельту в main specs и архивировать change в той же ветке с кодом. Отправить один готовый PR, дождаться required GitHub checks/защиты main, выполнить разрешённый squash merge и подтвердить Pages deployment/smoke; hook/CI не обходить.
2. На опубликованном обычном EasyTrack в реальном поддерживаемом IAB повторить native task discovery/ready/CRUD/UI agreement/show/reopen/unshown-call на явно разрешённых disposable тестовых данных. Marker-only страница и localhost fixture не заменяют этот шаг. Записать реальный результат, версии и ограничения в QA; не заявлять успех до ответа/commit и не повторять неизвестную мутацию.
3. Передать пользователю готовую инструкцию установки skill и конкретный сценарий нового чата: открыть приложение из закрытого состояния, разрешить ID и добавить карточку, проверить показ, unshown-вызов и повторное открытие. Пользователь открывает чат либо отдельно явно просит создать его; агент не делает это автономно. Пока walkthrough не выполнен, записать его как pending/user-required, а не passed.
4. Обновить QA фактическими production и user-walkthrough результатами; различать local/candidate verified, PR waiting, merged, deployed и отдельно проверенный пользовательский workflow. Если host/API/права или участие пользователя недоступны, сообщить точное оставшееся препятствие без выдуманного успеха или подмены browser/origin.
