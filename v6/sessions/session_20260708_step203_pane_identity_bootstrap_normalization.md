# V6 Session - Step 203 Pane Identity Bootstrap Normalization

Date: 2026-07-08

## Completed

Step 203 normalized pane runtime bootstrap to chart-surface pane ids.

Commits:

- `96c2de70 feat(v6): normalize pane bootstrap ids`
- `2b988b8d test(v6): guard normalized pane identity`
- `b6eac09a test(v6): add pane bootstrap to chart pack`

## Changes

- Changed `DEFAULT_PANE_ID` from `pane-default` to `main`.
- Added default pane runtime bootstrap records for `main`, `secondary`, and
  `tertiary`.
- Updated layout defaults to use the same default pane records.
- Updated affected display-timeframe and HTF browser smokes to set 5m directly
  on `main`.
- Added `pane-identity-bootstrap-browser-step203-smoke.js`.
- Added the Step 203 browser guard to `chart-browser-regression-pack.js`.

## Result

Pane runtime, chart-surface hosts, chart-data, chart-viewport, status readout,
reset-view, maximize, and layout now share the same default pane ids. The
primary chart no longer depends on `pane-default` active-pane fallback for
display-timeframe projection.

## Residual Risk

Some runtimes still contain active-pane fallback for defensive compatibility.
That fallback should be audited in a separate bounded step before TF UI or
indicator work.

## Verification

- `node v6/tests/pane-model-smoke.js`
- `node v6/tests/pane-runtime-smoke.js`
- `node v6/tests/layout-model-smoke.js`
- `node v6/tests/display-timeframe-runtime-smoke.js`
- `node v6/tests/display-timeframe-browser-smoke.js`
- `node v6/tests/pane-identity-bootstrap-browser-step203-smoke.js`
- `node v6/tests/chart-browser-regression-pack.js`
- `git diff --check`

## Next

Step 204 should audit and narrow remaining active-pane fallback call sites
without starting TF UI or indicator implementation.
