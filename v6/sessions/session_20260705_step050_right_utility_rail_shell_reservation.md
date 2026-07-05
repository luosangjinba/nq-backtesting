# V6 Step 50 - Right Utility Rail Shell Reservation

Date: 2026-07-05

## Scope

Step 50 reserved the FXReplay-style right utility rail outside the chart price
scale without assigning runtime ownership to the future workflows.

## Commits

- `e4ccf7f5 feat(v6): reserve right utility rail shell`

## Implementation Notes

- Added a fixed-width right rail as a sibling of the chart surface inside the
  workstation main grid, keeping the chart engine host and fallback surface in
  the left chart column.
- Added inert shell entries for Object tree, Order, News/calendar, Journal,
  watch/tool, and Session settings.
- Added a shell-only Go to menu with key-time labels for Next Day Open, Next
  Session, Asian Session, London Session, New York Session, and Custom
  Settings.
- Kept all future workflow entries disabled or non-mutating. The Go to menu can
  open, but it does not dispatch replay, viewport, or data commands.
- Added `v6/tests/right-utility-rail-browser-smoke.js` to guard rail placement,
  inert labels, Go to menu content, and chart host dimensions.

## Verification

- `node v6/tests/right-utility-rail-browser-smoke.js`
- `node v6/tests/app-shell-browser-smoke.js`
- `node v6/tests/product-baseline-screenshot-smoke.js`
- `node v6/tests/fxreplay-ui-guardrails-smoke.js`
- `node v6/tests/fxreplay-ui-parity-gap-audit-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

## Next

Step 51 should reserve the right-rail Session settings panel shell, distinct
from the existing Workspace Settings panel, while keeping all settings inert
until a session-settings owner exists.
