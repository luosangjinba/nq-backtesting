# V7 Second-Level Replay And Tick-Sourced Data — Pre-Decision Memo

Date: 2026-08-01
Updated: 2026-08-06
Status: current deferral decision recorded; future product decision and
implementation explicitly deferred

## Purpose And Activation Boundary

This memo preserves the product and architecture discussion for a possible
second-level historical Replay capability. It binds the present decision not
to activate that capability: the current minute-sourced V7 product remains
valid without simulated-live training, and second-level work is deferred rather
than rejected. It does not approve a future product, allocate a delivery step,
select a data vendor, or authorize research or implementation.

Work may begin only after the current system's human-review obligations are
closed. At activation time, every applicable `humanReviewRequired` rule must
either carry explicit acceptance evidence or be explicitly retired/superseded
through the governed rule lifecycle. A pending rule must not be treated as
accepted merely because later work appears to cover it.

As of 2026-08-01, the registry still reports H001, H003, H004, H070, H080,
H081, and H082 without acceptance evidence. This memo resolves none of them.
The registry and TODO must be inspected again when the proposed work is
eligible to start.

## Current Product Decision

V7 will not productize second-level data during the open phase-one acceptance
pass. Minute-sourced Replay and its derived higher timeframes remain the
supported product. Second-level data is not an acceptance requirement and the
absence of simulated-live execution does not prevent the workstation from
delivering historical Replay, validation, and deliberate practice.

The decision is based on four current facts:

1. direct-second or tick history has a materially higher recurring data cost
   and stricter licensing/export requirements;
2. one-second source data can increase source-point volume by roughly sixty
   times relative to one-minute data, expanding storage, transport, decode,
   aggregation, cache, and low-memory-host obligations;
3. without an accepted simulated-order, fill, feedback, or scoring workflow,
   finer visual bars do not yet form a complete new product outcome;
4. mature competitors already specialize in simulated-live training, so
   feature parity alone is not a sufficient reason to divert effort from V7's
   Replay reliability and validation workflow.

No second-data subscription, production ingestion path, dedicated service,
cache tier, UI control, or speculative core abstraction is authorized now.
Ordinary foundation work should remain capability-driven and avoid new
minute-only assumptions, but must not generalize code solely for this deferred
candidate.

An observed pause when another product switches between minute and second
timeframes is not evidence of its internal cache architecture. It could be a
resolution-tier fetch, decompression, aggregation, chart rebuild, or cold-cache
operation. V7 must base any later design on its own measurements rather than
reverse-engineering an interface symptom.

## Activation Signals And Hard Gates

After every applicable human-review obligation is explicitly closed, formal
investigation should begin only when at least three of these four signals are
present:

1. repeated training evidence shows that one-minute data causes materially
   invalid entry/exit practice;
2. simulated execution and feedback is accepted as a next-phase core workflow,
   or second-level visual practice is separately shown to deliver enough value;
3. a provider's complete recurring cost, usage rights, durable export, and
   derived-data terms are sustainable;
4. a representative offline sample indicates that `1s`/`5s` can meet proposed
   cold/warm latency, storage, and supported-host resource budgets.

Meeting three signals only authorizes a measured investigation. Product
implementation still requires all hard evidence: an explicit training scope,
acceptable data rights and total cost, representative sample reconciliation,
accepted one/four-pane browser performance, a supported-host policy including
an explicit decision for the 512 MB class, and preserved no-future/atomicity/
single-owner contracts.

## Product Motivation

The motivating user needs are:

1. Second-level data materially improves discretionary entry/exit practice.
   Five-second Replay can be useful, while one-minute Replay cannot reproduce
   the approach, hesitation, and intra-minute price movement of a realistic
   trading environment with sufficient precision.
2. Some otherwise suitable historical-data providers offer ticks but no
   second bars. Their tick data should be usable as an upstream source from
   which the local workstation deterministically derives seconds.
3. A provider offering reliable direct seconds at a reasonable total price is
   preferable when its history, export rights, provenance, and quality satisfy
   the product contract.

The candidate product capability is therefore **second-level Replay**. Tick is
primarily an acquisition format and optional execution-evidence layer; it is
not automatically a user-visible chart timeframe or a second Replay product.

## Candidate Direction

Both direct-second and tick-derived datasets should normalize into one
provider-neutral `source-resolution.1-second` bar timeline:

```text
direct second provider -------------------+
                                           +--> canonical 1s bars
tick provider --> normalize --> aggregate +          |
                  |                                   v
                  +--> retained tick evidence    existing Bar Data
                                                   -> Projection
                                                   -> Replay Workspace
                                                   -> sole Chart writer
```

