# Стабильность тестов

Отчёт изменения `stabilize-test-reliability`: issues [#50](https://github.com/SerafLab/tracker/issues/50) и [#56](https://github.com/SerafLab/tracker/issues/56), упавшие CI runs `42126912663`, `42198623498`, `42300826781`, `42304931039` (Back/Forward) и `42308847952` (touch). Правила, вытекающие из разбора, — в [testing.md](rules/testing.md).

Окружение локальных проверок: macOS (Darwin 23.2, arm64), Node 24.21.0, Playwright 1.64.0 с встроенным Chromium, общая машина с нагрузкой 4–30 от других сессий. Linux локально недоступен; Linux-подтверждение даёт только GitHub CI.

## Изоляция и диагностика

- `reuseExistingServer: false`. Сервер на занятом порту даёт явную ошибку `... is already used, make sure that nothing is running on the port/url ...`. Ограничение: слушатель, который принимает соединение и не отвечает, приводит к зависанию запуска, а не к ошибке.
- Отдельные checkouts разделяются через `E2E_PORT`; `dist/`, `test-results/`, `playwright-report/` относительны checkout.
- `retries: 0`, `trace: 'retain-on-failure'`, `preserveOutput: 'failures-only'`, HTML-отчёт. Встроенный trace Playwright 1.64 покрывает и контексты из `browser.newContext()`: проверено намеренными сбоями (контекст закрыт в `finally`, не закрыт, закрыт до основного сбоя); отдельный helper не нужен и конфликтует (`Tracing has been already started`).
- Оба workflow выгружают `playwright-report/` и `test-results/` при сбое (`browser-diagnostics-<run_id>-<run_attempt>`, 7 дней, `if-no-files-found: ignore`); сбой job и блокировка deploy сохраняются.

## Native close и rapid Back (#50, #56)

**Причина не доказана; issues не считаются исправленными по локальным данным.**

- Трасса popstate/hashchange и состояния `onHistory` (`src/app/app.tsx`) на обычном прогоне и под стрессом: история и guard ведут себя корректно — один guard, восстановление позиции карточки, после Save — один переход на доску, Forward открывает карточку. Дефекта приложения не найдено, приложение не менялось.
- Исходная цепочка с исходными ожиданиями: ~200 прогонов под CDP `Emulation.setCPUThrottlingRate` 6x/10x/25x, до 8 workers и с CPU-нагрузкой — 0 сбоев. Случайные задержки Stay/Forward внутри страницы (~940 циклов при 4x) — 0 сбоев.
- Доказанный механизм симптома: Forward, отправленный, когда адрес уже доски, а панель карточки ещё смонтирована в режиме редактирования, возвращает адрес карточки, но `.detail-text` не появляется — ровно ошибка из issues. Воспроизводится намеренно ранним Forward (~1/25 без throttling, 12/12 при 4x).
- Не доказано, почему CI дошёл до этого состояния, если старый тест ждал адрес и скрытие `.card-detail`. Гипотеза: `page.url()` (`toHaveURL`) следует событиям навигации на стороне браузера и может отставать от same-document шагов истории.
- Изменение (`e2e/card-details.spec.ts`): восстановлен комбинированный сценарий, удалённый в `4d32e1d`, и добавлены отдельные регрессии native-close cancel и rapid Back со Stay / Save / Discard / ошибкой сохранения (инъекция через `IDBObjectStore.put`). Ожидания: адрес внутри страницы, guard 1→0, скрытая панель и отрисованная доска перед Forward; проверки Forward, reload, неизменного черновика и `history.length`. В `card-details.test.tsx` два возврата фокуса после Escape ждут через `waitFor`.

## Touch-прокрутка (run 42308847952)

- Доказано: доска использует `scroll-snap-type: x proximity` (`src/styles.css`), начальный `scrollLeft` после `scrollIntoViewIfNeeded` уже 20 — snap-позиция первой колонки. Свайп с малой инерцией возвращается к 20; это значение из CI. Воспроизведено отправкой событий без пауз под 4x throttling: 12/24. Старая проверка `scrollLeft > 20` не отличала «не прокрутилось» от «вернулось к snap».
- Доказано: `page.clock.pauseAt(Date.now() + 50)` сам нестабилен под нагрузкой (`Cannot fast-forward to the past`: 1/24 при 4x и 3 workers, 15/16 при 6x и 8 workers).
- Не доказано, что CI упал именно через snap-back: trace того запуска не сохранился, исходный тест локально не падал. Устаревший `scrollend` программной прокрутки наблюдался после регистрации старого глобального слушателя, но сбоя не вызвал.
- Изменение (`e2e/card-drag.spec.ts`): часы не замораживаются; касание проверяется на `.work-card`; слушатели `scroll`/`scrollend` ставятся на целевой scroller до первого touch-события и снимаются после жеста; успех — пиковое смещение от измеренного старта в направлении свайпа ≥ `min(travel / 2, оставшийся диапазон)` (touch slop ~15 px, наблюдалось ~195 из 210 px); следующий жест ждёт `scrollend` после реального движения. Отсутствие движения проваливает проверку (`Received: 0`). Проверки no-write/no-open при свайпе, hold, drop, cancel и tap сохранены.
- Ограничение: hold-таймер (250 мс) больше не защищён замороженными часами. Его отменяет первый touchMove за пределами slop (pointercancel через 1–5 мс после touchstart); задержка доставки первого touchMove дольше 250 мс превратила бы свайп в drag.

## Связанная RTL-нестабильность

`src/app.test.tsx` «dismisses the … menu with an outside … press» упал 1 раз из 474 под нагрузкой: после нажатия вне меню диалог и фокус проверялись синхронно. Теперь тест ждёт диалог и фокус в поле.

## Проверки

| Проверка | Результат |
|---|---|
| `npx playwright test e2e/card-details.spec.ts --repeat-each=5 --retries=0` | 65/65 (после интеграции) |
| Изменённые rapid-Back тесты и исходная цепочка, 6x throttling, `--repeat-each=8 --workers=4` | 48/48 |
| `npx playwright test e2e/card-drag.spec.ts --repeat-each=5 --retries=0` | 75/75 (после интеграции) |
| Первый свайп при 4x throttling, `--repeat-each=24 --workers=4` | 24/24 |
| `npx vitest --run --repeats=10` для `card-details.test.tsx` и затронутого теста `app.test.tsx` | пройдено |
| Полный `npm run check` на итоговом состоянии | см. PR |

Локальные прогоны не заменяют Linux CI. Issues #50 и #56 остаются открытыми до подтверждения в CI; при новом сбое разбор начинается с артефакта `browser-diagnostics-*`.
