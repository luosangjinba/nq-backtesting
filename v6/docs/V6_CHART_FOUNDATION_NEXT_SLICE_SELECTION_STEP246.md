# V6 Step 246 - Chart Foundation Next Slice Selection

Date: 2026-07-09

## Decision

Step 247 should implement **Date-Range Entry Viewport Alignment Audit/Gate**.

This is a bounded chart-foundation slice. It should focus on the path from a
dashboard session date range into the chart entry window, actual loaded chart
boundary metadata, and the initial viewport projection.

## Why This Slice

Step 245 confirmed the replay/transport chain is stable across Manual Previous,
leftward history, multi-pane bootstrap, pane-local reset view, and display
timeframe switching. The current foundation priority still names date ranges as
an unfinished chart-basic area.

There is also user-observed risk in this exact area: after selecting a different
date range, chart data can exist while the visible K-line cluster appears
outside the canvas until user interaction shifts the viewport. That failure
class is different from leftward extension and Manual Previous. It sits at the
entry boundary where selected trading dates, Globex/prior-boundary adjustment,
loaded chart-data, and viewport default-wall projection meet.

Step 247 should make that boundary explicit and add a browser gate before more
feature work.

## Owner Boundaries

- Session dashboard owns selected trading date display and session row actions.
- Chart-entry context/bootstrap owns turning a session into bounded initial
  chart windows.
- Bar-data owns actual data requests, cache reads, and loaded boundary
  metadata.
- Chart-data owns pane-local bar records.
- Chart viewport owns default-wall visible range intent and projection.
- Chart surface/engine owns rendering already-applied chart-data and visible
  logical range state.
- Shell UI must not own date-range math, bar requests, replay cursor mutation,
  chart-data writes, or viewport projection.

## Step 247 Scope

Implement Date-Range Entry Viewport Alignment Audit/Gate:

- document the current date-range entry owner path from session dashboard to
  chart surface;
- create or extend browser coverage for opening a non-default date range where
  chart data is loaded from an adjusted actual boundary;
- assert the initial visible logical range includes the loaded/revealed K-line
  cluster without requiring user drag, click, or wheel input;
- assert the dashboard/session row can still distinguish selected trading dates
  from actual chart start metadata;
- if the gate exposes a runtime regression, fix it in the owning module only;
- keep all requests bounded and preserve the no-full-date-range-load rule.

## Non-Goals

- Do not add a new date picker or date-range management UI.
- Do not change replay cursor semantics, Manual Previous, transport controls,
  leftward extension planning, or display-timeframe projection unless the new
  gate identifies a specific owner bug.
- Do not add new timeframes.
- Do not add indicators, Pine Script compatibility, SMC/ICT overlays, trading
  simulation, order tickets, prop firm rule engines, or journal workflows.
- Do not move date-range, bar-request, chart-data, or viewport logic into shell
  UI.

## Suggested Verification For Step 247

- `node v6/tests/date-range-entry-viewport-alignment-step247-smoke.js`
- `node v6/tests/replay-transport-chain-regression-pack-step245-smoke.js`
- `node v6/tests/product-direction-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

## Acceptance For This Selection

- Step 247 has one owner-path audit/gate target.
- The selected slice stays inside chart foundation date-range behavior.
- Verification commands are listed before implementation starts.
- Runtime behavior is unchanged in Step 246.
