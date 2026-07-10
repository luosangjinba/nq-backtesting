# V6 Step 275 - Chart Foundation Next Slice Selection

Date: 2026-07-10

## Decision

Step 276 should implement **Timeframe/Replay Foundation Regression Runner**.

This is a bounded chart-foundation regression slice. It should collect the
currently critical display-timeframe, projection, replay-gap, and leftward
history browser gates into one command for pre-commit verification.

## Why This Slice

Steps 264-274 finished a large chart-foundation chain:

- the interval menu moved to a capability registry;
- minute/hour projection was unlocked;
- `1D`, `1W`, and `1M` were selected, modeled, and enabled through
  session-aware projection;
- manual-next, playback-period, and auto-play replay gaps were stabilized;
- browser-visible replay gap coverage was consolidated into a focused runner.

The next risk is not a missing replay-gap variant. It is that future fixes to
timeframe switching, projection, leftward history, replay append, or
session-aware buckets will accidentally pass a narrow smoke while breaking the
combined workflow a trader actually uses while testing intervals.

Step 276 should add a compact runner that exercises the already-existing
browser gates most likely to regress together. It should not add runtime
behavior unless the runner exposes a specific owner bug.

## Selected Runner Membership

Step 276 should include these existing browser gates:

- `display-timeframe-browser-smoke.js`
- `timeframe-menu-parity-browser-smoke.js`
- `display-timeframe-leftward-auto-chain-browser-smoke.js`
- `session-aware-leftward-auto-chain-browser-smoke.js`
- `daily-projection-browser-step268-smoke.js`
- `weekly-projection-browser-step269-smoke.js`
- `monthly-projection-browser-step270-smoke.js`
- `replay-gap-browser-regression-pack-step274-smoke.js`

This list covers the product interval menu, active display timeframe switching,
leftward history under minute/hour and session-aware display projection,
session-aware daily/weekly/monthly projection, and the replay no-bar gap
browser pack.

## Owner Boundaries

- Display-timeframe capability registry owns supported interval metadata.
- Display-timeframe runtime owns display timeframe application and projection
  inputs.
- Chart-data projection runtime owns display bars and session-aware buckets.
- Chart-history owns leftward extension orchestration and does not own replay
  cursor movement.
- Replay runtime owns cursor/reveal state.
- Chart-entry manual-next and auto-play runtimes own replay append scheduling.
- Chart viewport owns visible-range intent after data operations.
- Chart surface owns rendered chart host state and browser-visible validation.

## Step 276 Scope

Implement Timeframe/Replay Foundation Regression Runner:

- add a compact pack runner in `v6/tests/`;
- run the selected browser gates sequentially as child Node processes;
- print start/pass/fail lines with duration;
- stop at the first failure and exit with the failing process code;
- add a static smoke that guards runner membership and the selected scope;
- update TODO when the runner is complete.

## Non-Goals

- Do not add new timeframes, custom intervals, seconds, or source data support.
- Do not change replay cursor ownership, playback-period behavior, auto-play
  scheduling, bar-data loading, projection semantics, leftward-history planning,
  price-scale reset, wheel-prepend stabilization, or viewport wall semantics.
- Do not add indicators, Pine Script compatibility, SMC/ICT overlays, trading
  simulation, order tickets, prop firm rule engines, or journal workflows.

## Suggested Verification For Step 276

- `node v6/tests/timeframe-replay-foundation-regression-pack-step276-static-smoke.js`
- `node v6/tests/timeframe-replay-foundation-regression-pack-step276-smoke.js`
- `node v6/tests/replay-gap-browser-regression-pack-step274-static-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

## Acceptance For This Selection

- Step 276 has one Timeframe/Replay Foundation Regression Runner target.
- The selected slice references current evidence from Steps 264-274.
- Verification commands are listed before implementation starts.
- Runtime behavior is unchanged in Step 275.
