# Design

## Context

Причины изменения — в [proposal.md](proposal.md), требования — в [specs/static-checks/spec.md](specs/static-checks/spec.md).

Текущее состояние:

- `npm run check` = `check:architecture` → `vitest --run` → `node --test` (две проверки) → `test:e2e` (`npm run build` = `tsc -b && vite build`, затем Playwright). Типы проверяются только внутри сборки.
- Корневой `tsconfig.json` (`include: ["src"]`, `strict`, без `noUnused*`) — единственный проект, который видит `tsc -b`. `tsconfig.app.json` (с `noUnusedLocals`/`noUnusedParameters`, `lib: ES2022`) и `tsconfig.node.json` ни на что не ссылаются. Ручной прогон `tsconfig.app.json` даёт 4 ошибки: две — неиспользуемый `user` в `src/app/pwa/install-guidance.test.tsx`; две — `findLastIndex` и неявный `any` в `src/dev/dnd-sensor-probe.tsx` из-за `lib: ES2022`.
- Проверку типов не проходят `e2e/` (TS-помощники и `*.spec.ts`), `scripts/*.test.ts`, `vite.config.ts`, `vitest.config.ts`, `playwright.config.ts` и `build-define.ts`; `@types/node` не установлен. JS-файлы: `scripts/*.mjs`, `e2e/server.mjs`, `e2e/*.spec.js`.
- В каталоге репозитория лежат чужие рабочие деревья (`.claude/worktrees/*`), поэтому сканировать `.` целиком нельзя.
- Пробный прогон (oxlint 1.93.0 + oxlint-tsgolint 7.0.2007, stylelint 18 + config-recommended 19; 16 ноября 2026):
  - `correctness`: 337 нарушений, из них 271 — `vitest/require-mock-type-parameters`, около 20 — правила React (`refs`, `set-state-in-effect`, `exhaustive-deps`) и около 30 — правила vitest;
  - правила с учётом типов по `src`: 6 `no-floating-promises`, 1 `no-misused-promises`, 32 `no-unsafe-*`, 5 `no-deprecated`, 3 `no-unnecessary-type-assertion`, 1 `switch-exhaustiveness-check`, 1 `return-await`; около 1 с;
  - stylelint: 23 нарушения, в основном `no-descending-specificity` и один повтор селектора `.work-card`.

## Goals / Non-Goals

**Goals:**

- Один быстрый статический этап в начале `check`, который падает раньше сборки и e2e.
- Одни и те же tsconfig-проекты для `tsc` и для правил oxlint с учётом типов.
- Зафиксированные версии инструментов, совместимые с TypeScript 7.0.

**Non-Goals:**

- Форматирование и стилевые правила (изменение `add-code-formatter`).
- Перенос `scripts/check-architecture.mjs` в правила линтера.
- Проверка типов JS-файлов (`checkJs`); они только линтятся.
- Линтинг встроенных скриптов в HTML (`index.html`, `public/*.html`).

## Decisions

### 1. oxlint + oxlint-tsgolint для JS/TS

Выбор oxlint: правила с учётом типов на TS 7 (typescript-eslint поддерживает TS `>=4.8.4 <6.1.0`), нужные правила React, включая правила React Compiler (`react/refs`, `react/set-state-in-effect`), прогон по `src` около 1 с.

Отвергнутые варианты:
- ESLint + typescript-eslint с параллельным `typescript@6` через псевдоним npm — два компилятора с риском расхождения;
- Biome — правила промисов экспериментальные и работают на собственном выводе типов, а не на компиляторе.

Решение фиксируется в новом ADR со следующим свободным номером на момент слияния (`account-sync` тоже планирует ADR-0006).

Конфиг `.oxlintrc.json` в корне:

- `plugins`: `typescript`, `react`, `import`, `jsx-a11y`, `unicorn`, `oxc`, `promise`. Явный список заменяет набор по умолчанию.
- `categories`: `correctness: "error"`, остальные выключены.
- `rules` (уровень `error`):
  - промисы: `typescript/no-floating-promises`, `typescript/no-misused-promises`, `typescript/await-thenable`, `typescript/return-await`;
  - прочие правила с учётом типов: `typescript/only-throw-error`, `typescript/switch-exhaustiveness-check`, `typescript/no-unnecessary-type-assertion`, `typescript/no-deprecated`;
  - группа `no-unsafe-*`: `typescript/no-unsafe-assignment`, `-member-access`, `-argument`, `-call`, `-return`;
  - хуки: `react-hooks/rules-of-hooks` и `react-hooks/exhaustive-deps`, если они не входят в `correctness`.
- `options.typeAware: true`. `typeCheck` не включаем: типы проверяет `tsc` (решение 3).
- `overrides`:
  - для `**/*.test.{ts,tsx}` добавить плагин `vitest` и выключить `vitest/require-mock-type-parameters` (271 срабатывание, это требование к оформлению) и `typescript/unbound-method` (входит в `correctness` с учётом типов; в unit-тестах срабатывает на `expect(mock.method)`, где `this` не используется);
  - для `**/*.{js,mjs}` выключить группу `no-unsafe-*`: JS-файлы не проверяются на типы, и любое значение из `JSON.parse` или нетипизированного модуля в них — `any`. Правила промисов для JS остаются;
  - Playwright-тесты (`e2e/**`) плагин `vitest` не получают.

JS-файлы из `e2e/` и `scripts/` входят в `tsconfig.node.json` с `allowJs` без `checkJs`: `tsc` их не проверяет, но oxlint-tsgolint получает для них типы Node и находит потерянные промисы.
- Уровень `warn` не используется. Запуск с `--deny-warnings` и `--report-unused-disable-directives-severity=error`.

