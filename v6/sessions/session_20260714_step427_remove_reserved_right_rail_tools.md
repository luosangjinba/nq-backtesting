# Session 2026-07-14 - Step 427 Remove Reserved Right Rail Tools

## Scope

Remove reserved Object tree, Order, and News entries while preserving the
functional Go-to workflow and future owner contracts.

## Decision

The right rail cannot be collapsed: Go-to is an accepted functional entry with
a menu, shortcuts, Custom Settings, and Replay navigation ownership. Removing
the rail would be a feature deletion rather than placeholder cleanup.

## Completed

- removed Object tree, Order, and News production placeholders;
- removed the unused Layers, Plus Circle, and Calendar SVG definitions;
- removed orphan icon-only and disabled rail styles;
- centered the remaining Go-to entry in the right rail;
- advanced the cleanup manifest through Step 427;
- changed right-rail coverage from disabled-placeholder presence to absence;
- retained Go-to, Orders/account contracts, Pane actions, chart scales, and
  pointer boundaries.

## Verification

- `node v6/tests/workspace-placeholder-absence-harness-step420-smoke.js`
- `node v6/tests/right-utility-rail-browser-smoke.js`
- `node v6/tests/replay-navigation-ui-step406-browser-smoke.js`
- `node v6/tests/account-trading-contract-smoke.js`
- `node v6/tests/workstation-rail-regression-audit-browser-smoke.js`
- `node v6/tests/bottom-account-chrome-browser-smoke.js`
- `node v6/tests/bottom-chrome-regression-audit-browser-smoke.js`

## Next

Step 428 should remove bottom Buy, Sell, Qty, Balance, Realized, Unrealized,
and Analytics placeholders. Preserve Replay transport and status ownership;
defer vertical reflow and broad visual acceptance to Step 429.
