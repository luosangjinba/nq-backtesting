# Session — R6.9 Resizable Pane Layouts

Date: 2026-07-21
Status: human accepted as part of the combined Pane gate

## Delivered

- added the exact reviewed 1/2/3/4-Pane layout matrix: 1, 2, 4, and 5 variants
  per count respectively;
- retained one independent chart host per product Pane because native
  Lightweight Charts panes share one chart time scale;
- added a pure, versioned Pane Layout Domain with deterministic split trees,
  persistence encoding, and measured subtree minimum constraints;
- added pointer-draggable and keyboard-adjustable horizontal and vertical
  boundaries with the corrected `280×120px` minimum Pane geometry;
- persisted accepted layout variant and nested ratios per explicit Session and
  restored them on Session re-entry;
- kept same-count layout changes and divider resizing outside Bar Data, Replay,
  and Workspace transactions;
- kept count changes on the existing complete Pane-set atomic materialization;
- preserved one shared Replay clock and Session-wide ETH/RTH across mixed
  instruments and timeframes.

## Evidence

- `tests/pane-layout-domain-harness.js` covers all 12 variants, schema
  round-trip, resize constraints, and negative controls;
- `tests/session-store-harness.js` covers persisted layout isolation and
  reconstruction;
- `tests/replay-layout-workspace-browser-harness.js` covers one-to-four layout
  changes, pointer/keyboard resizing, no-transaction same-count changes,
  minimum geometry, mixed NQ/ES and `1m/4h`, shared RTH/Next, visual output,
  and Session re-entry restoration;
- all 39 non-browser and six serial real-Chrome Harnesses pass;
- the retained performance gate records Next p95 `58.9ms`, p99 `61.8ms`, and
  max `65.5ms`; ETH→RTH, `5m`, and `12h` RTH replacements measure about
  `74ms`, `110ms`, and `1102ms`; rapid history records zero observed long task;
- `git diff --check` passes.

## Review Boundary

This step changes interaction and visual layout, so it stops for human review.
R6.9a supplies the review-required Crosshair/OHLC correction. Remaining R6.10
Symbol/Interval/Time/Date-range sync does not begin until the combined gate is
accepted.
