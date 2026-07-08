# V6 Pane Intent Reload Runtime - Step 173

Date: 2026-07-08

## Boundary

Step 173 adds the pane-intent reload runtime skeleton.

The runtime listens to:

- `pane:symbolIntentChanged`
- `pane:intervalIntentChanged`
- `paneIntentSync:applied`

It emits `paneIntentReload:intentCreated` records and exposes
`paneIntentReload.getState`.

## Ownership

- `pane-intent-reload-runtime` owns reload-intent emission only.
- `pane-intent-reload-model` remains pure record creation.
- Bar-data runtime remains the only owner that can request/cache K-line windows.
- Chart-data runtime remains the only owner that can mutate chart bars.
- Chart-viewport/chart-entry owners remain responsible for viewport work.
- Replay runtime remains the only owner of cursor and no-future semantics.

## Non-Goals

This step does not:

- call `BAR_DATA_COMMANDS.LOAD_WINDOW`;
- call `CHART_DATA_COMMANDS.REPLACE_BARS`;
- call chart-viewport projection commands;
- write chart series;
- mutate replay state.

## Verification

- `node v6/tests/pane-intent-reload-runtime-step173-smoke.js`
- `node v6/tests/pane-intent-reload-model-step172-smoke.js`
- `node v6/tests/pane-intent-sync-runtime-step170-smoke.js`
- `node v6/tests/runtime-core-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

## Next

Step 174 should define how reload-intent records are converted into replay-safe
bar-data window plans before any actual bar-data request is implemented.
