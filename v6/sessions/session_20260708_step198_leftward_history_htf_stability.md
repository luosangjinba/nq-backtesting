# V6 Session - Step 198 Leftward History HTF Stability

Date: 2026-07-08

## Completed

Step 198 routed higher-display-timeframe leftward-history prepends through the
chart-data projection owner.

Commits:

- `d7fe88d9 feat(v6): route leftward HTF history through projection`
- `802afa4e test(v6): guard leftward HTF projection routing`
- `a06f7b2d test(v6): cover leftward HTF browser stability`

## Changes

- `leftward-history-extension-runtime` now projects loaded source chunks before
  prepending when the pane display timeframe is higher than the source
  timeframe.
- Leftward-history state now records `projectionSource` for projected HTF
  prepends.
- Pane lookup falls back to the active pane when a chart pane id does not map
  directly to the pane runtime record.
- Routing guards now allow projection only for initial preparation, pane reload,
  manual next, and leftward history.
- Auto-play, reset view, chart-data runtime/store, and chart-engine surface
  bridges remain outside chart-data projection routing.

## Verification

- `node v6/tests/leftward-history-htf-projection-step198-smoke.js`
- `node v6/tests/leftward-history-htf-stability-browser-step198-smoke.js`
- `node v6/tests/chart-data-projection-routing-scope-step198-smoke.js`
- `node v6/tests/chart-data-projection-routing-scope-step197-smoke.js`
- `node v6/tests/chart-data-projection-routing-scope-step196-smoke.js`
- `node v6/tests/chart-data-projection-routing-scope-step195-smoke.js`
- `node v6/tests/chart-data-projection-no-routing-step194-smoke.js`
- `node v6/tests/leftward-history-extension-step148-smoke.js`
- `node v6/tests/multi-pane-leftward-history-step155-smoke.js`
- `git diff --check`

## Next

Select Step 199 after reviewing the remaining HTF projection gates. Prefer the
next chart-data/runtime ownership gap over UI polish.
