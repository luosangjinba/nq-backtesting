# V6 Step 257 - Visible K-Line Latency Regression Pack

Date: 2026-07-10

## Decision

Step 257 adds a compact visible K-line latency regression pack.

The pack is the focused gate to run when changing replay command handling,
chart-data projection, chart-surface application, visible-range projection,
display-timeframe fanout, bar-data cache behavior, or replay-safe leftward
history behavior.

## Pack

`v6/tests/visible-kline-latency-regression-pack-step257-smoke.js` runs these
gates in sequence:

- `v6/tests/visible-latency-domain-smoke.js`
- `v6/tests/visible-latency-cache-hit-browser-smoke.js`
- `v6/tests/mixed-timeframe-visible-latency-browser-smoke.js`
- `v6/tests/manual-next-htf-visible-latency-browser-step197-smoke.js`
- `v6/tests/auto-play-htf-visible-latency-browser-step199-smoke.js`
- `v6/tests/replay-safe-leftward-history-latency-browser-step187-smoke.js`

## Coverage

- Cache-hit replay command paths keep the next visible candle inside the
  visible-latency budget without fetching data.
- Mixed timeframe panes keep visible candle projection inside the latency
  budget for both source-timeframe update paths and higher-timeframe setData
  paths.
- Manual-next HTF projection remains visible after user input.
- Auto-play HTF projection remains visible while timer-driven replay advances.
- Replay-safe leftward history latency keeps manual-next responsive while older
  history extension is pending.
- The domain trace keeps one shared latency vocabulary for input,
  command-received, bar-available, chart-update-requested, and candle-visible
  phases.

## Owner Boundaries

- Replay runtime owns cursor/reveal state and command latency input.
- Chart-entry manual-next and auto-play owners coordinate replay commands with
  chart-data updates.
- Chart-data runtime owns pane-local append/replace records and projection
  output.
- Chart viewport owns visible-range projection intent.
- Chart surface owns chart host application, visible logical range observation,
  and browser-visible candle state.
- Bar-data runtime owns cache/request metadata and distinguishes cache-hit paths
  from data fetch paths.
- Display-timeframe runtime owns timeframe projection inputs and does not own
  chart host rendering.
- Latency helpers own trace vocabulary and summary assertions only.

## Non-Goals

- This pack does not replace the full chart browser regression pack.
- No runtime behavior changes were made for Step 257.
- No latency thresholds were loosened.
- No session setup redesign, date picker redesign, database schema change,
  import format change, new timeframes, custom interval UI, indicators, Pine
  Script compatibility, SMC/ICT overlays, trading simulation, order tickets,
  prop firm rule engines, or journal workflows were added.

## Verification

- `node v6/tests/visible-kline-latency-regression-pack-step257-static-smoke.js`
- `node v6/tests/visible-kline-latency-regression-pack-step257-smoke.js`
- `node v6/tests/visible-latency-domain-smoke.js`
- `node v6/tests/visible-latency-cache-hit-browser-smoke.js`
- `node v6/tests/mixed-timeframe-visible-latency-browser-smoke.js`
- `node v6/tests/manual-next-htf-visible-latency-browser-step197-smoke.js`
- `node v6/tests/auto-play-htf-visible-latency-browser-step199-smoke.js`
- `node v6/tests/replay-safe-leftward-history-latency-browser-step187-smoke.js`
- `node v6/tests/product-direction-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`
