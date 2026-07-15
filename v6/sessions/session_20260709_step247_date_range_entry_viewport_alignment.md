# V6 Session - Step 247 Date-Range Entry Viewport Alignment

Date: 2026-07-09

## Scope

- Added a date-range entry owner-path audit/gate.
- Covered non-default session date-range entry through the real browser session
  setup form.

## Changes

- Added `v6/docs/V6_DATE_RANGE_ENTRY_VIEWPORT_ALIGNMENT_STEP247.md`.
- Added `v6/tests/date-range-entry-viewport-alignment-browser-step247-smoke.js`.
- Updated `v6/TODO.md` with Step 247 completion and Step 248 recommendation.

## Verification

- `node v6/tests/date-range-entry-viewport-alignment-browser-step247-smoke.js`
- `node v6/tests/chart-foundation-next-slice-selection-step246-smoke.js`
- `node v6/tests/replay-transport-chain-regression-pack-step245-smoke.js`
- `node v6/tests/product-direction-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

## Result

- The browser gate passed without runtime changes.
- The non-default date-range session opens with main-pane chart data visible in
  the initial visible logical range.
- The session row still distinguishes selected trading dates from actual chart
  start metadata.

## Next

- Step 248 should select the next bounded chart-foundation slice.
