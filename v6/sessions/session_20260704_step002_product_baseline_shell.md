# V6 Session - Step 2 Product Baseline Shell

Date: 2026-07-04 PDT

## Result

V6 Step 2 is complete. The first screen is now a compact FXReplay-like
workstation surface with header chrome, chart surface, static candle visual,
price/time scale placeholders, floating transport placeholder, and footer
status bar.

## Commits

- `6c2611a feat(v6): expand workstation shell markup`
- `e9649f1 feat(v6): style product baseline shell`
- `0c708d2 test(v6): gate product baseline shell`

## Verification

- `node v6/tests/app-shell-browser-smoke.js`
- `node v6/tests/product-baseline-screenshot-smoke.js`
- `node v6/tests/runtime-core-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

The screenshot smoke writes `/tmp/v6-product-baseline-shell.png` and asserts
that the visible page is a workstation surface rather than a landing/demo page.

## Boundary Notes

- No real chart engine was introduced.
- No replay cursor, bar-data runtime, viewport intent, session state, or
  multi-pane model was introduced.
- The static candle visual is presentation-only and has no data ownership.

## Next

Step 3 should add the local replay session model with an in-memory repository
and smoke tests proving session state does not own chart, bars, or viewport
intent.
