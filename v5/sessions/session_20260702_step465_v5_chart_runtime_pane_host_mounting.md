# Step 465 - V5 Chart Runtime Pane Host Mounting

Status: completed.

Date: 2026-07-02

## Goal

Make chart runtime host mounting pane-id aware so future split panes can mount
real chart hosts without route-owned chart lifecycle.

## Implementation

- Added `chart.mountHost` to the chart command contract.
- Updated chart runtime to track mounted host elements and adapters by pane id.
- Kept the existing MutationObserver auto-mount fallback, but made route UI
  explicitly pass the primary host through `chart.mountHost`.
- Made `chart.getViewportMetrics` accept an optional `paneId`.
- Updated host cleanup so disconnected hosts are removed from pane mappings.
- Added `chart-runtime-pane-host-smoke.js` for explicit primary/secondary host
  mounting, pane-targeted metrics, and same-pane host replacement.
- Added the new smoke to `v5/scripts/smoke_all.js`.

## Boundaries

- Route UI passes host elements through chart commands only.
- Chart runtime owns adapter creation, replacement, cleanup, and chart writes.
- Bar-data runtime remains the only bars requester.
- Replay runtime remains the only replay cursor/reveal owner.
- Secondary/tertiary route panes remain placeholders until later steps decide
  when to create real pane hosts and what data they display.

## Verification

- `node --check v5/src/runtime/chart-runtime.js`
- `node --check v5/src/runtime/chart-runtime-host-sync.js`
- `node --check v5/tests/chart-runtime-pane-host-smoke.js`
- `node v5/tests/chart-runtime-smoke.js`
- `node v5/tests/chart-runtime-pane-host-smoke.js`
- `node v5/tests/chart-runtime-engine-adapter-smoke.js`
- `node v5/tests/chart-runtime-fallback-input-smoke.js`
- `node v5/tests/chart-viewport-follow-smoke.js`
- `node v5/tests/boundary-smoke.js`
- `node v5/tests/replay-workstation-layout-browser-smoke.js`
- `git diff --check`

## Next Step Candidate

Step 466 should store pane-level display timeframe in layout state. Active-pane
timeframe changes should update one pane unless `sync.interval` is enabled, in
which case layout/runtime commands copy the timeframe to all panes.
