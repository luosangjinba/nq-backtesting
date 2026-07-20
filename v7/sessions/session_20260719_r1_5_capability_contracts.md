# V7 R1.5 Capability Descriptor Contracts — 2026-07-19

## Trigger

R1.4 passed human review, opening the versioned extension-contract boundary.

## Boundary Decision

`core.capability-contract` owns six pure descriptor schemas:

- `TimeframeDefinition`;
- `MarketDataProvider`;
- `InstrumentDefinition`;
- `TradingCalendar`;
- `IndicatorModule`;
- `FormulaEngine`.

Every descriptor carries schema version, API version, namespaced opaque id,
package version, and display metadata. Unknown fields fail rather than becoming
implicit compatibility behavior. Exact decimal strings preserve future price
and quantity precision.

One isolated catalog normalizes definitions and validates provider/instrument,
calendar, and formula references. Selection negotiation resolves compatibility
before any product module starts. Concrete ids are Map keys only; core code
does not branch on their values.

Indicators may consume immutable no-future pane bars and return declarative
series/overlays only. Formula descriptors require versioned syntax, sandboxing,
and deterministic behavior. No evaluator or executable user code exists here.

This step adds no capability implementation, provider request, aggregation,
calendar calculation, persistence, Replay, bars, chart, DOM, UI, plugin loader,
permission runtime, or application composition root.

## Automated Gate

Passed before commit. The focused harness covers:

- independent boot through the accepted module host;
- all six schemas and deeply frozen negotiated results;
- optional indicator/formula removal;
- two isolated catalogs with different arbitrary fixed durations;
- provider/instrument/calendar/timeframe compatibility;
- automatic formula dependency resolution;
- production-source rejection of concrete capability-id branching;
- sixteen intentional schema, safety, reference, selection, and source-branch
  failures.

The Session, activation-generation, TransactionId, workspace-transaction,
module-host, architecture-boundary, architecture-hardening, source-quality,
foundation-interaction, and cache/latency harnesses also pass. Production source
contains no browser global, storage, timer, active-module state, legacy runtime
reference, concrete `1m`/`1h`/NQ/ES value, or concrete capability-id branch.
`git diff --check` passes.

## Human Review

Accepted by the user on 2026-07-19. The schemas express contracts rather than
implementations, concrete ids remain opaque lookup keys, optional analysis
capabilities can be absent, and no future feature engine was prematurely added.
This headless step has no visual or interaction surface.
