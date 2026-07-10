# V6 Step 254 - Chart Foundation Next Slice Selection

Date: 2026-07-10

## Decision

Step 255 should implement **Date Range / Loaded Boundary / Replay Entry
Regression Pack**.

This is a bounded chart-foundation regression slice. It should add a compact
pack focused on the path from session date range through loaded bar boundaries,
chart-entry viewport alignment, replay bootstrap, and real-date leftward
extension behavior.

## Why This Slice

Steps 245-253 now provide focused packs for replay/transport and multi-pane
foundation behavior. The remaining foundation chain with high regression risk
is date-range entry:

- creating a session with a date range must not load the full selected range
  into chart state;
- the actual loaded boundary must be visible in dashboard/session metadata;
- chart entry must align the initial viewport so loaded K-lines are visible
  without requiring a user drag;
- replay cursor/revealed state must start from the selected session boundary;
- playback-period and reset-view boundaries must not mutate replay or chart
  data unexpectedly;
- real-date leftward extension must understand loaded and empty boundary
  metadata.

Step 247 covered the key date-range entry alignment case, and Steps 189-191
covered real-date boundary metadata. Step 255 should collect those gates into a
small pack so date-range, boundary, and chart-entry work has a focused
regression entry.

## Owner Boundaries

- Session runtime owns selected session start/end metadata.
- Session dashboard owns read-only row and boundary presentation.
- Chart-entry runtime owns bounded initial load planning and chart-entry
  bootstrap orchestration.
- Bar-data runtime owns database/cache requests and loaded/empty boundary
  metadata.
- Chart-data runtime owns pane-local bars and revisions.
- Chart viewport owns initial/default viewport projection.
- Chart surface owns visible logical range observation and chart host
  rendering.
- Replay runtime owns cursor/reveal state.
- Playback-period controls dispatch playback-period commands and do not mutate
  chart-data or replay ownership directly.

## Step 255 Scope

Implement Date Range / Loaded Boundary / Replay Entry Regression Pack:

- add a compact pack runner for date-range and chart-entry browser/runtime
  gates;
- include date-range entry viewport alignment, real-date boundary metadata,
  chart-entry initial visibility, playback-period boundary behavior, and
  real-date leftward gap coverage;
- document pack purpose, membership, and expected use;
- keep the pack focused enough to run during date-range, boundary metadata,
  chart-entry, bar-data, viewport, or replay bootstrap work;
- add no runtime behavior unless the pack exposes a specific owner regression.

## Non-Goals

- Do not redesign session setup UI or date pickers.
- Do not change database schema or import format.
- Do not add new supported timeframes or custom interval UI.
- Do not add indicators, Pine Script compatibility, SMC/ICT overlays, trading
  simulation, order tickets, prop firm rule engines, or journal workflows.
- Do not move session, bar-data, chart-data, chart viewport, chart surface, or
  replay ownership into shell UI.

## Suggested Verification For Step 255

- `node v6/tests/date-range-boundary-entry-regression-pack-step255-smoke.js`
- `node v6/tests/date-range-entry-viewport-alignment-step247-smoke.js`
- `node v6/tests/real-date-boundary-metadata-browser-step190-smoke.js`
- `node v6/tests/chart-entry-initial-visibility-browser-smoke.js`
- `node v6/tests/product-direction-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

## Acceptance For This Selection

- Step 255 has one date-range/boundary/chart-entry regression pack target.
- The selected slice stays inside chart foundation regression coverage.
- Verification commands are listed before implementation starts.
- Runtime behavior is unchanged in Step 254.
