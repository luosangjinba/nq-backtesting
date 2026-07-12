# V6 HTF Leftward Extension Bottleneck Owner Selection - Step 368

Status

Accepted.

## Scope

Step 368 consumed the Step 367 phase summary and selected the next bounded
slice for HTF leftward-extension performance work.

This step is planning/selection-first. It does not change runtime behavior,
command surfaces, target-history request sizing, chart-history fast-path
behavior, replay cursor movement, `v6/src/app.js`, shell readout code, or the
Step 362 handoff runtime skeleton.

## Added Selection Boundary

- `v6/src/chart-history/high-timeframe-leftward-extension-bottleneck-owner-selection.js`
  is a pure selector for Step 367-style phase records.
- `v6/tests/high-timeframe-leftward-extension-bottleneck-owner-selection-step368-smoke.js`
  covers the observed Step 367 shape and alternate owner-dominated cases.
- `v6/tests/high-timeframe-leftward-extension-bottleneck-owner-selection-boundary-step368-static-smoke.js`
  locks the boundary as pure analysis with no command dispatch, target API, or
  app-registration behavior.

The selector consumes:

- `sourceRequestMs`
- `targetRequestMs`
- `chartDataReplacementMs`
- `viewportReapplyMs`
- `visibleApplyLagMs`
- `browserPaintLagMs`

It returns:

- `status`
- `selectedPhase`
- `ownerBoundary`
- `nextSlice`
- `reason`
- `rejectedOwnerCandidates`
- `summary`

## Step 367 Selection Result

The observed Step 367 run selected:

- `status`: `narrower-measurement-selected`
- `selectedPhase`: `browserPaintLagMs`
- `ownerBoundary`: `chart-surface-browser-paint-measurement`
- `nextSlice`: `target-history-real-chart-paint-visibility-measurement`
- `reason`: `browser-paint-observation-window-dominates-with-low-runtime-costs`

The result intentionally selects a narrower measurement rather than an
optimization. Step 367's largest bucket is the harness' two-animation-frame
paint observation window, while source request, target request, chart-data
replacement, viewport reapply, and diagnostics visibility remain low.

## Deferred Owners

- Request sizing / target load is deferred because `targetRequestMs` was within
  budget and source requests were zero on the target-history path.
- Chart-data replacement is deferred because `chartDataReplacementMs` stayed
  below the selected owner threshold in the observed run.
- Viewport reapply is deferred because `viewportReapplyMs` stayed below the
  selected owner threshold.
- Visible apply lag / diagnostics readout is deferred because
  `visibleApplyLagMs` was effectively zero.
- Replay coordination materialization handoff remains registered and preserved;
  Step 368 does not move target bars into replay runtime.

## Next Slice

Step 369 should implement
`target-history-real-chart-paint-visibility-measurement`.

The goal is to distinguish a real chart-surface/browser paint delay from the
test harness' intentional two-frame observation window. It should keep runtime
behavior unchanged unless the new measurement proves a concrete chart-surface
or browser-paint bottleneck.

Suggested Step 369 boundaries:

- instrument only the browser smoke / harness;
- measure chart host visible state as close as possible to the series update,
  not merely two frames after the readout;
- preserve `4h`, `8h`, `1D`, and `1W` coverage;
- keep request sizing, chart-data replacement, viewport reapply, replay
  cursor, app registration, and shell readout behavior unchanged.
