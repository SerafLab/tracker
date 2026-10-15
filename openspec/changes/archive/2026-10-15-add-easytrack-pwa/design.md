# Design

## Context

См. мотивацию в [proposal.md](proposal.md) и поведенческий контракт в
[offline-installed-app spec](specs/offline-installed-app/spec.md). Сейчас Vite
собирает React-приложение с `base: '/tracker/'`, а GitHub Pages публикует его
как статический `dist`. `package.json` пока не содержит PWA или browser-test
зависимостей. `ProjectBoardDatabase` — Dexie schema v1; `App` открывает её
один раз и передаёт store в presentation-слой.

ADR-0003 уже выбрал `vite-plugin-pwa`, Workbox `generateSW`, precache app shell
и подтверждаемую активацию обновлений. Этот change реализует это решение, а не
заменяет его. Незавершённый change `redesign-project-board-ui` меняет те же
presentation-экраны, поэтому реализация PWA должна начинаться с актуального
`main` и добавлять свои controls поверх его финальной структуры, не возвращая
старый UI.

## Goals / Non-Goals

**Goals:**

- Сохранить static-only публикацию GitHub Pages и сделать production-сборку
  устанавливаемой и пригодной для повторного офлайн-запуска.
- Отделить код жизненного цикла PWA от домена доски и от IndexedDB repository,
  оставив все операции с проектами local-first.
- Сделать install, update, stale-storage и storage-limit состояния доступными,
  предсказуемыми и проверяемыми в браузере.

**Non-Goals:**

- Не менять schema v1, доменные use cases, формат hash-маршрутов или текущие
  проектные данные.
- Не добавлять server/API, аккаунты, background sync, Web Push, runtime cache,
  offline-кеш внешних ссылок, export/import или синхронизацию между устройствами.
- Не переносить данные между Safari и установленным iOS/iPadOS web app и не
  обещать сохранность после очистки browser/site data.

## Decisions

### Manifest и локальная идентичность EasyTrack

`vite-plugin-pwa` генерирует manifest для `base: '/tracker/'` с `name` и
`short_name` `EasyTrack`, `start_url` и `scope` `/tracker/`, `display:
'standalone'`, theme/background colours из текущего visual system. В `public/`
появятся локальные PNG-иконки 192×192 и 512×512, включая maskable вариант, и
Apple touch icon. В document title и видимом brand-label используется
EasyTrack, с пояснением «трекер личных проектов» там, где необходимо сохранить
контекст.

Иконки не загружаются из сети: это требуется для первого offline reopen и не
создаёт зависимости от внешнего CDN. Полноценный brand system или icon package
не нужен; небольшой оригинальный геометрический знак достаточен для launcher.

### Генерируемый precache без runtime caching

В `vite.config.ts` добавляется `VitePWA` после React plugin. Режим
`generateSW` precache-ит HTML, JS, CSS, manifest, иконки и прочие локальные
production assets в области `/tracker/`; navigation fallback остаётся внутри
этого пути. Workbox не получает `runtimeCaching`: EasyTrack не использует API,
а внешние ссылки должны оставаться сеть-зависимыми.

`injectManifest` и ручной service worker отклонены: у приложения нет
нестандартной cache policy, а собственный worker увеличил бы код, тестовую
поверхность и вероятность ошибки обновления. Runtime caching отклонён, потому
что мог бы показать устаревший сторонний контент и размыть границу данных
проекта (IndexedDB) и файлов приложения (Cache Storage).

### Изолированный PWA runtime в app-layer

Новый app-level PWA module инкапсулирует browser APIs и предоставляет React UI
состояния: доступный install prompt, установлена ли PWA, готова ли новая версия,
требуется ли restart после смены базы и открыт ли install/help dialog. Он
использует registration API плагина с prompt-стратегией, поэтому initial render
и тесты не зависят от глобального service worker.

Для Chromium обработчик `beforeinstallprompt` сохраняет одно deferred событие
и вызывает native prompt только по явному действию. Если prompt отсутствует,
постоянный control открывает platform-specific инструкцию; закрытие не
переоткрывает её в той же сессии. На iOS/iPadOS инструкция показывает
«Поделиться → На экран “Домой”» и предупреждает, что установленная иконка имеет
собственное storage context. Она советует установить EasyTrack до создания
первых проектов, а не пытается переносить данные из Safari.

Встраивать PWA API в `ProjectBoardStore`, domain или Dexie repository нельзя:
установка и lifecycle браузера не являются поведением проекта. UI размещается
в application shell и использует существующую доступную dialog/menu систему
после её завершения в UI-change.

### Controlled service-worker update

