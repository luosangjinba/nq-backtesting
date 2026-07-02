# Step 472 - V5 Real Multi-Pane Chart Hosts

Date: 2026-07-02

Status: completed.

## Goal

Make secondary and tertiary panes mount real chart hosts through chart runtime
without moving chart writes, bar requests, or replay cursor ownership into the
route.

## Summary

- Secondary/tertiary panes now render real `data-chart-host` elements.
- Route scans current pane hosts and dispatches `chart.mountHost` for each.
- Chart runtime continues to own adapter lifecycle and chart writes.
- Chart runtime prunes disconnected hosts when mounted hosts are refreshed.
- Existing host sync sends current rendered bars/display context to new pane
  hosts.
- Browser smoke now verifies two hosts for `twice.horizontal` and three hosts
  for `triple.left`.

## Boundaries

- Route UI does not call chart series APIs.
- Route UI does not request bars.
- Replay runtime still owns cursor/reveal and no-future state.
- Bar-data runtime still owns requests/cache windows.
- The initial multi-pane data policy is shared replay session, same instrument,
  pane-level display timeframe metadata, and no bars beyond the shared replay
  cursor.

## Checks

- `node --check v5/src/runtime/chart-runtime.js`
- `node --check v5/src/features/chart-replay/chart-replay-pane-shell.js`
- `node --check v5/src/features/chart-replay/chart-replay-route.js`
- `node v5/tests/chart-runtime-pane-host-smoke.js`
- `node v5/tests/replay-workstation-layout-browser-smoke.js`
- `node v5/tests/replay-initial-browser-smoke.js`
- `node v5/tests/replay-viewport-follow-browser-smoke.js`
- `node v5/tests/boundary-smoke.js`
- `git diff --check`

## Next Candidate

Step 473 should audit multi-pane behavior manually in the browser and decide
whether the next product step is pane-specific data/settings or returning to
Settings polish.
