# Step 507 - Replay Pane Display Merge Helper

Date: 2026-07-04

## Trigger

After Step 506, the remaining module-audit hotspot is
`replay-display-window-controller.js`. It still mixes primary display-window
loading with non-primary pane snapshot/base/merge rules.

## Substep Plan

### 507.1 - Planning Handoff

Update TODO/session/spec docs with the extraction plan and commit before code
changes.

Verification:

- `git diff --check`

### 507.2 - Pane Display Helper Module

Create `replay-pane-display-window-state.js` and move pure/command-boundary
helpers:

- normalized pane id;
- display-window demand key including pane id;
- target pane rendered-bars snapshot retrieval through `chart.getRenderedBars`;
- base display bars/timeframe resolution;
- merge eligibility calculation;
- display-window attempt summary.

The helper may call `dispatchCommand(chart.getRenderedBars)` because that is
already the documented runtime command boundary. It must not request bars,
write chart series, mutate replay state, or emit events.

Verification:

- `node --check v5/src/runtime/replay-display-window-controller.js`
- `node --check v5/src/runtime/replay-pane-display-window-state.js`
- `git diff --check`

### 507.3 - Regression Gate

Run replay display-window and multi-pane demand checks.

Verification:

- `node v5/tests/replay-display-viewport-demand-smoke.js`
- `node v5/tests/replay-display-timeframe-smoke.js`
- `node v5/tests/multi-pane-viewport-demand-browser-smoke.js`
- `node v5/tests/replay-workstation-layout-browser-smoke.js`
- `git diff --check`

### 507.4 - Closeout

Record final module boundaries, commits, and verification results.

Verification:

- `git diff --check`

## Guardrails

- Replay display-window controller remains the owner of replay state updates
  and replay display events.
- Bar requests remain in the controller through bar-data runtime commands.
- Chart writes remain through `chartSync`.
- Route UI must not read chart snapshots or request bars.
- Primary display-window behavior must remain unchanged.

## Status

In progress.
