# Session - Step 415 Settings Current Price Presentation

Date: 2026-07-13

## Completed

- confirmed native current-price series options and rejected custom rendering;
- upgraded Settings to schema v7 and activated Scales and lines;
- added Pane-scoped series option application for independent symbols;
- covered transaction, multi-pane identity, and hard reload.
- added immediate checkbox preview with committed-state restoration on Cancel
  and other discard paths; OK remains the persistence boundary.

## Commits

- `25e7a38d feat(v6): version current price settings`
- `1231f33b feat(v6): apply current price presentation`
- final Step 415 browser/governance commit

## Next

Implement Step 416 Global Time Presentation.

## Visual Acceptance

The first pass required checkbox changes to affect the chart immediately.
Commit `e1e3a45b` added draft preview plus committed-state restoration on all
discard paths. The final human visual recheck passed; Step 415 is closed.
