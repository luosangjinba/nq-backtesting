# V6 Session - Step 213 Next Foundation Slice Selection

## Summary

Step 213 selected the next foundation slice under the updated SMC/ICT
backtesting/journal product direction.

Completed commit:

- `de9963fa docs(v6): select step 214 foundation slice`

## Decision

Step 214 should implement **TF / Projection / Time Domain Unification Readiness
Audit**.

This keeps the project focused on chart foundation reliability before adding
indicator UI, SMC/ICT overlays, or broader strategy-specific behavior.

## Rationale

The recent architecture audit found the same class of risk that caused the
leftward-history bug: similar domain rules are repeated in different modules.

The next slice should audit and plan unification for:

- timeframe parsing and formatting;
- timestamp parsing and API formatting;
- source-to-display bar projection;
- projection source summary records.

## Non-Goals

- no projection rewrite in Step 214;
- no new supported timeframes;
- no indicators, main/sub-pane indicator UI, or Pine Script support;
- no SMC/ICT overlays such as liquidity, FVG, order blocks, market structure,
  or displacement tools;
- no trading, order tickets, prop firm rule engines, or pseudo-live simulation.

## Verification

- `node v6/tests/next-foundation-slice-selection-step213-smoke.js`
- `node v6/tests/product-direction-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`
