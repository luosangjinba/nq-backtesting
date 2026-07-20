# V7 R5.5 Compact Workspace Controls — 2026-07-20

## Outcome

Implemented the browser-visible timeframe and Session Hours slice over the R5.4
atomic replacement runtime. The step is stopped at its required human review
gate.

## Delivered

- compact `1m`/`5m`/`15m`/`1h` and ETH/RTH toolbar controls;
- registered NQ capability cross-product with fixed-duration projection and
  exchange-aware eligibility;
- accepted Workspace snapshot as the only active-control truth;
- Replay cursor retention and manual-wall preservation across replacements;
- inline refresh/error feedback without covering the accepted chart;
- updated deterministic `1440x900` visual fixture.

## Automated Evidence

- all 33 V7 harness files pass;
- real Chrome proves `1m` to `5m`, ETH to RTH, retained cursor, preserved manual
  offset/span, compact controls, hidden centered update overlay, and Reset View;
- architecture boundary, hardening, source quality, cache/latency, atomic race,
  and visual fixtures pass;
- `git diff --check` passes.

## Deferred

No multi-pane, real provider, persistence, expanded Replay transport, custom
timeframes, or day/week/month aggregation was added.

## Review Gate

Human review should inspect default composition, active-state clarity,
timeframe switching, ETH/RTH switching, manual wall retention, Reset View, and
the absence of centered update text. R6 remains blocked until acceptance.
