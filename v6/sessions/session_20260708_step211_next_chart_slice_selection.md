# V6 Session - Step 211 Next Chart Slice Selection

Date: 2026-07-08

## Completed

- Reviewed Step 206-210 active-pane display-timeframe and pane-local header
  presentation work.
- Selected Top-Toolbar Active-Pane Symbol Presentation Sync as the next bounded
  chart-facing slice.
- Documented owner boundaries for pane runtime, shell top toolbar,
  pane-status readout, chart-data runtime, bar-data runtime, replay runtime,
  and display-timeframe runtime.
- Kept symbol picker UI, comparison symbols, custom intervals, interval sync,
  indicators, Pine Script, and trading/order behavior out of scope.

## Commits

- `46b05629 docs(v6): select step 212 chart slice`

## Verification

- `node v6/tests/next-chart-slice-selection-step211-smoke.js`
- `node v6/tests/pane-local-header-state-sync-step210-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `node v6/tests/chart-browser-regression-pack.js`
- `git diff --check`

## Next

Step 212 should implement Top-Toolbar Active-Pane Symbol Presentation Sync.
Keep it read-only and shell-owned: update `data-v6-top-symbol` from the active
pane state without adding symbol picker UI, comparison symbols, bar-data
requests, chart-data writes, display-timeframe projection, or replay mutation.
