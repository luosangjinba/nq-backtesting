# V7 Complete Pane-set Materialization

Status: R6.3 headless atomic materialization foundation (2026-07-21)

## Ownership

`core.pane-set-materialization` is a stateless adapter between the existing
Workspace Transaction Runtime stages and per-Pane acquisition/projection ports.
It does not create another coordinator or accepted-state owner.

- Workspace Transaction Runtime still owns supersession, cancellation, and the
  accepted workspace revision;
- Replay Runtime still owns the one cursor proposal and visible commit;
- Bar Data Runtime remains the only real requester/cache owner;
- Projection Domain remains the owner of Pane bar projection;
- Chart Snapshot Application remains the only chart-series writer boundary;
- Viewport Runtime remains Pane-local and is passed through unchanged.

## Transaction Input

One branded Pane-set transaction input binds:

- the exact R6.2 Replay × Pane response plan;
- one frozen opaque acquisition request for every affected Pane;
- the same stable Pane order as the response plan.

Missing, duplicate, reordered, mutable, or extra requests fail before owner
ports run. Single Pane is the size-one form of the same contract.

## Acquisition And Projection

The materialization adapter exposes the existing generic `acquisitionPort` and
`projectionPort` expected by Workspace Transaction Runtime.

Acquisition delegates one request per Pane under the same transaction identity,
Replay proposal, operation, and AbortSignal. All acquired values must be frozen.
No acquired subset can become a workspace snapshot.

Projection delegates every acquired Pane under that same proposal. A Pane may
return either:

- a ready immutable Projection Domain snapshot; or
- a branded `no-source-data`/`no-eligible-source` empty result.

A comparison Pane with no eligible data therefore does not stall or fork the
shared Replay clock. Every ready result must match its planned Pane id and the
exact shared cursor proposal.

Only after every Pane settles does the adapter create one schema-v2 immutable
Pane-set snapshot containing the response plan, cursor proposal, and complete
ordered result set.

## Atomic Chart Boundary

R6.3 extends the existing `core.chart-snapshot-application` module with a
Pane-set constructor; it does not add another writer module. The boundary
validates:

- exact transaction identity and proposal start cursor;
- exact Pane count and stable order;
- ready/empty result schemas;
- instrument, timeframe, Session Hours, calendar, and proposal provenance;
- exact target and movement direction for resolved navigation actions.

The injected adapter stages the complete set without visible mutation and calls
`applyVisible()` once. Only one branded receipt for the exact complete snapshot
can publish application completion. Any acquisition, projection, staging,
application, stale, or cancellation failure leaves Replay, Workspace, and
Chart accepted state unchanged.

The current real browser remains on the accepted single-Pane constructor. R6.5
will migrate it to the Pane-set constructor while adding real multi-Pane hosts;
R6.3 adds no browser-visible behavior and keeps both constructors inside the
same sole-writer module during that bounded migration.

R6.4 consumes this boundary unchanged for every non-no-op Replay navigation
action. Target resolution occurs in the cancellable Replay proposal stage;
after that, the same complete acquisition, Projection, and single visible apply
path handles forward ranges and backward replacements.

## R6.3 Exclusions

- no Previous/Autoplay/Restart/GoTo Replay Runtime mutation API;
- no real NQ/ES multi-request composition;
- no Lightweight Charts multi-host adapter;
- no Pane layout, focus outline, toolbar targeting, or browser interaction;
- no persistence or Economic Calendar behavior.

## Gate

`tests/pane-set-materialization-harness.js` proves two-Pane mixed NQ/ES and
`1m`/`4h` success, single visible apply, comparison-Pane empty acceptance,
acquisition/projection/visible failure preservation, slow-old/fast-new stale
rejection, exact proposal/provenance checks, and 22 negative/race controls.
