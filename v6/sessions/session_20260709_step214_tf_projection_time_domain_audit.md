# V6 Session - Step 214 TF / Projection / Time Domain Audit

Date: 2026-07-09

## Summary

Step 214 completed the TF / Projection / Time Domain Unification Readiness
Audit. This was a bounded foundation step: it did not rewrite projection logic
or add user-facing chart features.

The audit accepted `chart-data-projection` as the owner of source-to-display
projection and documented the surrounding owner boundaries:

- `bar-data` owns bounded source-window requests and cache keys;
- `chart-history` owns leftward-extension orchestration;
- `replay` owns cursor and reveal state;
- `chart-viewport` owns viewport intent and logical range projection;
- `panes` owns pane-local selected display timeframe;
- shell/UI only displays labels and dispatches commands.

## Duplicate Evidence

The audit records duplicate or drift-prone TF/time/projection logic in:

- `v6/src/chart-data-projection/chart-data-projection-domain.js`;
- `v6/src/display-timeframe/display-timeframe-projection.js`;
- `v6/src/default-wall/default-wall-pane-projection.js`;
- `v6/src/chart-history/leftward-extension-planner.js`;
- `v6/src/chart-history/leftward-history-extension-runtime.js`;
- `v6/src/bar-data/bar-window.js`;
- `v6/src/replay/replay-domain.js`;
- `v6/src/panes/pane-model.js`;
- `v6/src/chart-viewport/chart-viewport-runtime.js`;
- `v6/src/chart-viewport/chart-viewport-store.js`.

## Decision

Step 215 should add a small shared TF/time domain helper before broader feature
work. The first implementation target should route the pure
`chart-data-projection` domain through that helper while preserving behavior.

## Non-Goals Preserved

- no projection rewrite in Step 214;
- no new supported TFs;
- no indicators or Pine Script compatibility;
- no SMC/ICT overlays;
- no trading/order tickets, prop firm rule engine, or pseudo-live simulation;
- no shell/route ownership of bar requests, replay cursor, viewport intent, or
  chart series writes.

## Verification

- `node v6/tests/tf-projection-time-domain-audit-step214-smoke.js`
- `node v6/tests/product-direction-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

## Commit

- `581aa997 docs(v6): audit TF projection time domain boundaries`
