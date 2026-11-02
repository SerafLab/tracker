# Проверка перетаскивания и порядка карточек

Дата: 2 ноября 2026. Ветка: `codex/card-drag-and-drop`, принятая база `51aeffe16a141b7986b88ee2ac2e09992c60933f`. `add-card-details` принят и перенесён в main specs до начала этой реализации. Его описание/заметки/страница/защита черновиков сохраняются; delta DnD заменяет только Whole-card detail navigation и требования о стрелках/позиции межстатусного переноса. При sync последним применяется DnD, исторические planning artifacts details не изменяются.

## Ранний sensor gate

Использованы совместимые публичные `@dnd-kit/react`, `@dnd-kit/dom`, `@dnd-kit/collision` 0.5.3, React 19.3.0. Официальные источники: [React quickstart](https://dndkit.com/react/quickstart/), [PointerSensor](https://dndkit.com/extend/sensors/pointer-sensor/), [AutoScroller](https://dndkit.com/extend/plugins/auto-scroller/), [npm](https://www.npmjs.com/package/@dnd-kit/react). Проверены публичные типы установленного релиза: отдельные Distance/Delay activation constraints, `preventActivation`, конфигурируемые plugins/AutoScroller и DragOverlay. Legacy-пакеты не используются. Default Accessibility/KeyboardSensor исключены, чтобы `li` и ссылка не получали button-role/tabindex и Enter оставался обычным открытием; клавиатурное размещение обеспечивает меню.

Прототип доступен только на локальном dev-сервере с тестовыми данными: `http://192.168.10.4:4190/tracker/dnd-sensor-probe.html`. Проверка `node scripts/check-dnd-sensor-probe.mjs` прошла у исполнителя и повторно у основного агента: семантические link/menu, mouse threshold, click/Enter, drop/cancel/outside, следующий самостоятельный click. Настройки: mouse 5 px; touch только hold 250 ms/tolerance 5 px; `touch-action:auto`, без собственного touchmove-движка.

Пользователь получил список проверки для Chrome iPhone, Safari iPhone и Chrome Android и подтвердил: «всё хорошо, идем дальше». Это раннее подтверждение позволило перейти к окончательной интеграции. Модели устройств, версии ОС и браузеров пользователь не предоставил; они неизвестны и не заменены вымышленными значениями.

| Реальная среда раннего gate | Результат | Модель / ОС / версия браузера |
| --- | --- | --- |
| Chrome iPhone | Пользователь подтвердил общий список сценариев | Не предоставлены |
| Safari iPhone | Пользователь подтвердил общий список сценариев | Не предоставлены |
| Chrome Android | Пользователь подтвердил общий список сценариев | Не предоставлены |

## Автоматическая и визуальная проверка окончательного интерфейса

Chromium 156.0.8078.4, macOS, Playwright. Использованы отдельные браузерные контексты с тестовыми проектами, без пользовательских данных. Полный `E2E_PORT=4183 npm run check` прошёл: 189 unit/UI, 105 browser и 3 probe checks. Также `openspec validate add-card-drag-and-drop --strict`, `git diff --check` и повторный sensor smoke прошли. Проверка охватывает архитектуру, unit/UI, probe guards, TypeScript/production build, PWA precache и весь browser suite. Обычный `npm ci` выполнил `prepare` и настроил `.githooks`; обходов hook нет.

| Область | Проверка / результат |
| --- | --- |
| Контракт и транзакция | Domain/repository/use-case tests: начало/середина/конец группы, обе оси меню, anchor после исключения source, пустая группа/статус, no-op без put, stale source/flags, отсутствующие/чужие/self anchors, чужой проект. Отказы каждой стороны межстатусной записи и перестановки откатываются после повторного открытия. Схема v3 не изменена, ID/description/notes сохраняются. |
| Меню | RU/EN, первый/средний/последний/единственный peer и один статус. Шаги доступны только внутри группы. Меню «Переместить в…» добавляет в конец собственной группы, включая несоседний статус. После клавиатурного действия фокус по ID с preventScroll; Escape/outside работают. |
| Touch targets / длинные имена | RU/EN × 320/390/1280/1440. Верхнее меню 44×44 px, длинное непрерывное имя переносится без перекрытия, стрелок и нижней панели нет. Страница не получает горизонтальный overflow. |
| Активация и ссылка | Drag от названия, метки и свободной площади; menu не активирует drag. `li` остаётся семантическим, ссылка draggable=false; click/Enter открывают details. Эмулированные нативные быстрые swipes прокручивают обе оси, hold активирует перенос. |
| Проекция | Подтверждённый snapshot и card writes не меняются до drop. Точное место своей группы в текущем/другом статусе, clamp над чужими группами и пустой статус. Preview совпадает с сохранённым порядком. Overlay inert/aria-hidden, без кнопок и меню. |
| Autoscroll | На 390 px достигнут скрытый Empty, выполнен drop; на длинной странице подтверждён вертикальный autoscroll и Escape без записи. На время drag scroll-snap отключён: иначе браузер возвращал малые шаги AutoScroller. |
| Отмена | Escape, touchCancel, drop вне доски, no-op и замена подтверждённого snapshot очищают preview, не записывают карточки, не открывают details. Следующий отдельный click/tap работает. |
| Commit / refresh | State/UI/browser RU/EN: отказ commit сохраняет прежний snapshot; успешный commit с отказом read показывает отдельную ошибку и блокирует конфликтующие действия. Повторяется только чтение без новых card writes. Устаревший retry не заменяет более новую доску. |
| Совместимость с details | RU/EN browser: создание → описание/заметка → возврат → меню/drag → точная другая позиция → offline reload → Enter. Группы, признаки, описание и заметка сохранены. Полный набор регрессий details/guard/PWA выполнен. |

Реальные PNG сняты production UI в browser suite; просмотрены узкий русский 320 px, широкий английский 1440 px и активный индикатор 1280 px: обрезаний/перекрытий нет, меню видимо, разрешённый gap различим.

| Ширина | RU | EN |
| --- | --- | --- |
| 320 | [PNG](card-drag-screenshots/card-drag-ru-320.png) | [PNG](card-drag-screenshots/card-drag-en-320.png) |
| 390 | [PNG](card-drag-screenshots/card-drag-ru-390.png) | [PNG](card-drag-screenshots/card-drag-en-390.png) |
| 1280 | [PNG](card-drag-screenshots/card-drag-ru-1280.png) | [PNG](card-drag-screenshots/card-drag-en-1280.png) |
| 1440 | [PNG](card-drag-screenshots/card-drag-ru-1440.png) | [PNG](card-drag-screenshots/card-drag-en-1440.png) |

Индикатор и overlay: [RU 1280](card-drag-screenshots/gap-ru-1280.png), [EN 1280](card-drag-screenshots/gap-en-1280.png).

## Итоговая физическая приёмка — ожидается

Готовая доска на сохранённом LAN-сервере: `http://192.168.10.4:4190/tracker/`. Это отдельные локальные данные браузера. Ранний прототип не считается итоговой приёмкой готовой доски. Task 5.2 остаётся невыполненным до явного результата; требуется сохранить модель / ОС / точную версию браузера для каждого устройства.

Для Chrome iPhone, Safari iPhone и Chrome Android повторить G-01…G-07 из [ручного QA](../manual-visual-qa.md), особо: обычный tap, hold, быстрые обе оси до hold, отсутствие native drag/callout, autoscroll края доски/длинной страницы, drop и системная отмена без открытия, следующий tap, offline reload. Sync/archive и закрытие task 5.3 выполняет интегрирующий агент после физического gate.
