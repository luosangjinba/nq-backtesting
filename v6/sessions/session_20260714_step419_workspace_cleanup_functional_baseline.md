# Session - Step 419 Workspace Cleanup Functional Baseline

Date: 2026-07-14

## Completed

- added one focused browser baseline for the active chart-workstation surfaces
  that must survive all workspace cleanup phases;
- protected top Journal, Replay Control, Chart Settings, timeframe, layout,
  sync, Go-to, Pane maximize/restore, Pane Reset, and Replay transport entry
  points;
- distinguished functional but state-disabled Replay Previous and Restart
  controls from ownerless disabled placeholders;
- captured relational single/two-Pane chart dimensions without freezing the
  obsolete 48px placeholder rails;
- verified visible Pane action counts, maximize/restore behavior, sync toggle
  behavior, chart canvas presence, and pointer input;
- changed no production markup, CSS, runtime, persistence, or Semantic Drawing
  contract.

## Verification

- `node v6/tests/workspace-cleanup-functional-baseline-step419-browser-smoke.js`
- `node v6/tests/app-shell-browser-smoke.js`
- `node v6/tests/product-baseline-screenshot-smoke.js`
- `node v6/tests/workspace-placeholder-cleanup-decision-step418-smoke.js`
- `git diff --check`

## Next

Execute Step 420 only: establish the placeholder-absence harness before any
production markup is removed.
