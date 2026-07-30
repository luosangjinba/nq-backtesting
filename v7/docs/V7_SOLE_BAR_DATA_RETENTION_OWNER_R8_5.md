# V7 Sole Bar Data Retention Owner — R8.5

Status: completed recovery activation (2026-07-30)

## Outcome

R8.5 activates the R8.4 Raw Coverage Lease contract through
`core.bar-data-runtime`. Bar Data Runtime is now the sole production owner of
raw request, exact LRU cache, accepted coverage, staged coverage, transient
read views, merge/reuse decisions, eviction, and cleanup.

Replay Workspace UI no longer owns `SourceBatchLedger`,
`DisplayHistoryLedger`, cached source-bar arrays, or a source traversal cache
reader. Those modules and every production reference to them are removed.

## Owner Boundary

Each Bar Data Runtime constructs one private Raw Coverage Store with explicit
finite limits:

- at most 16 coverage consumers;
- at most 512 ordered windows per consumer;
- at most 366 days per raw window;
- at most ten 366-day years of aggregate retained span per consumer.

The normal exact-window LRU remains independently bounded. If its exact entry
has been evicted, the owner may synthesize that exact request from accepted,
contiguous, same-source coverage without another provider call. No synthesized
or retained batch is exposed on a lease, snapshot, Pane state, or UI ledger.

## Transaction Activation

Pane materialization acquires a lease with complete Workspace transaction
identity, one Pane consumer id, a bounded request, caller AbortSignal, and one
of three owner operations: navigation, history extension, or source
replacement. Bar Data Runtime stages the ordered coverage set and returns only
the revocable callback capability plus request descriptions.

Projection consumes every raw batch through nested synchronous `withReadView`
callbacks. Only the derived immutable Pane snapshot escapes. Successful
Workspace completion promotes the staged coverage; rejection cancels and
disposes every staged lease. Pane removal releases its accepted coverage.

Replay source traversal uses a separate ephemeral callback-scoped lease. Its
visitor computes the final source/target epochs before returning, so raw bars
never escape into Replay Navigation or UI state.

## Delay, Cancellation, And Disposal

Caller cancellation rejects the pending lease activation even when an
identical shared provider request remains useful to the owner. A late provider
completion may populate only the owner cache; the cancelled transaction gets
no lease and no state effect. A later current transaction can safely reuse the
validated cache result.

Runtime disposal invalidates every live lease, rejects queued/active request
consumers, aborts provider work, and clears exact, accepted, staged, and
transient raw state. Reads after rejection or disposal fail deterministically.

## Projected Display History

Projected higher-timeframe display history is not raw Replay evidence. Its UI
ledger is nevertheless removed so the adapter has no market-data retention
domain. Pure Projection Domain helpers now compose compatible projected bars
from the accepted immutable Pane snapshot and record bounded request/window
provenance there. Selection changes cannot inherit incompatible projected
history.

## Recovery Evidence

H074 is accepted. The production writer scan now finds exactly one
`rawMarketDataRetention` writer, `core.bar-data-runtime`. The two R8.5
`BUG-V7-0002` findings are closed; the exact baseline has 43 modules, 105
actual dependency edges, 109 construction sites, nine critical writer sites,
and four later-step blocking findings.

Focused production harnesses prove exact-LRU eviction followed by accepted-
coverage reuse, bounded history, delayed caller cancellation, inactive Pane
release, rejection, and disposal. All 72 top-level harnesses also pass,
including the real V4 API and Chrome interaction/performance gates.

This step changes no HTML, styling, labels, control behavior, chart semantics,
or interaction contract. It therefore closes through automated evidence with
no manual UI review.
