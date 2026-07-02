# Step 466 - V5 Pane Display Timeframe And Interval Sync

Status: completed.

Date: 2026-07-02

## Goal

Store display timeframe on layout panes and make the display timeframe control
target the active pane while respecting `sync.interval`.

## Implementation

- Added `layout.setPaneDisplayTimeframe`.
- Layout runtime now validates positive pane display timeframes.
- With `sync.interval` off, the command updates only the target pane.
- With `sync.interval` on, the command copies the timeframe to all panes.
- Chart route now keeps current layout state and derives the toolbar display
  timeframe from the active pane.
- Display timeframe control changes update layout state first.
- Primary replay display reload still goes through replay runtime. Secondary
  placeholder changes do not request bars unless interval sync updates the
  primary pane too.
- Pane shell elements expose `data-display-timeframe`.
- Updated browser coverage for secondary active pane + interval sync.

## Boundaries

- Layout runtime owns pane timeframe state.
- Route UI dispatches layout/replay commands only.
- Route UI does not request bars directly.
- Chart runtime remains the only chart writer.
- Replay runtime remains the owner of primary replay display reload and
  cursor/reveal state.

## Verification

- `node --check v5/src/runtime/layout-runtime.js`
- `node --check v5/src/features/chart-replay/chart-replay-controls.js`
- `node --check v5/src/features/chart-replay/chart-replay-route.js`
- `node --check v5/src/features/chart-replay/chart-replay-pane-shell.js`
- `node v5/tests/layout-runtime-smoke.js`
- `node v5/tests/replay-workstation-layout-browser-smoke.js`
- `node v5/tests/replay-display-timeframe-browser-smoke.js`
- `node v5/tests/replay-display-timeframe-smoke.js`
- `node v5/tests/replay-floating-controls-browser-smoke.js`
- `node v5/tests/boundary-smoke.js`
- `git diff --check`

## Next Step Candidate

Step 467 should implement `sync.time` and `sync.dateRange` through
chart-runtime-owned commands/events. Replay runtime should continue to own the
shared cursor and reveal boundaries.