Downstream Replay, Session Hours, timeframe aggregation, Workspace atomicity,
Viewport, and Chart ownership should not know whether a one-second bar was
directly supplied or derived from ticks. Provenance must retain that
distinction, including provider, dataset revision, source event kind,
aggregation policy revision, timestamp precision, and completeness evidence.

This direction follows the existing capability contract: seconds/ticks are
provider-resolution and execution-precision capabilities and must not create a
second Replay or Chart runtime.

## API Boundary Under Consideration

The preferred final transport shape is a versioned seconds-capable V7 Bars
endpoint plus an optional bounded Tick endpoint:

```text
GET /v7/bars
  ?instrumentId=instrument.cme.nq
  &resolutionId=source-resolution.1-second
  &startEpochMs=...
  &endEpochMs=...

GET /v7/ticks
  ?instrumentId=instrument.cme.nq
  &startEpochUs=...
  &endEpochUs=...
  &limit=...
  &after=timestamp:sequence
```

The two routes may initially live in one local API process. Separating routes
or later separating transport services does not permit separate client-side
request/cache ownership: the existing Bar Data owner remains the sole raw
market-data acquisition and retention boundary.

A later implementation may use different internal storage partitions or cold/
warm materializations for minute and second resolutions, but those are adapters
behind the same Bar Data ownership boundary. A distinct source-resolution
cache must not become a second client-side cache owner, Replay runtime, or
Chart writer.

Extending `/v4/bars` is possible for a disposable prototype but is not the
preferred final boundary. Its current adapter hardcodes one-minute requests,
seven-day transport chunks, and a one-minute dataset revision. Those are
legacy transport assumptions rather than a seconds/ticks contract.

The final wire format remains open. Object-per-event JSON is acceptable only
for small diagnostic samples. Sustained tick transport should evaluate a
bounded columnar/binary representation and decode outside the browser main
thread. Every response must be capped by event count and encoded bytes, not
only by elapsed time.

## Canonical Data Shapes

One-second OHLCV already fits the semantic Raw Bar shape when paired with a
registered one-second source resolution. It must retain strictly increasing
bucket starts and exact half-open coverage.

A real Tick contract cannot be disguised as Raw Bar. At minimum it needs:

- an exact timestamp representation appropriate to the source precision;
- a sequence/tie-break key for multiple events with the same timestamp;
- an event kind such as trade or quote;
- integer price ticks rather than an avoidable floating-point wire identity;
- size and, when supplied, bid/ask prices and sizes;
- provider, instrument, dataset revision, schema, and coverage provenance.

Trade-only ticks improve observed price-path precision but cannot prove bid/ask
spread, queue position, or actual passive-fill probability. The product must
not label trade-only evidence as quote- or order-book-accurate execution.

## Replay And Execution Precision

If later approved, the first candidate scope should remain deliberately small
and bar-centric:

- Replay advances on registered second-duration steps;
- the initial Chart catalog is limited to canonical `1s` and derived `5s`
  unless benchmark evidence justifies another registered aggregate;
- a tick-derived dataset is aggregated before normal Pane projection;
- raw ticks remain optional evidence for ordering events inside a second.

This scope does not require a user-visible `Next Tick` action. A true Tick
Replay mode would require a separate decision because multiple events may
share one millisecond and the current time cursor would need an exact event
position such as `(epochUs, sequence)`. It must extend the one shared Replay
clock rather than introduce a second cursor.

For later trade simulation, the semantic engine may process every retained
tick while visible Chart commits are coalesced to at most one per animation
frame. Semantic processing must never skip an event merely because the display
cannot paint thousands of frames per second. If stop and target are both
touched inside one second and no tick ordering exists, the result must be
marked ambiguous or resolved by a declared conservative policy.

## Performance Hypothesis And Required Constraints

Smooth second-level Replay is considered feasible but is not yet an accepted
performance fact. Chart cost is primarily determined by visible point count,
not by how much wall-clock time each point represents. A bounded 2,000-bar
window is still about 2,000 Chart points whether it covers 33 hours at `1m` or
33 minutes at `1s`.

The candidate implementation must therefore preserve these constraints:

- never load a Session-wide tick collection into Workspace or Chart state;
- request and retain sliding windows bounded by bars/events and bytes;
- precompute/materialize `1s` and optionally `5s` bars for ordinary chart and
  history use instead of rescanning ticks on every interaction;
- decode and aggregate large event batches off the browser main thread;
- avoid one frozen JavaScript object per retained tick in visible candidates;
- acquire and aggregate one exact instrument/resolution input once per
  transaction, then reuse it across equivalent Panes;
