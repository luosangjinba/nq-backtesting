# V6 Post-Settings Product Gap Re-audit - Step 417

Date: 2026-07-13

## Current Evidence

The chart/replay foundation now supports real data, timeframe switching,
leftward history, multi-pane layouts, replay progression, session Go-to, and
the accepted lightweight Settings catalog. The visible Order rail remains
disabled, drawing/text tools remain reserved, and the current Journal surface
does not own prospective chart evidence.

The next gap is therefore no longer generic chart configuration. It is the
missing transition from reliable replay into the product loop:

`replay-visible state -> pre-result judgment/trade plan -> later outcome`

## Existing-Library Check

Lightweight Charts 5.2 exposes `createPriceLine`/`removePriceLine` for rendering
a price level and exposes Series/Pane Primitives for custom annotations. These
are suitable future rendering mechanisms, but they do not provide trade-plan,
order, replay-provenance, persistence, or outcome ownership. The
awesome-tradingview catalog likewise does not supply the V6 domain boundary.

References:

- https://tradingview.github.io/lightweight-charts/docs/api/interfaces/ISeriesApi
- https://tradingview.github.io/lightweight-charts/docs/plugins/intro
- https://github.com/tradingview/awesome-tradingview

V6 should reuse native price lines or primitives when rendering is selected,
not build a second chart engine. It must still own the semantic artifacts and
workflow.

## Gap Matrix

| Candidate | Current state | Product value | Decision |
| --- | --- | --- | --- |
| more Settings parity | accepted catalog complete | low | stop |
| broad drawing toolkit | reserved disabled rail | useful later, high interaction cost | defer |
| generic Journal polish | review surface exists | does not create prospective evidence | defer |
| simulated order lifecycle | no active owner/runtime | required for Free Practice | sequence after plan boundary |
| prospective trade plan with replay provenance | absent | first missing link in both workflows | select next |
| validation campaign/dashboard | absent | north-star value but too large without artifacts | defer until thin owners exist |

## Selected Next Step

Step 418 should be a planning-and-contract step for a **Prospective Trade Plan
Owner Boundary** shared by Free Practice and future Validation Campaigns.

The bounded artifact should capture at least:

- direction;
- planned entry, stop, and target;
- invalidation/note;
- Pane, symbol, and timeframe references;
- replay cursor and no-future boundary at creation;
- explicit prospective provenance.

Step 418 must define commands/events, immutable snapshot shape, validation,
persistence responsibility, and a chart-rendering handoff. It must not yet
implement fills, P&L, analytics, a full ICT taxonomy, or a generic drawing
system.

## Ownership Constraints

- Replay remains the sole cursor/reveal owner.
- The Trade Plan owner records a read-only replay provenance snapshot; it does
  not advance Replay.
- Chart Surface/adapter remains the sole chart mutation path.
- A future renderer may use native price lines/primitives but cannot become the
  durable plan owner.
- Orders/execution must remain a later distinct owner; a plan is not a fill.
- Journal may reference a plan but cannot mutate it directly.

## Gate For Step 418

No production UI is activated until the contract proves:

- prospective creation cannot see or store future bars;
- canonical price/time validation is explicit;
- plan and execution remain separate;
- persistence and drillback identifiers are stable;
- the same plan artifact can serve low-ceremony Free Practice and later attach
  to a Validation trial without forking Replay or Chart ownership.
