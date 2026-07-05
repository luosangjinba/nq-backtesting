# V6 Step 47 - FXReplay UI Parity Gap Audit

Date: 2026-07-05

## Scope

Step 47 audited the current V6 workstation shell against the FXReplay UI
guardrails before changing product chrome, menus, settings, or side toolbars.

## Commits

- `c411c76b docs(v6): audit fxreplay ui parity gaps`

## Implementation Notes

- Added `v6/docs/V6_FXREPLAY_UI_PARITY_GAP_AUDIT.md`.
- Classified gaps for top toolbar, timeframe menu, Indicators/undo/redo,
  settings modal, side toolbars, bottom transport, trading/account chrome,
  chart status/OHLC, multi-pane chrome, and diagnostics.
- Marked gaps as shell-only UI, runtime-owned behavior, or deferred.
- Added `v6/tests/fxreplay-ui-parity-gap-audit-smoke.js`.
- Added the audit document to `v6/docs/INDEX.md`.

## Verification

- `node v6/tests/fxreplay-ui-parity-gap-audit-smoke.js`
- `node v6/tests/fxreplay-ui-guardrails-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

## Next

Step 48 should implement the first shell-only top toolbar parity slice:
instrument/search, interval command entry, Layout, Indicators, undo, redo, and
right-side utility placeholders. Controls without owners must remain disabled or
inert.
