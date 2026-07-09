# V6 Session - Step 202 Pane Identity / Display Timeframe Review

Date: 2026-07-08

## Completed

Step 202 reviewed the current pane identity split before further TF UI,
indicator, or pane-local chart feature work.

Commits:

- `3cd75588 docs(v6): audit pane identity display timeframe`
- `1b807e4f test(v6): guard pane identity display timeframe`
- `46fe67cb test(v6): add pane identity to chart pack`

## Changes

- Added `V6_PANE_IDENTITY_DISPLAY_TIMEFRAME_REVIEW_STEP202.md`.
- Indexed the Step 202 review doc.
- Added a static smoke that locks the current id split and active-pane fallback
  documentation.
- Added a browser smoke proving the real page currently has pane runtime
  `pane-default`, chart hosts `main` / `secondary` / `tertiary`, and primary
  chart HTF projection working through active-pane compatibility.
- Added the browser smoke to `chart-browser-regression-pack.js`.

## Review Result

The current identity model is a temporary compatibility state:

- pane runtime starts with `pane-default`;
- chart-data, chart-viewport, chart-engine, status readout, reset-view,
  maximize, and layout use chart-surface ids;
- primary chart display timeframe can work because projection-related runtimes
  can fall back to `PANE_COMMANDS.GET_ACTIVE`;
- that fallback must not become the multi-pane TF or indicator model.

## Residual Risk

Future TF UI, indicators, or pane-local settings can become ambiguous if they
are added before pane runtime ids match chart-surface ids, or before an
explicit mapping exists.

## Verification

- `node v6/tests/pane-identity-display-timeframe-review-step202-smoke.js`
- `node v6/tests/pane-identity-display-timeframe-browser-step202-smoke.js`
- `node v6/tests/chart-browser-regression-pack.js`
- `git diff --check`

## Next

Step 203 should normalize pane identity at bootstrap, preferably by creating
pane runtime records for `main`, `secondary`, and `tertiary`, then updating or
removing the primary-chart fallback where it is no longer needed.
