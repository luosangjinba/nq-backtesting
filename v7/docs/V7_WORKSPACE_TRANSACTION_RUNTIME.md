# V7 Workspace Transaction Runtime

Status: R11.1 recovery semantics implemented; automated closure in progress

## Ownership

`core.workspace-transaction-runtime` is the sole coordinator for chart-visible
workspace changes within one branded Session activation. It owns transaction
supersession, cancellation cleanup, the current complete identity, and the
accepted workspace snapshot revision. It does not own Replay cursor semantics,
raw acquisition, projection rules, chart series, viewport intent, or UI.

Every accepted request carries one immutable lifecycle intent plus a frozen
domain input. The intent contains the complete:

`sessionId + activationGeneration + transactionId`

Raw strings and cross-Session/cross-activation identities fail before any owner
port is invoked. A transaction identity can enter one runtime only once.

## Current Global Stage Order

R8.9 invokes injected public ports in one direction:

1. request an inert Replay proposal, acquire, and project;
2. build one branded immutable semantic candidate;
3. prepare Chart, Replay, Workspace State, and publication without mutation;
4. reversibly apply Chart and await its painted receipt;
5. perform the final complete-identity currency check;
6. synchronously apply Replay, Workspace State, and publication/persistence;
7. finalize publication first; publishing the accepted coordinator revision is
   the single irreversible decision;
8. attempt finalization of Chart, Replay, and Workspace State even if another
   post-decision finalizer fails;
9. return exactly one committed terminal lifecycle envelope.

Any preparation or application failure rolls back every retained participant
in reverse order. Cleanup continues after an individual cleanup failure. The
last accepted Chart, Replay clock, semantic Workspace State, publication model,
persistence value, and coordinator revision therefore remain one coherent prior
revision.

If rollback or reject cannot prove that prior state was restored, the runtime
enters `poisoned`, aborts every active record, and rejects every later `begin()`
until the containing Session activation is reconstructed. If failure occurs
after publication has made the irreversible decision, the result remains
`committed`; remaining finalizers are still attempted and any incomplete
cleanup poisons the activation. A committed workspace is therefore never
misreported as failed and never receives an invalid partial rollback.

## Historical R4.1 Stage Order

The coordinator invokes injected public ports in one direction:

1. request an inert Replay proposal;
2. acquire required input through the acquisition port;
3. project one immutable workspace snapshot;
4. request an exact visible-completion acknowledgement;
5. perform the final complete-identity currency check;
6. synchronously commit Replay visible progress and the accepted workspace
   snapshot revision;
7. return exactly one terminal lifecycle envelope.

The visible-completion acknowledgement is branded and binds both the complete
transaction identity and the exact projected snapshot object. A structural
lookalike, foreign identity, or acknowledgement for another snapshot cannot
commit.

R5.4 passes the exact visibly acknowledged workspace snapshot to the injected
Replay commit port. This lets a public adapter commit Projection's
source-level visible-through provenance for cursor-retaining replacements;
the generic coordinator still does not interpret Session Hours or timeframe
fields.

R6.3 proves the same unchanged coordinator with a complete Pane set. A
stateless adapter fans the acquisition and projection stages into exact planned
Pane work, rejoins every result before snapshot creation, and supplies one
complete snapshot to the existing visible-completion port. Workspace
Transaction Runtime still sees one acquisition, one projection, one
presentation, and one accepted revision.

R6.4 permits the injected Replay proposal port to resolve asynchronously under
the same transaction AbortSignal. The runtime awaits proposal resolution and
performs a currency check before acquisition. Existing synchronous proposal
ports remain valid. Slow superseded target lookup therefore cannot escape into
Pane acquisition or cursor publication.

R4.1 uses a fake visible-completion port. This proves ordering but does not
claim browser-visible chart completion; H016 remains inactive until the real
Chart Runtime/Adapter exists.

## Concurrency And Failure

- starting a newer intent aborts older work only for resource cleanup;
- the complete identity check, not cancellation success, proves currency;
- late stale success and late stale failure both have zero accepted-state side
  effects;
- acquisition, projection, and presentation failures preserve the last
  accepted workspace snapshot and Replay cursor;
- lowercase owner failure codes remain intact, uppercase domain codes are
  normalized into the terminal contract, and policy-bound provider failures
  expose only their bounded `provider-<kind>` classification instead of the
  unhelpful generic transaction fallback;
- disposal cancels pending work and prevents later acceptance;
- Replay proposals remain inert until exact visible completion returns;
- accepted workspace revision advances once per committed intent only.
- runtime health is explicit (`ready` or `poisoned`); poison is a fail-closed
  recovery state, not a retryable transaction failure.

No events orchestrate a second pipeline. Append, replace, cached, and uncached
strategies remain future implementation details behind the same transaction.

## R8.7–R8.9 Prepared Participant Protocol

`core.prepared-commit-contract` now defines the public protocol this runtime
will coordinate: Chart, Replay, Workspace State, and publication each prepare
an exact immutable candidate without mutation, apply reversibly with an exact
receipt, roll back to the exact base revision, or finalize the same receipt at
the target revision. R8.7 activates only that contract and its failure matrix.
R8.8 makes the injected Chart application independently prepared and
reversible. R8.9 wires all four participants, removes the Chart `present()`
bridge and the UI post-terminal commit, and makes this runtime the sole
rollback/finalize decision owner. Only Chart apply is asynchronous; after its
paint and the final currency check, the remaining applies execute in one
synchronous JavaScript turn so supersession cannot observe a reversible
intermediate semantic revision.

## Explicit R4.1 Exclusions

- real provider or V4/DuckDB access;
- concrete instrument, timeframe, or ETH/RTH branches;
- Projection Domain implementation;
- Chart Runtime, Lightweight Charts, DOM, pane, or viewport behavior;
- Auto Replay timer or browser workspace UI;
- persistence of the accepted workspace snapshot.

## Gate

`tests/workspace-transaction-runtime-harness.js` proves 18 negative/race
controls across stage order, acquisition/projection failures, partial prepared
sets, each later apply boundary, slow-old/fast-new reordering, stale failure,
disposal, duplicate/scope identity, immutable inputs, and revision exhaustion.
`tests/workspace-global-atomic-commit-harness.js` boots the real four owners and
independently injects Chart, Replay, Workspace State, publication, and
persistence failures while proving exact prior-state restoration.
R11.1 extends the same gate with real rollback/reject failures, post-decision
finalizer failures, committed-with-poison semantics, and refusal of subsequent
work on an activation whose recovery can no longer be proven.
