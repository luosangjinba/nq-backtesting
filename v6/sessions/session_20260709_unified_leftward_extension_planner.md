# V6 Session - Unified Leftward Extension Planner

## Summary

The old scattered leftward-history boundary math was replaced by a single
planner that applies to all minute-based display timeframes.

Completed commits:

- `66df10d1 feat(v6): add unified leftward extension planner`
- `ffc21a9c refactor(v6): route leftward history through planner`
- `36242da7 test(v6): harden replay-safe history latency smoke`

## Decisions

- Leftward extension is planned from logical range, not visible time range.
  Lightweight Charts clamps visible time ranges to loaded data, while logical
  range can represent canvas space before the first loaded bar.
- The planner treats display timeframe and source timeframe separately:
  display TF locates the canvas-left bucket, source TF defines the actual bar
  request window.
- Runtime-specific `ceil`/step inference was removed from
  `leftward-history-extension-runtime`; all minute TFs now use
  `planLeftwardSourceWindow`.
- Step 187 latency coverage now allows auto-chain to complete before the test
  observes the transient negative range, while still checking replay state,
  history prepend, and visible-range stability.

## Verification

- `node v6/tests/leftward-extension-planner-smoke.js`
- `node v6/tests/leftward-history-htf-projection-step198-smoke.js`
- `node v6/tests/leftward-history-extension-step148-smoke.js`
- `node v6/tests/display-timeframe-leftward-auto-chain-browser-smoke.js`
- `node v6/tests/replay-safe-leftward-history-latency-browser-step187-smoke.js`
- `node v6/tests/chart-browser-regression-pack.js`
- `git diff --check`

## Follow-Up

Use this planner as the only place for leftward extension bucket/request math.
Future TF work should extend timeframe normalization/projection behavior, not
add separate leftward-history branches for each interval.