- update the forming candle incrementally and retain the existing segmented
  writer for completed Replay bars;
- process all execution events semantically while rate-limiting only visual
  presentation;
- keep future data cacheable but invisible past the accepted Replay cursor.

Replay-step eligibility also needs a source-point budget. A `4h` step reveals
240 source bars on `1m`, but 14,400 source bars on `1s`. A capability such as
`maximumRevealSourceBars` should bound one action without hardcoded timeframe
ids. A starting investigation range of roughly 240–500 revealed source bars is
reasonable, but the binding value must come from measured evidence.

The current foundation still contains minute-specific request, history,
prefetch, and timeframe constants. A conforming implementation must generalize
those through registered source-duration capabilities; it must not add `1s`
branches to Replay, Chart, or Workspace core.

## Data Storage And Reproducibility

The local-first candidate pipeline is:

1. retain the vendor file as immutable source evidence outside the repository;
2. normalize timestamps, instruments/contracts, event type, ordering, and
   price/quantity precision;
3. reject or explicitly account for duplicates, out-of-order events, gaps,
   corrupt envelopes, and contract-roll boundaries;
4. materialize canonical `1s` bars and coverage metadata;
5. publish a new immutable dataset revision only after reconciliation passes;
6. keep raw ticks available for targeted execution drill-down without making
   them normal Chart payloads.

Open-source software does not imply redistributable market data. Vendor terms
must permit local historical use, durable export, derived-bar creation, and the
intended user workflow. Proprietary data must not be committed to the public
repository.

## Provider Decision Criteria

Direct seconds should be evaluated first when commercially reasonable. Tick
ingestion remains the fallback and may still be valuable as execution evidence.
The later provider comparison must use current primary sources and bind:

- NQ/ES coverage, history depth, missing days, and update cadence;
- individual-contract versus continuous-contract semantics and roll handling;
- whether the product is trades, quotes, MBP, or vendor-aggregated seconds;
- timestamp precision, sequence guarantees, timezone, and session treatment;
- bulk local export, API limits, revision/correction policy, and reproducibility;
- license restrictions for individual use, application use, and open-source
  distribution boundaries;
- complete cost, including exchange, historical, API, and export fees.

Provider names, prices, and terms are intentionally not frozen in this memo;
they are time-sensitive and must be researched when the decision is activated.

## Evidence Required Before A Binding Decision

The future decision package must include:

1. a representative user-supplied tick sample audit;
2. a current direct-seconds/tick-provider comparison;
3. deterministic tick-to-`1s` aggregation and gap/reordering fixtures;
4. storage size, scan rate, encoding size, decode cost, and cold/warm request
   measurements;
5. real Chrome `1s`/`5s` Manual Next and Autoplay measurements for one, four,
   and eight Panes, including same- and mixed-timeframe layouts;
6. exact no-future, Session Hours, aggregation, rollback, Crosshair, Settings,
   history, and dataset-revision evidence;
7. a declared policy for same-second execution ambiguity and a separate scope
   decision for any proposed `Next Tick` mode;
8. confirmation that existing accepted latency contracts are preserved or an
   explicitly reviewed replacement contract.

## Deferred Decision Questions

- Do measured `1s`/`5s` results justify productization, and is there evidence
  for adding any later `10s`/`15s`/`30s` catalog?
- Is second-level visual/manual training the complete first scope, or is
  tick-ordered fill simulation required at launch?
- Which event types are available in the user's data, and what ordering and
  correction guarantees accompany them?
- Should canonical `1s` bars always be materialized offline, or may a bounded
  first-use build publish a durable derived revision?
- What source-point budget should constrain Replay-step choices when any Pane
  consumes seconds?
- What storage/cache budgets are appropriate for the supported local machine?
- Which provider offers the best valid total cost after data rights and export
  requirements are included?

## Activation Sequence

After all current human-review obligations are explicitly closed:

1. re-audit the rule registry and TODO for zero silently pending blockers;
2. confirm that at least three activation signals are evidenced;
3. define the training outcome before selecting data or UI;
4. inspect a representative tick/direct-second sample and record its exact
   semantics;
5. research current direct-second and tick-provider offerings;
6. benchmark a throwaway offline `tick -> 1s` pipeline without changing V7;
7. decide whether the 512 MB class remains supported for seconds or receives
   an explicit higher minimum;
8. convert this memo into a binding product/architecture decision;
9. only then assign a delivery step, budgets, contracts, harnesses, and an
   implementation plan.
