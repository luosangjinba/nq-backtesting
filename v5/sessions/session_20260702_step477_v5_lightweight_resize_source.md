# Step 477 - V5 Lightweight Resize Source

Date: 2026-07-02

Status: completed.

## Goal

Fix the remaining multi-pane axis chrome regression after manual Lightweight
sizing.

## Summary

- Reproduced the issue with a clean headless browser screenshot.
- Found that the primary pane host was about half-width while its internal
  Lightweight engine surface still measured the previous full-width chart.
- Changed runtime resize measurement to use the outer runtime canvas/host, not
  the internal engine surface.
- Strengthened layout browser smoke coverage to assert the engine surface does
  not overflow the canvas after multi-pane layout changes.

## Boundaries

- Route UI still does not call Lightweight APIs.
- Chart runtime remains responsible for adapter sizing and chart writes.
- Replay runtime and bar-data runtime ownership are unchanged.
- Resizable split pane handles remain deferred to the next step.

## Checks

- `node tmp/v5_axis_debug.js` during diagnosis; temporary script removed before
  commit.
- `node v5/tests/replay-workstation-layout-browser-smoke.js`
- `node v5/tests/chart-engine-adapter-smoke.js`
- `git diff --check`
