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

Result:

- Primary display viewport-demand behavior passed.
- Display timeframe load behavior passed.
- Multi-pane viewport demand still loads pane-local older bars.
- Replay workstation layout smoke passed.
- Node reported the existing `MODULE_TYPELESS_PACKAGE_JSON` warning during
  test execution.

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

Completed.

## Result

- Added `v5/src/runtime/replay-pane-display-window-state.js`.
- Moved helper responsibilities out of
  `replay-display-window-controller.js`:
  - replay pane id normalization;
  - display-window demand key construction including pane id;
  - target-pane snapshot reads through `chart.getRenderedBars`;
  - base display bars/timeframe resolution;
  - merge eligibility;
  - display-window attempt summaries.
- Kept `replay-display-window-controller.js` as the owner of:
  - bar-data `LOAD_WINDOW` requests;
  - chart sync writes through `chartSync`;
  - replay state updates;
  - replay display events.

## Commits

- `0ef8d5a docs(v5): plan replay pane display helper split`
- `8403995 refactor(v5): extract replay pane display helper`
- `8beb3d3 docs(v5): record replay pane display gate`

## Verification

- `node --check v5/src/runtime/replay-display-window-controller.js`
- `node --check v5/src/runtime/replay-pane-display-window-state.js`
- `node v5/tests/replay-display-viewport-demand-smoke.js`
- `node v5/tests/replay-display-timeframe-smoke.js`
- `node v5/tests/multi-pane-viewport-demand-browser-smoke.js`
- `node v5/tests/replay-workstation-layout-browser-smoke.js`
- `git diff --check`
