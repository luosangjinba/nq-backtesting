# V6 Step 261 - Playback Period Session Gap Regression Pack

Date: 2026-07-10

## Decision

Step 261 adds a compact playback-period session-gap regression pack.

The pack is the focused gate to run when changing playback-period stepping,
manual-next replay orchestration, replay cursor alignment, bar-data source
window probing, chart-data append/projection behavior, or display-timeframe
projection near no-bar session breaks.

## Pack

`v6/tests/playback-period-session-gap-regression-pack-step261-smoke.js` runs
these gates in sequence:

- `v6/tests/playback-period-session-gap-step261-smoke.js`
- `v6/tests/playback-period-session-gap-browser-step261-smoke.js`
- `v6/tests/chart-entry-playback-period-boundary-runtime-smoke.js`
- `v6/tests/chart-entry-playback-period-browser-smoke.js`
- `v6/tests/manual-next-session-gap-regression-pack-step259-smoke.js`

## Coverage

- A 5m playback period can cross the `16:59 -> 18:00` no-bar break and continue
  to `18:01` in one manual `Next`.
- A 15m playback period can cross the same break and continue to `18:05`.
- Replay `cursorIndex`, `previousAvailable`, and `revealedCount` remain aligned
  with the final cursor time after the multi-step advance.
- Browser coverage verifies the 1m source path plus 5m and 15m display
  projection paths.
- Higher display-timeframe paths validate the projected bucket's last source
  timestamp. Bucket-start timestamps may remain session-origin aligned.
- Existing playback-period boundary and single-step manual-next session-gap
  packs remain part of the regression chain.

## Owner Boundaries

- Replay runtime owns cursor/reveal state and cursor-time/index alignment.
- Replay domain owns `cursorIndex`, `previousAvailable`, and `revealedCount`
  recalculation after cursor-time alignment.
- Playback-period runtime owns the selected period and sync state.
- Playback-period UI dispatches period commands and does not mutate replay,
  chart-data, or chart viewport state.
- Chart-entry manual-next runtime owns replay command orchestration for
  multi-step manual advancement.
- Bar-data runtime owns source-window requests, cache behavior, and real
  source-bar availability across no-bar gaps.
- Chart-data runtime owns pane-local append records and display-timeframe
  projection output.
- Display-timeframe runtime owns projection inputs and does not own replay
  cursor movement.
- Chart viewport owns visible-range intent after each data operation.
- Chart surface owns rendered chart host state and browser-visible validation.

## Non-Goals

- This pack does not replace the replay/transport, date-range, multi-pane,
  visible K-line latency, or single-step manual-next session-gap packs.
- No runtime behavior changes were made for Step 261.
- No playback-period UI redesign, transport layout change, keyboard shortcut
  change, session setup redesign, date picker redesign, database schema change,
  import format change, new timeframes, custom interval UI, indicators, Pine
  Script compatibility, SMC/ICT overlays, trading simulation, order tickets,
  prop firm rule engines, or journal workflows were added.

## Verification

- `node v6/tests/playback-period-session-gap-regression-pack-step261-static-smoke.js`
- `node v6/tests/playback-period-session-gap-regression-pack-step261-smoke.js`
- `node v6/tests/playback-period-session-gap-step261-smoke.js`
- `node v6/tests/playback-period-session-gap-browser-step261-smoke.js`
- `node v6/tests/chart-entry-playback-period-boundary-runtime-smoke.js`
- `node v6/tests/chart-entry-playback-period-browser-smoke.js`
- `node v6/tests/manual-next-session-gap-regression-pack-step259-smoke.js`
- `node v6/tests/product-direction-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`
