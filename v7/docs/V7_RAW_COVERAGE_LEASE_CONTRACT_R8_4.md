# V7 Raw Coverage Lease Contract — R8.4

Status: executable pure recovery contract (2026-07-30)

## Purpose

`core.raw-coverage-lease-contract` defines the only supported way for a
transaction consumer to observe raw market coverage without becoming another
request, cache, merge, retention, or eviction owner. R8.4 defines and tests the
boundary only. R8.5 activates it through Bar Data Runtime and removes the
existing UI ledgers.

The module depends only on the provider-neutral Raw Bar Data value contract and
the complete Workspace Transaction identity contract. It performs no provider
I/O, caching, projection, Replay, chart, persistence, or UI work.

## Lease Scope

One version-one `RawCoverageLeaseScope` contains:

- one branded Workspace identity with exact Session id, activation generation,
  and transaction id;
- one or more immutable `RawBarRequest` windows;
- an explicit immutable policy limiting window count, each window span, and
  total leased span;
- stable request keys derived by the Raw Bar Data contract.

All windows must be ordered, non-overlapping, and share the exact provider,
instrument, source resolution, and dataset revision. Gaps are allowed because
market-closed periods and bounded provider partitions are explicit coverage,
not invented bars.

An empty request set, mixed source identity, overlap, unsafe aggregate, or any
policy overrun is rejected before a lease can exist. A scope contains requests
only; it never contains raw batches or bars.

## Read View

`createRawCoverageLease({ scope, readWindow })` wraps a synchronous cache-reader
port supplied by the future Bar Data Runtime activation. The resulting lease
exposes `withReadView({ identity, request, visit })`.

Every read must:

1. repeat the complete branded Workspace transaction identity;
2. match one exact request key in the bounded lease scope;
3. resolve synchronously from the owner-provided read port;
4. return a normalized batch matching that exact request;
5. consume the batch inside one synchronous callback.

Async readers and async visitors are forbidden because they would extend raw
access beyond the checked lifetime. Returning the raw batch or its raw bar
array directly from the visitor is also rejected. Derived projection values may
return normally. The lease stores only the reader capability and scope; each
batch remains owned by the injected Bar Data cache and is not retained by the
contract.

## Lifetime, Cancellation, And Disposal

A lease starts `active` and follows one of two paths:

```text
active -> cancelled -> disposed
active -------------> disposed
```

`cancel({ code })` requires a stable lower-kebab-case reason, aborts the public
signal synchronously, drops the owner reader, and makes every later read fail.
`dispose()` aborts an active lease with `lease-disposed`, drops the reader, and
is idempotent. Disposal after cancellation preserves the original cancellation
reason while moving the lease snapshot to `disposed`.

The public snapshot contains identity, request keys, status, and cancellation
code only. It contains no raw batch, cache contents, provider handle, Pane,
Replay cursor, display timeframe, Session Hours value, or chart state.

## Sole-Retention Rule

The architecture writer inventory now explicitly assigns
`rawMarketDataRetention` only to `core.bar-data-runtime`. Production scanning
continues to reject cache-like raw/source ledgers under UI or feature modules.
The two existing Replay Workspace UI findings remain blocking evidence for
R8.5; committing a pure contract must not falsely mark current production as
conformant.

H074 therefore advances from `declared` to `executable`, not `accepted`. Its
negative matrix covers boundedness, mixed sources, forged identity/scope,
unleased reads, asynchronous access, batch mismatch, raw escape, cancellation,
and post-disposal access. H074 can be accepted only after R8.5 activates the
lease in Bar Data Runtime and removes every UI raw-retention path.

## Scope Boundary

R8.4 changes no existing runtime integration, production composition, browser
UI, or interaction. It does not remove `SourceBatchLedger` or
`DisplayHistoryLedger`, alter provider behavior, or clear any R8.1 regressed
rule. Those changes remain assigned to their numbered later recovery steps.
