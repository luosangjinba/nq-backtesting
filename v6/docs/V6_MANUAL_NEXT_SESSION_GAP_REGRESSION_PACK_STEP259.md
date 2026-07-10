# V6 Step 259 - Manual Next Session Gap Regression Pack

Date: 2026-07-10

## Decision

Step 259 adds a compact manual-next session-gap regression pack.

The pack is the focused gate to run when changing replay cursor alignment,
chart-entry manual-next coordination, bar-data source-window probing,
chart-data append/projection behavior, display-timeframe projection, or replay
transport paths that might regress session-break continuation.

## Pack

`v6/tests/manual-next-session-gap-regression-pack-step259-smoke.js` runs these
gates in sequence:

- `v6/tests/manual-next-session-gap-step258-smoke.js`
- `v6/tests/manual-next-session-gap-browser-step258-smoke.js`
- `v6/tests/chart-entry-manual-next-runtime-smoke.js`
- `v6/tests/manual-next-htf-projection-step197-smoke.js`
- `v6/tests/auto-play-htf-projection-step199-smoke.js`

## Coverage

- Manual next skips no-bar session breaks from `16:59` to the next available
  source K-line at `18:00`.
- Replay cursor-time alignment keeps `cursorIndex`, `previousAvailable`, and
  `revealedCount` consistent with the skipped source time.
- Manual next continues after the gap, so a following `Next` advances from
  `18:00` to `18:01`.
- Browser coverage verifies the source 1m path plus 5m and 15m display
  projection paths.
- Higher display-timeframe paths validate the projected bucket's last source
  timestamp. The bucket start may remain session-origin aligned and does not
  need to equal the latest source minute.
- Ordinary manual-next and HTF projection behavior remains covered beside the
  gap-specific gates.

## Owner Boundaries

- Replay runtime owns cursor/reveal state and cursor-time alignment.
- Replay domain owns `cursorIndex`, `previousAvailable`, and `revealedCount`
  recalculation after a cursor-time set.
- Chart-entry manual-next runtime owns replay command orchestration and bounded
  source-bar probing across no-bar gaps.
- Bar-data runtime owns window requests, cache behavior, and real source-bar
  availability.
- Chart-data runtime owns pane-local append records and display-timeframe
  projection output.
- Display-timeframe runtime owns projection inputs and does not own replay
  cursor movement.
- Chart viewport owns visible-range intent after data changes and must not have
  follow/manual wall semantics reset by a gap skip.
- Chart surface owns rendered chart host state and browser-visible validation.

## Non-Goals

- This pack does not replace the replay/transport, date-range, multi-pane, or
  visible K-line latency packs.
- No runtime behavior changes were made for Step 259.
- No session setup redesign, date picker redesign, database schema change,
  import format change, new timeframes, custom interval UI, indicators, Pine
  Script compatibility, SMC/ICT overlays, trading simulation, order tickets,
  prop firm rule engines, or journal workflows were added.

## Verification

- `node v6/tests/manual-next-session-gap-regression-pack-step259-smoke.js`
- `node v6/tests/manual-next-session-gap-step258-smoke.js`
- `node v6/tests/manual-next-session-gap-browser-step258-smoke.js`
- `node v6/tests/chart-entry-manual-next-runtime-smoke.js`
- `node v6/tests/manual-next-htf-projection-step197-smoke.js`
- `node v6/tests/auto-play-htf-projection-step199-smoke.js`
- `node v6/tests/product-direction-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`
