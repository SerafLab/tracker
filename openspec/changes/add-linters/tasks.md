# Tasks

## 1. Проекты TypeScript и проверка типов

- [x] 1.1 Добавить `@types/node` (мажорная версия 24) и перестроить tsconfig по решению 3 design: общий `tsconfig.json` (`files: []`, `references`), `tsconfig.app.json` (`src`, ES2024, строгие флаги), `tsconfig.node.json` (`e2e/**/*.ts`, `scripts/**/*.ts`, конфиги в корне, `types: ["node"]`). Проверить: `npx tsc -b --listFilesOnly` перечисляет файлы из `src`, `e2e`, `scripts` и конфиги в корне и не перечисляет `.claude/`, `dist/` и `node_modules/` (кроме `.d.ts`).
- [x] 1.2 Исправить все ошибки `tsc -b`: 4 известные (`install-guidance.test.tsx`, `dnd-sensor-probe.tsx`) и новые в `e2e/`, `scripts/` и конфигах. Проверить: `npx tsc -b` завершается с кодом 0; `npm run test:run` проходит.
- [x] 1.3 Добавить скрипт `typecheck` (`tsc -b`) в `package.json`. Проверить: намеренная ошибка типа в `e2e/storage-state.ts` роняет `npm run typecheck`, после её отката команда проходит.

## 2. oxlint

- [x] 2.1 Добавить точные версии `oxlint` и `oxlint-tsgolint`, создать `.oxlintrc.json` по решению 1 design (плагины, `correctness`, перечисленные правила с учётом типов, `typeAware`, `overrides` для `*.test.*`) и скрипт `lint:js` (`oxlint --type-aware --deny-warnings --report-unused-disable-directives-severity=error src e2e scripts *.ts`). Проверить: `npm run lint:js` запускается без ошибок конфигурации и выводит нарушения по правилам с учётом типов (например, `typescript/no-floating-promises`).
- [ ] 2.2 Исправить нарушения правил `vitest/*`, `eslint/*`, `unicorn/*`, `promise/*` и `import/*`. Проверить: в выводе `npm run lint:js` нет нарушений этих групп; `npm run test:run` проходит.
- [ ] 2.3 Исправить нарушения правил React (`react/refs`, `react/set-state-in-effect`, `react-hooks/exhaustive-deps` и другие) по политике решения 6 design. Если затронутое поведение не покрыто тестами, добавить тест. Проверить: в выводе `npm run lint:js` нет нарушений `react*`; `npm run test:run` и e2e-тесты затронутых сценариев проходят.
- [ ] 2.4 Исправить нарушения `no-floating-promises`, `no-misused-promises`, `await-thenable`, `return-await` и `only-throw-error` по решению 6 design. Проверить: в выводе `npm run lint:js` нет этих нарушений; тесты затронутых модулей проходят.
- [ ] 2.5 Исправить нарушения `no-unsafe-*`, `no-deprecated`, `no-unnecessary-type-assertion` и `switch-exhaustiveness-check`, сужая `unknown` проверками или схемами zod. Проверить: `npm run lint:js` завершается с кодом 0; `npm run test:run` проходит.
- [ ] 2.6 Проверить поведение по спецификации `static-checks`:
  - намеренный незавершённый промис в `e2e/card-helpers.ts` роняет `lint:js`;
  - неиспользуемая переменная в `scripts/backup-fixtures.mjs` роняет `lint:js`;
  - лишний `// oxlint-disable-next-line` роняет `lint:js`;
  - изменение в форматировании (точка с запятой) не роняет;
  - после отката всех проб команда проходит.

## 3. stylelint

- [x] 3.1 Добавить точные версии `stylelint` и `stylelint-config-recommended`, создать `.stylelintrc.json` с `reportNeedlessDisables`, `reportInvalidScopeDisables` и `reportDescriptionlessDisables`, добавить скрипт `lint:css` (`stylelint "src/**/*.css"`). Проверить: `npm run lint:css` выводит текущие 23 нарушения.
- [ ] 3.2 Исправить нарушения в `src/styles.css` и `src/dev/dnd-sensor-probe.css` по решению 6 design: перестановки селекторов и объединение повтора `.work-card`. Проверить:
  - `npm run lint:css` завершается с кодом 0;
  - затронутые экраны доски и карточки проверены визуально по `docs/agents/rules/visual-review.md`, в отчёте указано, что именно просмотрено;
  - отключение правила без причины (`/* stylelint-disable-next-line no-duplicate-selectors */`) роняет `lint:css`.

## 4. Включение в обязательную проверку и защита конфигурации

- [ ] 4.1 Добавить скрипт `lint` (`npm run lint:js && npm run lint:css`) и задать порядок `check`: `lint` → `typecheck` → `check:architecture` → `test:run` → `node --test …` → `test:e2e`. Проверить: намеренное нарушение линтера роняет `npm run check` до запуска vitest.
- [ ] 4.2 Добавить `.oxlintrc.json`, `.stylelintrc.json`, `tsconfig.json`, `tsconfig.app.json` и `tsconfig.node.json` в `HIGH_RISK_PATHS` (`scripts/risk-paths.mjs`) и тест в `scripts/risk-paths.test.ts`. Проверить: тест проходит; `node scripts/risk-paths.mjs` на ветке перечисляет эти файлы.
- [ ] 4.3 Обновить документацию:
  - `README.md` — состав `npm run check` и команды `lint` и `typecheck`;
  - `docs/technical-plan.md` — список проверок;
  - `docs/agents/rules/testing.md` — быстрый цикл `npm run lint` и `npm run typecheck` до полного `check`;
  - `REVIEW.md` — отключение правила без названия правила и причины считается поломкой.
  
  Проверить: в документах указаны новые команды, а формат отключения совпадает с решением 5 design.
- [ ] 4.4 Написать ADR о выборе oxlint и stylelint вместо ESLint из-за TypeScript 7, со следующим свободным номером в `docs/adr/` на момент слияния. Проверить: ADR лежит в `docs/adr/`, номер не занят в `origin/main`, в тексте указаны отвергнутые варианты (ESLint с `typescript@6`, Biome).

## 5. Итоговая проверка

- [ ] 5.1 Полная проверка: `E2E_PORT=<свободный порт> npm run check` проходит; `openspec validate add-linters --strict` проходит; `node scripts/risk-paths.mjs` перечисляет ожидаемые рискованные файлы для раздела «Human review» в PR.
