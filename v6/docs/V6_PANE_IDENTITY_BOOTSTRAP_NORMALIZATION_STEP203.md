# V6 Pane Identity Bootstrap Normalization - Step 203

## Scope

Step 203 implements the Step 202 identity decision by aligning pane runtime
bootstrap ids with chart-surface pane ids. It does not add TF UI, indicators,
or new pane controls.

## Implemented State

- `DEFAULT_PANE_ID` is now `main`.
- Pane runtime bootstrap creates `main`, `secondary`, and `tertiary` records by
  default.
- `main` is the active pane; `secondary` and `tertiary` are inactive until
  layout or future UI work targets them.
- Chart hosts, status readouts, chart-data, chart-viewport, reset-view,
  maximize, and layout now share the same default pane ids.
- Primary chart display timeframe can be set directly on `main`; it no longer
  needs the old `pane-default` active-pane compatibility path.

## Test Coverage

- `pane-model-smoke.js` validates default pane records and the default pane
  store snapshot.
- `pane-runtime-smoke.js` validates pane runtime commands with `main` as the
  default active pane.
- `pane-identity-bootstrap-browser-step203-smoke.js` validates the real browser
  page bootstraps `main`, `secondary`, and `tertiary`, has no `pane-default`
  runtime record, and renders 5m primary chart data through `main`.
- Existing HTF browser smokes for manual-next, leftward history, auto-play, and
  reset view now set display timeframe directly on `main`.
- `chart-browser-regression-pack.js` includes the Step 203 browser guard.

## Residual Risk

Some chart-facing runtimes still keep active-pane fallback as defensive
compatibility. That fallback is no longer required for the primary chart
bootstrap path, but removing it should be a separate bounded step because it can
affect reload, projection preparation, and leftward-history edge cases.

## Step 204 Recommendation

Audit remaining active-pane fallback call sites and remove or narrow only the
ones proven unnecessary after Step 203:

- chart-entry manual-next pane lookup;
- chart-entry projection-preparation display timeframe resolution;
- chart-history leftward-history pane lookup;
- any display-timeframe control path that omits a pane id.

Keep the goal bounded to fallback removal/narrowing plus guard coverage. Do not
start TF UI or indicator implementation in Step 204.
