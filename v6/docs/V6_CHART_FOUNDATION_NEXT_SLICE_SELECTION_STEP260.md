# V6 Step 260 - Chart Foundation Next Slice Selection

Date: 2026-07-10

## Decision

Step 261 should implement **Playback Period Session Gap Regression Pack**.

This is a bounded chart-foundation regression slice. It should preserve replay
continuation across no-bar session breaks when the playback period causes one
manual `Next` action to advance multiple source bars.

## Why This Slice

Steps 245-259 now provide focused packs for replay/transport, multi-pane chart
foundation behavior, date-range and loaded-boundary entry, visible K-line
latency, and single-step manual-next session-gap continuation.

The remaining adjacent risk is playback-period stepping across the same no-bar
session break. The recent bug showed that replay cursor time and replay cursor
index can diverge when chart-entry aligns to a real source bar after a no-bar
gap. A multi-step manual `Next` path has the same owner-boundary risk, but with
more chances to stop at the first post-break source bar or miscount the reveal
state.

Step 261 should add a focused pack for this path rather than changing runtime
behavior in the selection step.

## External Reference Check

Lightweight Charts exposes visible logical range and time/index conversion APIs
on the time scale. Those APIs remain relevant to browser-visible validation,
but they do not replace V6 replay cursor/index ownership. The TradingView
ecosystem list does not change the selected approach for this slice: the risk
is V6 replay/chart-entry state coordination, not a missing chart plugin.

## Owner Boundaries

- Replay runtime owns cursor/reveal state and cursor-time/index alignment.
- Playback-period controls own the selected period and dispatch commands only.
- Chart-entry manual-next runtime owns replay command orchestration for
  multi-step manual advancement.
- Bar-data runtime owns source-window requests and real source-bar availability
  across no-bar gaps.
- Chart-data runtime owns pane-local append records and display-timeframe
  projection output.
- Display-timeframe runtime owns projection inputs and does not own replay
  cursor movement.
- Chart viewport owns visible-range intent after each data operation.
- Chart surface owns rendered chart host state and browser-visible validation.

## Step 261 Scope

Implement Playback Period Session Gap Regression Pack:

- add a compact pack runner for playback-period manual-next session-gap gates;
- cover at least 5m and 15m playback-period advancement across the
  `16:59 -> 18:00` break;
- prove multi-step manual `Next` continues beyond the first post-break source
  bar instead of stopping at `18:00`;
- verify replay `cursorIndex` and `revealedCount` remain aligned with the final
  cursor time after the multi-step advance;
- include display-timeframe projection coverage where the projected bucket's
  last source timestamp, not bucket-start timestamp, proves continuation;
- add no runtime behavior unless the pack exposes a specific owner regression.

## Non-Goals

- Do not change playback-period UI, transport layout, keyboard shortcuts,
  session setup, date picker behavior, database schema, import format,
  supported timeframes, or custom interval UI.
- Do not change Manual Previous, auto-play scheduling, leftward-history
  planning, price-scale reset, wheel-prepend stabilization, or chart viewport
  wall semantics.
- Do not add indicators, Pine Script compatibility, SMC/ICT overlays, trading
  simulation, order tickets, prop firm rule engines, or journal workflows.

## Suggested Verification For Step 261

- `node v6/tests/playback-period-session-gap-regression-pack-step261-smoke.js`
- `node v6/tests/chart-entry-playback-period-boundary-runtime-smoke.js`
- `node v6/tests/chart-entry-playback-period-browser-smoke.js`
- `node v6/tests/manual-next-session-gap-regression-pack-step259-smoke.js`
- `node v6/tests/manual-next-session-gap-browser-step258-smoke.js`
- `node v6/tests/product-direction-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

## Acceptance For This Selection

- Step 261 has one playback-period session-gap regression-pack target.
- The selected slice stays inside replay/playback-period/chart-entry/chart-data
  chart foundation behavior.
- Verification commands are listed before implementation starts.
- Runtime behavior is unchanged in Step 260.
