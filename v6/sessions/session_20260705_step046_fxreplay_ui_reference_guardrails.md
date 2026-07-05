# V6 Step 46 - FXReplay UI Reference Guardrails

Date: 2026-07-05

## Scope

Step 46 captured the FXReplay UI reference screenshots as V6 guardrails before
expanding UI parity. The goal is kernel consistency, not pixel-copying.

## Commits

- `5e9573d0 docs(v6): capture fxreplay ui guardrails`

## Implementation Notes

- Added `v6/docs/V6_FXREPLAY_UI_GUARDRAILS.md`.
- Documented top toolbar expectations, timeframe menu structure,
  Indicators/undo/redo placeholders, settings modal structure, side toolbars,
  bottom transport, trading/account chrome, visual tone, and ownership
  guardrails.
- Added `v6/tests/fxreplay-ui-guardrails-smoke.js` so future UI work cannot
  omit the guardrail document.
- Added the guardrails document to `v6/docs/INDEX.md`.

## Verification

- `node v6/tests/fxreplay-ui-guardrails-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

## Next

Step 47 should audit the current V6 workstation shell against these guardrails
before changing product chrome, menus, settings, or side toolbars.
