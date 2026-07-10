# V6 Step 263 - Auto-Play Session Gap Regression Pack

Date: 2026-07-10

## Decision

Step 263 adds a compact auto-play session-gap regression pack.

The pack is the focused gate to run when changing chart-entry auto-play timer
ownership, manual-next delegation, replay cursor alignment, bar-data source
window probing, chart-data append/projection behavior, or display-timeframe
projection near no-bar session breaks.

## Pack

`v6/tests/auto-play-session-gap-regression-pack-step263-smoke.js` runs these
gates in sequence:

- `v6/tests/auto-play-session-gap-ownership-step263-smoke.js`
- `v6/tests/auto-play-session-gap-step263-smoke.js`
- `v6/tests/auto-play-session-gap-browser-step263-smoke.js`
- `v6/tests/chart-entry-auto-play-runtime-smoke.js`
- `v6/tests/chart-entry-auto-play-browser-smoke.js`
- `v6/tests/auto-play-htf-projection-step199-smoke.js`
- `v6/tests/auto-play-htf-visible-latency-browser-step199-smoke.js`
- `v6/tests/playback-period-session-gap-regression-pack-step261-smoke.js`

## Coverage

- Auto-play crosses the `16:59 -> 18:00` no-bar break through manual-next
  delegation.
- Auto-play continues beyond the first post-break source bar to `18:01`.
- Replay `cursorIndex`, `previousAvailable`, and `revealedCount` remain aligned
  with the final cursor time after timer-driven gap crossing.
- Browser coverage verifies the 1m source path and 5m display projection path.
- Higher display-timeframe paths validate the projected bucket's last source
  timestamp. Bucket-start timestamps may remain session-origin aligned.
- Source ownership coverage proves auto-play still delegates to manual-next and
  does not own bar-data, chart-data, projection, viewport, or chart-engine
  commands.
- Existing auto-play runtime/browser, HTF projection, HTF visible-latency, and
  playback-period session-gap packs remain part of the regression chain.

## Owner Boundaries

- Chart-entry auto-play runtime owns timer lifecycle, speed, playing/stopped
  state, and dispatching manual-next ticks.
- Chart-entry auto-play runtime must not dispatch bar-data, chart-data,
  projection, viewport, or chart-engine commands directly.
- Chart-entry manual-next runtime owns replay command orchestration and bounded
  source-bar probing across no-bar gaps.
- Replay runtime owns cursor/reveal state and cursor-time/index alignment.
- Replay domain owns `cursorIndex`, `previousAvailable`, and `revealedCount`
  recalculation after cursor-time alignment.
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
  visible K-line latency, manual-next session-gap, or playback-period
  session-gap packs.
- No runtime behavior changes were made for Step 263.
- No auto-play speed option change, transport layout change, keyboard shortcut
  change, playback-period UI redesign, session setup redesign, date picker
  redesign, database schema change, import format change, new timeframes,
  custom interval UI, indicators, Pine Script compatibility, SMC/ICT overlays,
  trading simulation, order tickets, prop firm rule engines, or journal
  workflows were added.

## Verification

- `node v6/tests/auto-play-session-gap-regression-pack-step263-static-smoke.js`
- `node v6/tests/auto-play-session-gap-regression-pack-step263-smoke.js`
- `node v6/tests/auto-play-session-gap-ownership-step263-smoke.js`
- `node v6/tests/auto-play-session-gap-step263-smoke.js`
- `node v6/tests/auto-play-session-gap-browser-step263-smoke.js`
- `node v6/tests/chart-entry-auto-play-runtime-smoke.js`
- `node v6/tests/chart-entry-auto-play-browser-smoke.js`
- `node v6/tests/auto-play-htf-projection-step199-smoke.js`
- `node v6/tests/auto-play-htf-visible-latency-browser-step199-smoke.js`
- `node v6/tests/playback-period-session-gap-regression-pack-step261-smoke.js`
- `node v6/tests/product-direction-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`
