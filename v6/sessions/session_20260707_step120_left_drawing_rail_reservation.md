# V6 Session - Step 120 Left Drawing Rail Reservation

Date: 2026-07-07

## Outcome

Step 120 reserved an inert shell-owned left drawing/tool rail for the
workstation chart surface.

Completed in commits:

- `4452f65a feat(v6): reserve left drawing rail`

## Implementation

- Added a 48px `data-v6-left-drawing-rail` beside the workstation chart surface.
- Added disabled icon placeholders for cursor, trend line, horizontal line,
  rectangle, measure, and text note tools.
- Changed the workstation main grid to left rail, chart surface, and right rail
  columns.
- Added browser coverage for disabled state, non-overlap, chart host visibility,
  and dashboard row-action visibility.

## Boundaries

- No chart, replay, bar-data, default-wall, display-timeframe, or viewport
  commands are dispatched from the rail.
- No left-rail controller or runtime owner import was added.
- Drawing tools remain unavailable until a drawing/tool owner and contract
  exists.
- Order and Calendar remain outside the left drawing rail.

## Verification

- `node v6/tests/left-drawing-rail-browser-smoke.js`
- `node v6/tests/workstation-chart-presentation-reaudit-smoke.js`
- `node v6/tests/right-utility-rail-browser-smoke.js`
- `node v6/tests/workstation-chart-host-browser-smoke.js`
- `node v6/tests/chart-toolbar-cleanup-browser-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

## Next Step

Step 121 should audit workstation rail/chrome regression coverage now that the
left drawing rail and right utility rail share the chart work area.
