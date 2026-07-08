# V6 Chart Foundation Integration Re-Audit - Step 158

## Decision

Step 158 accepts the chart foundation integration re-audit.

The current V6 chart foundation remains aligned with the required owner
boundaries. Database K-line import, replay chart load, reset view / KXG reset,
multi-pane chart hosts, leftward historical extension, replay speed under
history loading, crosshair OHLC readout, replay append, and replay viewport
projection are all covered by focused gates and an integration audit smoke.

## Accepted State

- `app.js` wires chart foundation runtimes before mounting chart surface bridges.
- Bar requests and cache ownership remain in bar-data runtime.
- Replay cursor ownership remains in replay runtime.
- Pane-local chart bar mutation remains in chart-data runtime.
- Viewport intent and projection remain in chart-viewport runtime.
- Chart series writes and visible logical range writes remain in chart-engine.
- Manual wall, reset view, and leftward history input bridges dispatch commands
  into owner runtimes instead of mutating state directly.
- Browser regression for chart foundation work is expected to run sequentially
  because browser/CDP resources and test command registries are shared.

## Coverage

- `chart-foundation-integration-reaudit-step158-smoke.js` verifies runtime
  registration, bridge wiring, boundary docs, test coverage presence, and
  source-level owner constraints.
- Steps 143-157 still provide focused gates for database import, replay chart
  load, reset view, multi-pane hosts, leftward extension, replay speed,
  crosshair OHLC, replay append, and viewport projection.
- Sequential browser runs passed for replay chart flow, reset view, drag
  history extension, crosshair OHLC, replay append, replay viewport projection,
  and multi-pane leftward history.

## Next Direction

Step 159 should select the next bounded chart-facing implementation slice. Keep
the choice explicit and small: define the owner boundary, tests, and non-goals
before adding more chart behavior.