Запуск на явных путях: `oxlint src e2e scripts *.ts`. Так в проверку не попадают вложенные рабочие деревья и сгенерированные каталоги, и не нужно зависеть от того, как oxlint читает `.gitignore`.

### 2. stylelint для CSS

`stylelint` 18 и `stylelint-config-recommended` 19 — только правила, ловящие ошибки. В `.stylelintrc.json` включить `reportNeedlessDisables`, `reportInvalidScopeDisables` и `reportDescriptionlessDisables`: здесь линтер сам требует причину отключения правила. Запуск: `stylelint "src/**/*.css"`.

Biome-CSS отвергнут: это был бы третий инструмент с меньшим набором правил.

### 3. Проекты TypeScript и `tsc -b`

- `tsconfig.json` — общий файл без своих файлов: `"files": []` и `references` на `tsconfig.app.json` и `tsconfig.node.json`.
- `tsconfig.app.json`:
  - охват: `src`;
  - опции: `strict`, `noUnusedLocals`, `noUnusedParameters`, `noFallthroughCasesInSwitch`, `verbatimModuleSyntax`;
  - `lib`/`target` ES2024 вместо ES2022 — это убирает ошибку `findLastIndex`, а Node 24 и браузеры из цели сборки поддерживают ES2024.
- `tsconfig.node.json`:
  - охват: `e2e/**/*.ts`, `scripts/**/*.ts`, `vite.config.ts`, `vitest.config.ts`, `playwright.config.ts`, `build-define.ts`;
  - опции: `types: ["node"]` и те же строгие флаги.
- `typecheck` = `tsc -b`. Сборка остаётся `tsc -b && vite build` и после этапа `typecheck` проходит инкрементально (`*.tsbuildinfo` уже в `.gitignore`).
- `@types/node` фиксируется на мажорной версии 24 по `.nvmrc`.

Отвергнутый вариант — `oxlint --type-check`. Документация не говорит, какой tsconfig он берёт и как обрабатывает ссылки, а пробный прогон подхватил файлы вне проектов. `tsc` всё равно нужен сборке.

### 4. Порядок в `check`

`check` = `lint` → `typecheck` → `check:architecture` → `test:run` → `node --test …` → `test:e2e`. Скрипт `lint` запускает oxlint и stylelint (`lint:js && lint:css`), так что каждый можно запустить отдельно. Хук pre-push и CI вызывают `npm run check` и меняться не должны.

### 5. Отключение правил в коде

Формат: `// oxlint-disable-next-line <правило> -- <причина>` или `/* stylelint-disable-next-line <правило> -- <причина> */`. Отключение на весь файл запрещено.

- **stylelint** сам проверяет и наличие причины, и ненужные отключения.
- **oxlint** проверяет только ненужные отключения (`--report-unused-disable-directives-severity=error`). Наличие правила и причины проверяет ревью: в `REVIEW.md` добавляется пункт.

### 6. Политика исправлений

- **Потерянные промисы.** Сначала `await` или явная обработка ошибки. `void promise` допустим только для намеренного «запустил и забыл», если ошибка обрабатывается внутри; это по умолчанию разрешено правилом `ignoreVoid`.
- **`no-unsafe-*`.** Сужать `unknown` проверками или существующими схемами zod, не приводить к нужному типу через `as`.
- **Правила React Compiler** (`refs`, `set-state-in-effect`). Исправления могут менять поведение, поэтому каждое сопровождается прогоном затронутых unit- и e2e-тестов. Если покрытия нет — добавляется тест.
- **CSS.** Для `no-descending-specificity` переставлять селекторы. При разной специфичности это не меняет каскад. Повторы `.work-card` объединять с проверкой порядка объявлений и визуальной проверкой по `docs/agents/rules/visual-review.md`.

### 7. Пути риска

Добавить в `HIGH_RISK_PATHS` (`scripts/risk-paths.mjs`) файлы `.oxlintrc.json`, `.stylelintrc.json`, `tsconfig.json`, `tsconfig.app.json` и `tsconfig.node.json`.

### 8. Версии

Зафиксировать точные версии `oxlint`, `oxlint-tsgolint`, `stylelint` и `stylelint-config-recommended`. `oxlint-tsgolint` поддерживает конкретную версию TS 7, поэтому `typescript` и `oxlint-tsgolint` обновляются вместе.

## Risks / Trade-offs

- [Поддержка правил с учётом типов в oxlint неполная (около 60 из 62), и она моложе typescript-eslint] → используем только перечисленные правила; их наличие подтверждено списком реализованных правил tsgolint и пробным прогоном.
- [`no-unsafe-*` и правила React Compiler требуют правок с риском изменить поведение] → правки по одному правилу за раз, с тестами; при сомнении — точечное отключение с причиной.
- [Массовые исправления конфликтуют с `account-sync`] → изменение небольшое, сливается быстро; `account-sync` переносится поверх и исправляет свои новые нарушения.
- [oxlint не проверяет причину у своих отключений] → пункт в `REVIEW.md`. Если появится нужная опция, включить её.
- [Перестройка tsconfig меняет то, что видит Vite и Vitest] → `vite build`, `vitest` и Playwright проходят в составе `check`; псевдонимы и `define` задаются в конфигах Vite, а не в tsconfig.
- [`oxlint-tsgolint` отстанет от выхода TS 7.x] → версия TS фиксирована. Обновление TS — отдельный PR вместе с tsgolint.

## Migration Plan

Отдельной миграции нет. После слияния все ветки при следующем pre-push проходят новые проверки. Активные ветки (`account-sync`) переносятся поверх `main` и исправляют свои нарушения. Откат — revert PR.
