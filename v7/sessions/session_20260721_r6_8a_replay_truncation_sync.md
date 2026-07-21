# Session — R6.8a Replay Truncation And Sync Timeframe

Date: 2026-07-21
Status: implementation complete; awaiting human interaction and visual review

## Decision Input

During R6.8 review, the user requested the FXReplay truncation/time-machine
gesture, identified the right-side switch by its product name `Sync timeframe`,
and asked for a TradingView-like Replay transport treatment. The accepted fixed
bottom rail remains unchanged because it protects multi-Pane Canvas geometry.

## Delivered

- added a cancelable chart truncation selection mode with a blue vertical-only
  crosshair;
- mapped clicked completion slots to real aggregation-bucket starts and routed
  valid targets through the existing shared `goto-exact` transaction;
- rejected outside-data, outside-Session, and unrevealed targets without state
  mutation;
- added one-way `Sync timeframe` across all 13 supported fixed TFs, with the
  manual Replay-step selector read-only while enabled;
- replaced text glyphs with compact SVG transport icons and added an accessible
  named switch without covering a Pane;
- updated fixed single/multi-Pane visual fixtures.

## Evidence

- the focused pure Harness proves truncation boundary cases and complete TF to
  Replay-step coverage;
- the adapter browser Harness proves display-completion time maps back to the
  source bucket start;
- the mixed-Pane browser Harness proves active `1m`/`4h` sync without cursor or
  Workspace movement and one real truncation click visibly commits every Pane;
- the existing single-Pane performance gate remains active;
- all 38 non-browser and five serial real-Chrome Harnesses pass;
- Next p95 is `50.9ms`, p99 `58.1ms`, and max `58.7ms`; ETH→RTH, `5m`, and
  `12h` RTH replacements measure about `65ms`, `138ms`, and `826ms`;
- rapid history records zero observed long task, and `git diff --check` passes.

## Next Review Boundary

Review R6.8 and R6.8a together. Confirm the fixed capsule style, valid and
invalid truncation behavior, cancellation, active-Pane focus/TF synchronization,
manual step recovery after sync is disabled, and unchanged continuous Replay.
R6.9 remains blocked until this combined gate is accepted.