Plugin используется с prompt registration. Когда worker ждёт активации,
application shell показывает persistent доступное сообщение «Доступно
обновление» с действиями «Обновить» и «Позже». Только «Обновить» вызывает
`skipWaiting`/reload через registration API. Dismissal скрывает конкретное
сообщение, но не изменяет текущий worker и не вызывает auto-reload.

Автоматическое `skipWaiting` отклонено: оно могло бы сменить JavaScript пока
пользователь редактирует данные и нарушило бы ADR-0003. Отдельный экран
версий/SHA не добавляется этим change: пользовательская задача — безопасно
применить готовое обновление, а не управлять релизами.

### Guard для устаревшего IndexedDB-клиента

`ProjectBoardDatabase` подписывается на Dexie `versionchange`. App runtime
закрывает database и переводит session в `restart-required`. В этом состоянии
текущий подтверждённый board/catalogue можно оставить видимым, но все mutation
controls disabled и store получает guard, исключающий вызов use cases до
перезапуска. Alert объясняет причину и предлагает единственное action
«Перезапустить», выполняющее reload.

В этом change schema не меняется, поэтому browser-level test искусственно
поднимает более новую Dexie schema в другой context, чтобы проверить путь.
Guard реализуется сейчас, чтобы будущая migration не позволила старому bundle
незаметно записывать данные. Перезагрузка без сообщения отклонена: пользователь
теряет контекст и не понимает, почему действие оборвалось.

### Persistent storage как best-effort

После первого успешно подтверждённого mutation app-layer однократно вызывает
`navigator.storage.persist()` при наличии API. Результат не показывает success
toast и не меняет доступность приложения; rejection/exception тихо фиксируется
как best-effort отказ. Install help объясняет локальность данных, отсутствие
синхронизации и риск удаления при clear site data.

Запрос при первом рендере отклонён: он не связан с пользовательской ценностью и
может не пройти browser heuristics. Не создавать собственный «гарантийный»
флаг: Storage API не может защитить от явной очистки пользователем.

### Проверка production-поведения

Добавляется Playwright Chromium suite, запускаемый против production build через
локальный HTTPS-like secure test origin или localhost, разрешающий service
worker. Он проверяет manifest/icon URLs, регистрацию worker и офлайн-сценарий с
настоящим IndexedDB. Для update test fixture последовательно раздаёт две
production-сборки под тем же `/tracker/` origin: первая создаёт active worker,
вторая становится waiting, после чего test подтверждает отсутствие reload до
явного действия и activation после него. Проверка stale Dexie клиента получает
отдельный controlled fixture.

`test:e2e` входит в `npm run check`, CI устанавливает Chromium до запуска
checks, а deploy smoke расширяется проверкой manifest и service-worker файла.
Автоматизация WebKit не заменяет физическую проверку: release checklist
фиксирует версии Safari/iOS и Chrome/Android, установку, offline reopen,
создание/изменение данных без сети, defer/apply update и iOS storage isolation.

## Risks / Trade-offs

- [iOS/iPadOS installed app имеет отдельное storage от Safari] → install help
  предупреждает до начала работы; перенос откладывается до отдельного
  export/import change.
- [Браузер отклоняет persistent storage или удаляет best-effort storage] →
  приложение продолжает работать, документация честно описывает риск; backup
  остаётся следующим change.
- [Worker cache или base path неверны на Pages] → bundle и e2e проверяют
  `/tracker/` manifest/scope/precache, deployment smoke проверяет опубликованные
  файлы.
- [Новый worker активируется в середине редактирования] → prompt strategy не
  вызывает activation без действия пользователя.
- [Старая вкладка пишет в новую database schema] → versionchange закрывает
  соединение, блокирует mutation controls и требует restart.
- [PWA-controls конфликтуют с незавершённым UI change] → перед implementation
  актуализировать с `main`; integration tests проверяют существующие project
  flows вместе с новым shell.

## Migration Plan

1. Перед реализацией завершить либо интегрировать актуальный UI-change и
   подтвердить production baseline (`npm run check`).
2. Добавить manifest/icons, plugin и prompt registration; проверить generated
   `dist` и первый online activation до включения offline assertions.
3. Добавить app-layer install/update/storage/stale-state UI, затем Playwright,
   CI и published smoke.
4. После merge GitHub Pages отдаёт worker и manifest. В ручной приёмке сначала
   установить EasyTrack, затем создать тестовый проект внутри установленного
   storage context и выполнить offline/reopen/update checklist на iPhone и
   Android.
5. Rollback при schema v1 — повторная публикация предыдущего static bundle:
   она не меняет IndexedDB records. После будущей schema migration применяется
   только forward fix или compatible backup, как определено ADR-0002.

## Open Questions

Нет.
