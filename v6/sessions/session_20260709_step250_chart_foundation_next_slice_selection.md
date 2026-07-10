# V6 Session - Step 250 Chart Foundation Next Slice Selection

Date: 2026-07-09

## Scope

Step 250 selected the next bounded chart-foundation slice after the Step 249
drag/scroll display stability reaudit.

This step did not change runtime behavior.

## Decision

Step 251 should implement Multi-Pane Active Focus Chain Gate.

## Rationale

Steps 245-249 covered replay/transport, date-range entry viewport alignment,
and drag/scroll display stability. The remaining roadmap risk most tied to the
current foundation is primary/non-primary multi-pane confusion.

Step 251 should consolidate visible active-pane focus, pane runtime active id,
top toolbar symbol/timeframe presentation, pane-local OHLC headers, and
display-timeframe command target selection into one explicit chain gate.

## Non-Goals

- No indicators.
- No Pine Script compatibility.
- No SMC/ICT overlays.
- No trading simulation, order tickets, or prop firm rule engines.
- No journal workflows.
- No layout redesign, resizing rewrite, or new timeframes.

## Verification

- `node v6/tests/chart-foundation-next-slice-selection-step250-smoke.js`
- `node v6/tests/drag-scroll-display-stability-reaudit-step249-smoke.js`
- `node v6/tests/product-direction-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

## Next

Step 251 should implement or consolidate the Multi-Pane Active Focus Chain Gate.
