# Session 2026-07-14 - Step 428 Remove Bottom Trading Placeholders

## Scope

Remove bottom account/trading placeholder content without changing Replay
transport, status ownership, or the vertical layout contract reserved for Step
429.

## Completed

- removed Buy, Sell, Qty, Balance, Realized, Unrealized, and Analytics markup;
- removed the entire dedicated bottom placeholder CSS family;
- advanced the cleanup manifest through Step 428;
- converted historical bottom browser tests to absence and owner-contract
  coverage;
- retained account/trading, Orders, session-summary, and analytics contracts;
- retained Replay transport, status, and session account facts outside the
  removed workstation chrome.

## Verification

- `node v6/tests/workspace-placeholder-absence-harness-step420-smoke.js`
- `node v6/tests/bottom-account-chrome-browser-smoke.js`
- `node v6/tests/bottom-chrome-regression-audit-browser-smoke.js`
- `node v6/tests/workstation-chart-slice-selection-step140-smoke.js`
- `node v6/tests/workstation-ui-parity-gap-reaudit-smoke.js`
- `node v6/tests/account-trading-contract-smoke.js`
- `node v6/tests/orders-contract-smoke.js`

## Next

Step 429 should remove the empty bottom grid row, reclaim chart height, and
recalculate Replay transport default/drag bounds. Persisted transport positions
must clamp safely; status and chart scales must remain unobstructed.
