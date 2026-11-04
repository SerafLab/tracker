# Project catalogue tile verification

Verified on 2026-11-04 against the feature based on `a4fa010`.

The repository catalogue query returns project summaries with card counts through indexed status/card lookups. It does not load card payloads or change the native `projects()` result. Repository coverage includes projects with no statuses, empty statuses, one card, cards spread across statuses, and totals after deletion. Application/state coverage confirms the summary query and fresh totals when the catalogue is reopened.

The completed required check (`VITEST_MAX_WORKERS=2 E2E_PORT=4283 npm run check`) passed architecture validation, 258 unit/UI tests, three historical transport-probe tests and 133 browser tests. Existing creation, empty/error states, rename, project deletion, navigation and offline scenarios passed. Eight dedicated browser cases check Russian/English catalogues at 320, 390, 1280 and 1440 px, localized counts, responsive geometry, whole-tile opening and independent action menus.

Actual rendered screenshots inspected: Russian populated catalogue at 320 px and English populated catalogue at 1440 px, each including a long unbroken project name and zero/one/multiple card counts. Names wrap inside tiles; counts and menus remain readable, tile rows align on desktop, and no overlap or horizontal page overflow was observed. Other matrix sizes are covered by browser geometry/assertion checks, not claimed as separately inspected images. Screenshots remain test artifacts rather than additional product assets.
