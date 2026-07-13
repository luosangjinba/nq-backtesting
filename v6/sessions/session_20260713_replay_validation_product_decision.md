# Session 2026-07-13 - Replay Validation Product Decision

## Trigger

The user supplied `V6_PRODUCT_RESEARCH.md` as a discussion report and explicitly
asked that it not be treated as a conclusion. The report proposed changing V6
from a replay-practice workstation to a trading-system validation workstation,
while the user required that the successful V5-style replay practice direction
not be abandoned.

## Research correction

Current official product pages contradicted the report's broad empty-market
claim. FXReplay and TradeZella already combine replay, journaling, tags, and
analytics; TradeZella advertises ICT/FVG capability. Lightweight Charts 5.2
provides primitive/plugin rendering and examples, not a complete interactive or
semantic drawing domain.

## Decision

V6 is now constrained as an open-source, local-first SMC/ICT trading-system
validation and replay-practice workstation.

- Validation is the product outcome.
- Replay remains the protected experiment/practice environment.
- Free Practice and Validation Campaigns share one runtime foundation.
- Statistics remain auditable to immutable trials and replay-visible evidence.
- Prospective and retrospective evidence remain distinct.
- The current `1m` source is the first validation baseline, not tick-accurate
  execution and not a permanent prohibition on finer provider windows.
- V5 replay interaction lessons may be reused; its runtime ownership model may
  not be ported.

## Roadmap effect

The current foundation queue does not change. Step 401 visual acceptance is
recorded complete and Step 402 remains the loaded-window Go-to-time slice.
After foundation closeout, the roadmap preserves Free Practice before building
one thin Validation Campaign vertical slice. Broad ICT semantics, automatic
recognition, AI, and large analytics dashboards remain gated behind 30-50 real
trials of the thin loop.

## Canonical source

`v6/docs/V6_REPLAY_VALIDATION_PRODUCT_DECISION.md` is normative.
`v6/docs/V6_PRODUCT_RESEARCH.md` remains non-normative research provenance.
