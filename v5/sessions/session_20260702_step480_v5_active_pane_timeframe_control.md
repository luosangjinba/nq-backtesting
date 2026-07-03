# Step 480 - V5 Active Pane Timeframe Control

## Goal

Keep one shared toolbar TF dropdown while making it behave as an active-pane
control in multi-pane layouts.

## Plan

- Step 480.1: Confirm the layout/runtime contract for pane-level
  `displayTimeframe`.
- Step 480.2: Document that V5 must not add one TF dropdown per pane.
- Step 480.3: Add browser acceptance for active-pane TF readback and writes.
- Step 480.4: Verify `sync.interval` off updates only the focused pane.
- Step 480.5: Verify `sync.interval` on copies the TF to every pane.
- Step 480.6: Run targeted checks and commit.

## Expected Behavior

- The toolbar contains exactly one `data-display-timeframe-select`.
- Clicking a pane makes that pane active.
- The shared TF dropdown displays the active pane's `displayTimeframe`.
- Changing TF with `Interval` sync off updates only the active pane.
- Changing TF with `Interval` sync on updates every pane.

## Boundaries

- Layout runtime owns pane `displayTimeframe`.
- Route UI dispatches layout commands and renders the shared control.
- Replay runtime remains the owner of replay display reloads.
- No per-pane TF dropdowns are introduced.

## Verification

- `node --check v5/tests/replay-workstation-layout-browser-smoke.js`
- `node v5/tests/layout-runtime-smoke.js`
- `node v5/tests/replay-workstation-layout-browser-smoke.js`
- `git diff --check`

## Next

Step 481 should continue split-pane hardening after resize, focusing on
price/time axes, OHLC overlays, active-pane focus, and future Settings scope
across all supported layout variants.
