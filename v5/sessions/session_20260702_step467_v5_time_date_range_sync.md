# Step 467 - V5 Time And Date Range Sync

Status: completed.

Date: 2026-07-02

## Goal

Implement `sync.time` and `sync.dateRange` as layout pane metadata without
moving replay cursor ownership or chart visible-range ownership into route UI.

## Implementation

- Added pane-level `time` and `dateRange` fields to layout state.
- Added `layout.setPaneTime`.
- Added `layout.setPaneDateRange`.
- With `sync.time` off, pane time updates target only the active/target pane.
- With `sync.time` on, pane time updates copy to all panes.
- With `sync.dateRange` off, pane date-range updates target only the
  active/target pane.
- With `sync.dateRange` on, pane date-range updates copy to all panes.
- Go to and Jump cursor now update layout pane time through route-injected
  callbacks after chart/replay commands succeed.
- Chart visible-range events update layout date-range metadata only when
  `sync.dateRange` is enabled.
- Pane shell elements expose `data-time`, `data-date-range-from`, and
  `data-date-range-to`.
- Browser layout smoke now verifies time/date-range sync.

## Boundaries

- Layout runtime owns pane time/date-range metadata.
- Chart runtime owns real visible ranges and emits visible-range changes.
- Replay runtime owns cursor/reveal state.
- Route UI dispatches commands and mirrors metadata only; it does not request
  bars or write chart series.

## Verification

- `node --check v5/src/runtime/layout-runtime.js`
- `node --check v5/src/features/chart-replay/chart-replay-navigation.js`
- `node --check v5/src/features/chart-replay/chart-replay-route.js`
- `node --check v5/src/features/chart-replay/chart-replay-pane-shell.js`
- `node v5/tests/layout-runtime-smoke.js`
- `node v5/tests/replay-workstation-layout-browser-smoke.js`
- `node v5/tests/chart-go-to-time-browser-smoke.js`
- `node v5/tests/chart-interaction-contracts-smoke.js`
- `node v5/tests/boundary-smoke.js`
- `git diff --check`

## Next Step Candidate

Step 468 should implement `sync.crosshair` through chart-owned crosshair
events/commands with deduping/throttling, then close the multi-pane acceptance
sequence for Single/Twice/Triple and no-future replay boundaries.
