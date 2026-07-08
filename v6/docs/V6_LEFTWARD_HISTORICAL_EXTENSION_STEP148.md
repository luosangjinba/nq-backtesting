# V6 Leftward Historical K-Line Extension - Step 148

Date: 2026-07-08

## Outcome

Step 148 implements bounded leftward historical K-line extension on top of the
replay K-line, reset view, and multi-pane chart foundations.

The implemented gates prove:

- chart-data owns prepending and merging older bars;
- canvas-left visible range demand is converted to a bounded older-window
  request;
- the request starts at the canvas-left timeline boundary and ends immediately
  before the oldest loaded bar;
- bar-data remains the only requester/cache owner;
- older bars are merged through chart-data and then projected through
  chart-viewport;
- browser integration extends the chart leftward without mutating replay state.

## Ownership

- `chart-history` coordinates left-extension demand using runtime commands.
- The input bridge only forwards chart-surface visible-range demand.
- Bar-data owns all historical requests and cache writes.
- Chart-data owns prepend/merge behavior.
- Chart-viewport owns projection after chart-data changes.
- Chart-engine remains the only chart series writer.
- Replay cursor ownership is unchanged.

## Lightweight Charts Check

Step 148 uses the existing Lightweight Charts logical-range subscription path
already wrapped by `workstation-chart-surface`. The runtime consumes visible
logical range demand rather than reading or mutating Lightweight Charts
directly.

## What Did Not Change

- no chart series writes were added outside chart-engine;
- no bar requests were added outside bar-data;
- no replay cursor mutation was added;
- no multi-pane UI controls were added;
- no simulated trading, comparison symbols, overlays, plugins, indicators,
  Order, or Calendar behavior was enabled.

## Verification

- `node v6/tests/leftward-history-extension-step148-smoke.js`
- `node v6/tests/leftward-history-input-bridge-step148-smoke.js`
- `node v6/tests/leftward-history-extension-browser-step148-smoke.js`
- `node v6/tests/chart-data-runtime-smoke.js`
- `node v6/tests/chart-data-surface-bridge-smoke.js`
- `node v6/tests/app-shell-browser-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

## Next Step

Step 149 should harden actual drag-triggered history extension:

- verify real drag/wheel gestures trigger left-extension demand;
- suppress duplicate in-flight or exhausted historical requests;
- measure visible latency after older bars are loaded;
- keep replay `Next` speed unaffected.
