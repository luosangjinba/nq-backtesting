# V6 Step 91 - Session Analytics Read-only Surface

Date: 2026-07-07

## Summary

Step 91 added the first read-only Recent Sessions Stats surface owned by
`session-analytics`.

Changed:

- added `v6/src/session-analytics/session-analytics-surface-model.js`;
- added `v6/src/shell/session-analytics-surface.js`;
- enabled the Recent Sessions Stats row action as `surface-ready`;
- rendered session metadata and explicit unavailable metric placeholders;
- kept Summary and Stats surfaces mutually exclusive;
- preserved Escape close, close-button focus, and focus return behavior;
- added browser coverage for Stats open/close/focus, unavailable metrics, Copy
  remaining disabled, and runtime invariants.

## Boundary

Stats is read-only and metadata-only. It does not compute analytics in the
dashboard and does not load bars, open chart runtime, advance replay, touch
viewport intent, mutate sessions, read orders, read journal entries, or read
calendar data.

The unavailable metric placeholders are intentionally explicit until future
owners expose read contracts for trades/orders/journal/calendar data.

Copy remains disabled.

## Commits

- `bc49e851 feat(v6): add session analytics surface model`
- `7b9f8846 feat(v6): open read-only session stats surface`
- `f4f00ed6 test(v6): verify read-only session stats surface`

## Verification

- `node v6/tests/session-analytics-contract-smoke.js`
- `node v6/tests/session-analytics-surface-model-smoke.js`
- `node v6/tests/session-row-action-boundaries-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `node v6/tests/session-analytics-surface-browser-smoke.js`
- `node v6/tests/session-summary-surface-browser-smoke.js`
- `node v6/tests/recent-sessions-controls-browser-smoke.js`
- `node v6/tests/session-dashboard-browser-smoke.js`
- `git diff --check`

## Next

Step 92 should define the Session Copy owner contract before enabling the Recent
Sessions Copy action.
