# V6 Replay Chart Readiness Audit

Date: 2026-07-05

## Decision

V6 should return from workflow-shell polish to replay/chart-facing work. The
readiness gates that protect the two V5 failure classes passed:

- visible K-line delay;
- primary/non-primary multi-pane confusion.

No new UI polish is required before the next replay/chart step.

## Gate Results

### Visible Latency

Passed:

- `node v6/tests/chart-entry-initial-visibility-browser-smoke.js`
- `node v6/tests/chart-entry-manual-next-browser-smoke.js`
- `node v6/tests/chart-entry-auto-play-browser-smoke.js`
- `node v6/tests/visible-latency-domain-smoke.js`
- `node v6/tests/visible-latency-cache-hit-browser-smoke.js`
- `node v6/tests/mixed-timeframe-visible-latency-browser-smoke.js`

Finding:

- session entry now has a browser-level gate that verifies runtime projection
  reaches chart surface state and candle-colored pixels on canvas.
- session-entry manual next now has a browser-level gate that verifies transport
  next advances replay, appends visible chart data, and keeps the latest candle
  inside the projected visible range without using the old default-wall next
  path.
- session-entry auto-play now has a browser-level gate that verifies transport
  play starts the chart-entry auto-play owner, appends multiple visible candles,
  pauses cleanly, and keeps the latest candle inside the projected visible
  range.
- cache-hit visible replay remains covered by a browser gate, so the database
  and API path are not allowed to become the visible candle path.

### Default And Manual Wall Replay

Passed:

- `node v6/tests/default-wall-runtime-smoke.js`
- `node v6/tests/default-wall-pane-projection-smoke.js`
- `node v6/tests/default-wall-replay-browser-smoke.js`
- `node v6/tests/manual-wall-display-window-smoke.js`
- `node v6/tests/manual-wall-replay-browser-smoke.js`

Finding:

- default wall and manual wall behavior remain covered by the same intent and
  projection path.
- display-window loads are still guarded from resetting manual wall intent.

### Display Timeframe

Passed:

- `node v6/tests/display-timeframe-runtime-smoke.js`
- `node v6/tests/display-timeframe-pane-isolation-smoke.js`
- `node v6/tests/display-timeframe-projection-smoke.js`
- `node v6/tests/display-timeframe-browser-smoke.js`
- `node v6/tests/default-wall-mixed-timeframe-runtime-smoke.js`

Finding:

- display timeframe behavior is pane-local and remains connected to default wall
  replay without reopening V5-style viewport ownership.

### Multi-Pane

Passed:

- `node v6/tests/multi-pane-manual-wall-browser-smoke.js`
- `node v6/tests/multi-pane-chart-host-browser-smoke.js`

Finding:

- multi-pane chart hosts and manual walls remain pane-local through the unified
  pane model.

### Chart Engine

Passed:

- `node v6/tests/chart-engine-browser-smoke.js`

Finding:

- the chart engine adapter still renders and exposes browser-observable chart
  behavior after the workflow shell phase.

## Boundary Result

Passed:

- `node v6/tests/boundary-smoke.js`

Finding:

- workflow shell work did not introduce chart, replay, data, viewport, or pane
  ownership imports into the wrong modules.

## Next Direction

The next executable step should be chart-facing. The highest-value bounded step
is to audit and tighten the real chart presentation path:

- confirm the chart host and engine adapter are the first-class visual surface,
  not the old static placeholder;
- preserve all replay wall and visible-latency gates;
- avoid adding more workflow shell polish unless a chart/replay gate requires
  it.
