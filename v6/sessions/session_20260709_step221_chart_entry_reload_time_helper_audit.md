# V6 Session - Step 221 Chart Entry / Reload Time Helper Readiness Audit

Date: 2026-07-09

## Summary

Step 221 audited the remaining chart-entry, pane-intent-reload, and
layout-bootstrap timestamp conversion sites before implementation migration.

## Changes

- Added `v6/docs/V6_CHART_ENTRY_RELOAD_TIME_HELPER_AUDIT_STEP221.md`.
- Added `v6/tests/chart-entry-reload-time-helper-audit-step221-smoke.js`.
- Classified remaining conversion sites by file, input semantics, target
  helper/API, and owner boundary.
- Selected Step 222 as the first bounded migration target:
  `chart-entry-projection-preparation.js` and
  `chart-entry-projection-preparation-runtime.js`.

## Preserved Boundaries

- Chart-entry still owns entry orchestration and projection preparation.
- Pane-intent reload still owns reload application.
- Layout bootstrap still owns visible pane copy and viewport wiring.
- No chart-entry behavior, manual-next behavior, reload behavior, layout
  behavior, request windows, TF support, indicators, Pine Script compatibility,
  SMC/ICT overlays, trading, order tickets, prop firm rule engines, or
  pseudo-live simulation behavior changed.

## Verification

- `node v6/tests/chart-entry-reload-time-helper-audit-step221-smoke.js`
- `node v6/tests/chart-entry-projection-preparation-runtime-smoke.js`
- `node v6/tests/chart-entry-manual-next-runtime-smoke.js`
- `node v6/tests/pane-intent-reload-chart-data-runtime-step177-smoke.js`
- `node v6/tests/layout-pane-bootstrap-runtime-smoke.js`
- `node v6/tests/product-direction-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

## Commit

- `bdd06726 docs(v6): audit chart entry reload time helpers`

## Next

Step 222 should migrate only the chart-entry projection-preparation
domain/runtime timestamp parsing through `time-domain` while preserving prepared
payloads, projection dispatch payloads, cursor lookup, and error text.
