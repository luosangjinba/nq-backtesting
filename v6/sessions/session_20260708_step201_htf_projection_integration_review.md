# V6 Session - Step 201 HTF Projection Integration Review

Date: 2026-07-08

## Completed

Step 201 reviewed the complete HTF projection chain from Step 193 through Step
200.

Commits:

- `79f800d1 docs(v6): review HTF projection integration`
- `395beb12 docs(v6): index HTF projection review`

## Changes

- Added `V6_HTF_PROJECTION_INTEGRATION_REVIEW_STEP201.md`.
- Added static coverage proving the allowed projection consumers remain
  explicit.
- Added Step 201 doc index coverage.
- Expanded `chart-browser-regression-pack.js` so every HTF browser gate from
  initial entry through reset view is included.

## Review Result

The HTF projection chain is coherent:

- chart-data projection owns aggregation and cursor capping;
- bar-data owns source requests/cache;
- chart-data owns pane-local display bars and merge behavior;
- chart engine renders already-ordered display bars;
- replay owns cursor/reveal state only;
- auto-play remains a scheduler over manual-next;
- reset view remains a viewport operation over applied display chart-data.

## Residual Risk

Pane identity consistency is the next foundation risk. Several paths currently
support a defensive active-pane fallback because chart pane ids and pane runtime
ids can differ (`main` vs `pane-default`).

## Verification

- `node v6/tests/htf-projection-integration-review-step201-smoke.js`
- `node v6/tests/htf-projection-doc-index-step201-smoke.js`
- `node v6/tests/chart-browser-regression-pack.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

## Next

Step 202 should review pane identity and display-timeframe consistency before
new timeframe UI, indicators, or broader chart features.
