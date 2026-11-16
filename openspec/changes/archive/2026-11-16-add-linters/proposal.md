# Proposal

## Why

В проекте нет линтеров: потерянные промисы в асинхронных потоках IndexedDB и перетаскивания, нарушения правил хуков React и утечки `any` находит только ревью. Проверка типов тоже неполна: `tsconfig.app.json` со строгими флагами никуда не подключён и даёт 4 ошибки, а `e2e/`, `scripts/` и конфиги в корне не проверяются вовсе. Проект использует TypeScript 7.0, поэтому ESLint с typescript-eslint (поддерживает TS `<6.1`) не подходит для правил с учётом типов.

## What Changes

- Подключить oxlint с `oxlint-tsgolint` (правила с учётом типов на TS 7) для TS/TSX/JS/MJS в `src/`, `e2e/`, `scripts/` и конфигах в корне. Набор правил — только правила, ловящие ошибки: категория `correctness`, правила хуков и React Compiler, правила промисов и `no-unsafe-*`. Стилевых правил нет.
- Подключить stylelint с `stylelint-config-recommended` для CSS.
- Перестроить конфигурацию TypeScript: корневой `tsconfig.json` со ссылками на проект приложения (`src/`) и проект Node-кода (`e2e/`, `scripts/`, конфиги в корне, `@types/node`). Удалить неподключённые `tsconfig.app.json`/`tsconfig.node.json` в их текущем виде. Проверка типов выполняется отдельным шагом `tsc -b`.
- Все нарушения — уровень `error`. Все текущие нарушения линтеров и ошибки типов исправляются в этом изменении; предупреждений и базовой линии нет.
- Отключение правила в коде допускается только для конкретного правила, точечно и с указанием причины.
- Линтинг и проверка типов идут первыми шагами `npm run check`, поэтому их получают хук pre-push и CI без отдельной настройки.
- Конфиги линтеров и `tsconfig*.json` добавляются в `HIGH_RISK_PATHS`.
- Новый ADR о выборе oxlint и stylelint вместо ESLint.
- `scripts/check-architecture.mjs` не меняется.
- Вне рамок: форматтер (изменение `add-code-formatter`), pre-commit хуки и lint-staged, категория `suspicious` и стилевые правила.

## Capabilities

### New Capabilities

- `static-checks`: обязательные статические проверки исходного кода — линтинг JS/TS и CSS, проверка типов, охват файлов, блокировка отправки и слияния при ошибке, правила локального отключения правил.

### Modified Capabilities

<!-- Нет. -->

## Impact

- Новые dev-зависимости: `oxlint`, `oxlint-tsgolint`, `stylelint`, `stylelint-config-recommended`, `@types/node`.
- `package.json` (скрипты `lint`, `lint:css`, `typecheck`, порядок в `check`), `tsconfig*.json`, новые конфиги `.oxlintrc.json` и `.stylelintrc.json`, `scripts/risk-paths.mjs` — пути из `HIGH_RISK_PATHS`: PR потребует метки `human-approved`.
- Исправления в `src/`, `e2e/`, `scripts/` (около 60 нарушений correctness, около 60 нарушений правил с учётом типов, 4 ошибки типов плюс ошибки, которые проявятся после подключения `e2e/` и `scripts/` к проверке типов) и в `src/styles.css`, `src/dev/dnd-sensor-probe.css` (23 нарушения).
- Документация: `README.md`, `docs/technical-plan.md`, `docs/agents/rules/testing.md`, новый ADR в `docs/adr/`.
- Возможен конфликт исправлений с идущим изменением `account-sync`.
