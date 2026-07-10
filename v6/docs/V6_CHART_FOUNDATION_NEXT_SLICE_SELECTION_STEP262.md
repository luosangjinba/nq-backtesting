# V6 Step 262 - Chart Foundation Next Slice Selection

Date: 2026-07-10

## Decision

Step 263 should implement **Auto-Play Session Gap Regression Pack**.

This is a bounded chart-foundation regression slice. It should preserve replay
continuation across no-bar session breaks when replay is advancing through the
chart-entry auto-play scheduler rather than direct manual `Next` input.

## Why This Slice

Steps 259 and 261 now preserve direct manual-next and playback-period
manual-next continuation across the `16:59 -> 18:00` no-bar break. The adjacent
remaining replay path is auto-play.

Auto-play intentionally delegates each timer tick to the manual-next owner. That
owner path now knows how to align replay cursor time, cursor index, and revealed
count after a no-bar gap. Step 263 should prove auto-play inherits that behavior
without moving replay, bar-data, chart-data, projection, or viewport ownership
into the auto-play runtime.

This slice remains chart-foundation work because it protects replay transport,
visible chart-data append/projection, and cursor/reveal state while avoiding
indicators, trading simulation, prop-firm workflows, and journal features.

## External Reference Check

Lightweight Charts time-scale APIs remain useful for browser-visible validation
through visible logical range and time/index conversion, but they do not own V6
replay cursor state. The TradingView ecosystem list does not change the selected
approach: this risk is in V6 auto-play scheduling over manual-next, not in a
missing chart plugin.

## Owner Boundaries

- Chart-entry auto-play runtime owns timer lifecycle, speed, playing/stopped
  state, and dispatching manual-next ticks.
- Chart-entry auto-play runtime must not dispatch bar-data, chart-data,
  projection, viewport, or chart-engine commands directly.
- Chart-entry manual-next runtime owns replay command orchestration and bounded
  source-bar probing across no-bar gaps.
- Replay runtime owns cursor/reveal state and cursor-time/index alignment.
- Bar-data runtime owns source-window requests, cache behavior, and real
  source-bar availability.
- Chart-data runtime owns pane-local append records and display-timeframe
  projection output.
- Display-timeframe runtime owns projection inputs and does not own replay
  cursor movement.
- Chart viewport owns visible-range intent after each data operation.
- Chart surface owns rendered chart host state and browser-visible validation.

## Step 263 Scope

Implement Auto-Play Session Gap Regression Pack:

- add a compact pack runner for auto-play session-gap runtime and browser gates;
- prove auto-play crosses the `16:59 -> 18:00` no-bar break and continues beyond
  the first post-break source bar;
- verify replay `cursorIndex` and `revealedCount` remain aligned after
  auto-play crosses the gap;
- include display-timeframe projection coverage where the projected bucket's
  last source timestamp, not bucket-start timestamp, proves continuation;
- include source/static coverage proving auto-play still delegates to
  manual-next and does not own bar-data/chart-data/projection commands;
- add no runtime behavior unless the pack exposes a specific owner regression.

## Non-Goals

- Do not change auto-play speed options, transport layout, keyboard shortcuts,
  playback-period UI, session setup, date picker behavior, database schema,
  import format, supported timeframes, or custom interval UI.
- Do not change Manual Previous, leftward-history planning, price-scale reset,
  wheel-prepend stabilization, or chart viewport wall semantics.
- Do not add indicators, Pine Script compatibility, SMC/ICT overlays, trading
  simulation, order tickets, prop firm rule engines, or journal workflows.

## Suggested Verification For Step 263

- `node v6/tests/auto-play-session-gap-regression-pack-step263-smoke.js`
- `node v6/tests/chart-entry-auto-play-runtime-smoke.js`
- `node v6/tests/chart-entry-auto-play-browser-smoke.js`
- `node v6/tests/auto-play-htf-projection-step199-smoke.js`
- `node v6/tests/auto-play-htf-visible-latency-browser-step199-smoke.js`
- `node v6/tests/playback-period-session-gap-regression-pack-step261-smoke.js`
- `node v6/tests/product-direction-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

## Acceptance For This Selection

- Step 263 has one auto-play session-gap regression-pack target.
- The selected slice stays inside replay/auto-play/manual-next/chart-data chart
  foundation behavior.
- Verification commands are listed before implementation starts.
- Runtime behavior is unchanged in Step 262.
