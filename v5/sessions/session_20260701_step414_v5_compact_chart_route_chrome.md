# V5 Session Handoff - Step 414 Compact Chart Route Chrome

Date: 2026-07-01

## Status

Step 414 is complete.

## Goal

Make the chart route's route-level heading/navigation chrome compact so the
single-pane chart remains the dominant workstation surface.

## Changes

- Added stable chart route heading/action class names in
  `chart-replay-route.js`.
- Compressed the chart route heading, route action buttons, workstation toolbar,
  and chart viewport sizing in `app.css`.
- Kept `Sessions` as route-level navigation and kept TF, Go to, Layout, and
  Settings as active-pane controls.
- Extended `replay-workstation-layout-browser-smoke.js` to assert compact route
  chrome height, small heading-to-toolbar gap, and minimum chart height.
- Updated `chart-interaction-contracts.md` and `v5/TODO.md`.

## Invariants

- UI continues to dispatch commands and subscribe to events.
- Chart runtime remains the only owner of chart series writes.
- Bar data runtime remains the only owner of bar requests/cache.
- Replay runtime remains the only owner of replay cursor and reveal state.
- Session navigation remains route-level UI, not a chart command.
- The chart route still exposes exactly one active pane: `primary`.

## Verification

- `node v5/tests/replay-workstation-layout-browser-smoke.js`
- `node v5/tests/chart-display-usability-browser-smoke.js`
- `node v5/tests/chart-responsive-visual-browser-smoke.js`
- `node v5/scripts/smoke_all.js`
- `git diff --check`

## Next Candidates

- Continue single-pane polish before layout split panes.
- Improve setup route visual quality.
- Refine chart settings surface density and FXReplay-style header alignment.
