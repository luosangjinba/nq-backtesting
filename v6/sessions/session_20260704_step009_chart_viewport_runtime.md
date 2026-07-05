# V6 Session - Step 9 Chart Viewport Runtime

Date: 2026-07-04 PDT

## Result

V6 Step 9 is complete. The app now has pane-local viewport intent ownership,
replay cursor notification handling, and current-intent reprojection after chart
data revisions.

## Commits

- `61f9659 feat(v6): add chart viewport store`
- `6daf30a feat(v6): register chart viewport runtime`
- `03cb36a test(v6): gate chart viewport runtime`
- `1e23714 test(v6): enforce chart viewport boundaries`

## Verification

- `node v6/tests/chart-viewport-store-smoke.js`
- `node v6/tests/chart-viewport-runtime-smoke.js`
- `node v6/tests/runtime-core-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `node v6/tests/app-shell-browser-smoke.js`
- `git diff --check`

## Boundary Notes

- Chart viewport runtime owns pane-local viewport intent and latest projection
  metadata.
- Replay cursor notifications update `cursorTimestamp` only; wall origin,
  latest offset, span, and revision are preserved.
- Chart data revision notifications reapply the current intent through the same
  projection path for default and manual walls.
- Chart viewport modules do not import chart engine, V4, vendor, shell,
  session, or bar-data modules and do not touch DOM/chart APIs.

## Next

Step 10 should add the chart engine adapter. The adapter may call Lightweight
Charts APIs, but it must not store durable viewport intent.
