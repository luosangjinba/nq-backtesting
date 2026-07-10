# V6 Session - Step 252 Chart Foundation Next Slice Selection

Date: 2026-07-09

## Scope

Step 252 selected the next bounded chart-foundation slice after the Step 251
multi-pane active focus chain gate.

This step did not change runtime behavior.

## Decision

Step 253 should implement Multi-Pane Chart Foundation Regression Pack.

## Rationale

The full chart browser regression pack is intentionally broad. V6 now needs a
smaller pack that specifically protects multi-pane foundation work: pane data
bootstrap, replay append, viewport projection, leftward history, pane-local
reset, maximize/restore, display-timeframe active-pane targeting, and active
focus/readout consistency.

## Verification

- `node v6/tests/chart-foundation-next-slice-selection-step252-smoke.js`
- `node v6/tests/chart-foundation-next-slice-selection-step250-smoke.js`
- `node v6/tests/multi-pane-active-focus-chain-step251-smoke.js`
- `node v6/tests/product-direction-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

## Next

Step 253 should add and document the compact multi-pane chart foundation
regression pack.
