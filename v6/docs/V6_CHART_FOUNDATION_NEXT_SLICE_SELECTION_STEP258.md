# V6 Step 258 - Chart Foundation Next Slice Selection

Date: 2026-07-10

## Decision

Step 259 should implement **Manual Next Session Gap Regression Pack**.

This is a bounded chart-foundation regression slice. It should collect the
manual-next session-break behavior that was just stabilized into a compact pack
covering the source timeframe path and higher display-timeframe projection
paths.

## Why This Slice

Steps 245-257 now provide focused packs for replay/transport, multi-pane chart
foundation behavior, date-range and loaded-boundary entry, and visible K-line
latency. The latest runtime fix closed another chart-foundation failure class:
manual `Next` could land inside a no-bar session break and repeatedly append the
last bar before the break.

The fix is important enough to preserve as a named foundation gate because it
touches several owner boundaries at once:

- replay state must advance to the next available source K-line;
- chart-entry manual-next coordination must probe and scan bounded windows
  without owning bar-data internals;
- chart-data must append or project only the real next source bar;
- higher display timeframes must keep session-origin bucket alignment while
  proving the projected bucket includes the next source bar after the gap.

Step 259 should turn that behavior into a focused regression pack rather than
expanding the full chart browser pack or starting a new product feature.

## Owner Boundaries

- Replay runtime owns cursor/reveal state and exposes only a bounded cursor-time
  setter for owner-mediated gap skips.
- Chart-entry manual-next runtime owns the replay command orchestration and the
  bounded search for the next available source bar.
- Bar-data runtime owns window requests, cache behavior, and real source-bar
  availability.
- Chart-data runtime owns pane-local append records and display-timeframe
  projection output.
- Display-timeframe runtime owns projection inputs and does not own replay
  cursor movement.
- Chart viewport owns visible-range intent after the data operation; the gap
  skip must not reset follow/manual wall semantics.
- Chart surface owns rendered chart host state and browser-visible validation.

## Step 259 Scope

Implement Manual Next Session Gap Regression Pack:

- add a compact pack runner for manual-next session-gap runtime and browser
  gates;
- include the direct manual-next gap smoke and the browser smoke for 1m, 5m, and
  15m display paths;
- include nearby replay/chart-entry/HTF projection gates that prove the skip
  did not regress ordinary manual-next behavior;
- document pack purpose, membership, owner boundaries, and the higher-timeframe
  bucket-start caveat;
- add no runtime behavior unless the pack exposes a specific owner regression.

## Non-Goals

- Do not change session setup semantics, date picker behavior, database schema,
  import format, supported timeframes, or custom interval UI.
- Do not change replay speed, auto-play scheduling, Manual Previous behavior,
  leftward-history planning, price-scale reset, or wheel-prepend stabilization.
- Do not add indicators, Pine Script compatibility, SMC/ICT overlays, trading
  simulation, order tickets, prop firm rule engines, or journal workflows.

## Suggested Verification For Step 259

- `node v6/tests/manual-next-session-gap-regression-pack-step259-smoke.js`
- `node v6/tests/manual-next-session-gap-step258-smoke.js`
- `node v6/tests/manual-next-session-gap-browser-step258-smoke.js`
- `node v6/tests/chart-entry-manual-next-runtime-smoke.js`
- `node v6/tests/manual-next-htf-projection-step197-smoke.js`
- `node v6/tests/auto-play-htf-projection-step199-smoke.js`
- `node v6/tests/product-direction-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

## Acceptance For This Selection

- Step 259 has one manual-next session-gap regression-pack target.
- The selected slice stays inside replay/date-range/display-timeframe chart
  foundation behavior.
- Verification commands are listed before implementation starts.
- Runtime behavior is unchanged in Step 258.
