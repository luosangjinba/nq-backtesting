# V7 Projection Domain

Status: R4.2 provider-neutral identity projection foundation (2026-07-20)

## Ownership

`core.projection-domain` is pure. It consumes immutable Raw Bar Batches,
capability definitions, registered pure policy ports, and one branded Replay
cursor proposal. It returns one immutable pane snapshot plus provenance.

It performs no provider I/O, cache mutation, Replay mutation, workspace commit,
chart write, viewport change, persistence, DOM work, or notification.

## Complete Input

Every projection binds:

- opaque pane identity;
- `InstrumentDefinition` and its supported provider/calendar;
- `TradingCalendar` id and revision;
- `TimeframeDefinition`, source-resolution compatibility, and aggregation
  policy id;
- registered Session Hours policy id;
- one or more ordered, contiguous Raw Bar Batches with a common provider,
  instrument, source resolution, and dataset revision;
- one branded Replay cursor proposal carrying the complete workspace
  transaction identity and exclusive target cutoff.

Session Hours and aggregation behavior arrive through frozen pure policy ports
with explicit deterministic declarations and revisions. The domain verifies
their ids against the selected capability definitions. It never branches on a
concrete instrument, timeframe, source-resolution,
aggregation, or Session Hours id.

## Projection Order

1. validate and normalize every public value boundary;
2. prove raw source identity plus global contiguous window/bar ordering without
   sorting or deduplication;
3. exclude source bars whose start is greater than or equal to the proposed
   Replay target;
4. apply Session Hours eligibility;
5. pass only eligible, no-future bars to the registered aggregation policy;
6. validate immutable, strictly ordered OHLCV output below the exclusive
   cursor;
7. attach exact source, capability, calendar, policy, dataset, request-key, and
  cursor-proposal provenance.

R5.4 provenance additionally records the explicit Session Hours mode and the
newest real eligible source-bar timestamp below the exclusive cursor. This
source-level visible-through value remains distinct from the start of an
aggregated display candle.

An empty source or an empty eligible projection is an explicit domain failure
in R4.2. Future product empty/unavailable presentation remains owned by the
transaction/UI state model rather than fake candles.

Earlier-history extension uses a dedicated pure Projection operation. It
reprojects only the acquired chunk and the oldest accepted boundary chunk so a
fixed-duration candle crossing that boundary is rebuilt correctly, then
preserves the already accepted ordered tail. Exact source request-key prefix,
capability/policy identity, Replay target, and visible-through invariants are
verified before the combined snapshot is returned. Work therefore remains
bounded as loaded history grows; the UI/runtime does not merge aggregate bars.

R6.7a distinguishes an empty initial Pane from a non-contributing history
prefix. If a Pane is already ready and the newly acquired plus boundary chunks
contain no eligible bars under the unchanged policy—for example consecutive
RTH closed-session windows—the operation preserves the accepted visible bars,
rebinds them to the current retained Replay proposal, and prepends the exact raw
request key. This advances historical coverage without publishing a false
empty Pane. Identity, cursor, contiguity, and request-key failures remain hard
Projection failures and are never converted into preservation.

## Targeted V6 Audit

Retained product behavior:

- Session Hours eligibility precedes aggregation;
- every eligible intermediate source bar is preserved for identity `1m`
  projection;
- higher-timeframe alignment belongs to one pure projection domain;
- output carries enough provenance to prevent ambiguous cache/projection reuse.

Rejected V6 behavior and structure:

- silently sorting and merging duplicate input timestamps;
- inclusive `bar.timestamp <= cursor` filtering; V7 uses exclusive
  `startEpochMs < targetEpochMs`;
- concrete timeframe maps and special `4h` branches in the core domain;
- Chart Data/runtime/event ownership inside projection;
- append/replace/prepend as distinct semantic projection paths.

No V6 source is imported or copied. V6 fixtures were used only to re-derive the
accepted behavior and identify the inclusive-cursor and silent-normalization
failure modes.

## R4.2 Fixture Scope

The accepted fixture uses NQ capability data, a one-minute source/display
definition, ETH policy identity, and an identity aggregation policy. Those ids
exist only in the independent Harness. Production code is capability-generic.

R5.2 and R5.3 now supply registered actual CME ETH/RTH eligibility and generic
fixed-duration aggregation policies behind these contracts. Calendar-aligned
day/week/month projection, runtime selection, multiple panes, and UI remain
separate roadmap steps.

## Gate

`tests/projection-domain-harness.js` proves deterministic deep-immutable output,
all intermediate `1m` bars, exclusive no-future behavior, eligibility before
aggregation, contiguous multi-window provenance, closed-session prefix
preservation with changed-policy/forged-chain rejection, 20 fixture negative
controls, and the absence of concrete capability-id branches.
