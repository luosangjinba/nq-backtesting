# V7 Globally Atomic Workspace Transaction — R8.9

Status: completed recovery activation (2026-07-30)

R11.1 correction: R8.9's participant set and reverse-rollback boundary remain,
but publication of the accepted coordinator snapshot is now the explicit
irreversible decision. Pre-decision failures roll back exactly. Post-decision
finalizer failures remain committed, attempt every remaining finalizer, and
poison the activation. The current binding semantics are defined in
`V7_WORKSPACE_TRANSACTION_RUNTIME.md` and
`V7_ARCHITECTURE_INTEGRITY_RECOVERY_R11.md`.

## Outcome

R8.9 makes `core.workspace-transaction-runtime` the only global commit
coordinator for Chart, Replay, semantic Workspace State, accepted publication,
and the persistence-facing/UI handoff. All four prepared participants apply the
same candidate; publication finalize then records the accepted coordinator
decision. Any earlier failure restores every participant and durable Session
envelope to its exact prior object, bytes, and revision. Later cleanup failure
cannot truthfully turn that accepted decision into `failed`.

The UI no longer calls Workspace State acceptance, Raw Coverage acceptance,
view publication, or checkpoint persistence after receiving a committed
terminal. The Chart application's temporary `present()` compatibility bridge
and its visible-completion acknowledgement were removed; production can enter
Chart mutation only through `prepare()`.

## Global Protocol

```text
Replay proposal -> acquire -> project
  -> prepare Chart / Replay / Workspace State / publication (no mutation)
  -> apply Chart and await paint
  -> final currency check
  -> synchronously apply Replay / Workspace State / publication+persistence
  -> finalize publication and record the irreversible decision
  -> attempt every remaining exact finalizer
  -> return committed terminal
```

Chart is the only asynchronous visible apply. The coordinator checks currency
again after its paint completes. Replay, Workspace State, publication, and
persistence then apply in one synchronous JavaScript turn, so a newer command
cannot observe or derive work from a reversible intermediate cursor or
semantic revision. Finalizers receive already-validated exact receipts and
only release retained state/resources. Publication finalizes first and owns
the decision; an incomplete later finalizer poisons the activation while the
terminal remains committed.

Rollback visits prepared participants in reverse order. A preparation that did
not apply is released without mutation; an applied preparation must present its
matching receipt and restore its base revision. Cleanup failures cannot prevent
the coordinator from attempting restoration of every remaining owner.

## Real Participants

- Chart retains the R8.8 exact series/scale/OHLC/Pane surface snapshot until
  finalize.
- Replay prepares cursor, visible-through, playback completion, Replay Step,
  and the exact next revision. Rollback restores the prior clock snapshot.
- Workspace State prepares one branded Pane/Session Hours/Viewport/checkpoint
  value. Its owned Viewport controllers can replace and restore exact intents;
  accepted semantic publication remains reversible until finalize.
- Publication stages the exact Chart projection, Replay snapshot, semantic
  snapshot, Pane Layout/Layout Sync handoff, and coordinator target revision.
  It renders and performs the atomic local checkpoint write before returning
  its reversible receipt; Raw Coverage leases are released only at finalize.

The production publication adapter retains the last accepted publication model
and redraws it if the durable write fails. Session Store persistence already
provides bounded atomic write rollback, so a failed local write does not alter
the previous durable record or its equality-suppression key.

## Failure And Concurrency Evidence

`tests/workspace-global-atomic-commit-harness.js` boots the real Replay Runtime,
real Workspace State Runtime, real Chart Snapshot Application, and the real
Workspace Transaction coordinator. After establishing a non-null accepted
revision, it independently injects failure at Chart, Replay, Workspace State,
publication, and persistence. All five cases prove exact restoration of:

- painted Chart adapter state and accepted Chart object;
- Replay cursor, visibility, Replay Step, playback, and revision;
- branded Workspace State snapshot and owned Viewport state;
- coordinator accepted publication object and revision;
- publication/persistence value and durable revision.

The headless coordinator Harness retains acquisition/projection/disposal,
slow-old/fast-new, late-failure, scope, duplicate, immutability, and revision-
exhaustion controls and now adds all later-participant rollback boundaries.
Pane-set and Replay Navigation Harnesses use the same prepared production port
shape. Real browser Harnesses prove the unchanged single/multi-Pane, Layout,
Replay, GoTo, checkpoint, and restored-cache workflow. All 74 top-level
Harnesses pass sequentially.

## Library And Ecosystem Decision

Lightweight Charts exposes immediate series replacement/update and irreversible
Chart/series removal, but no transaction spanning Chart, Replay, semantic
state, or persistence. Its plugin API and the awesome-tradingview catalogue do
not add such a coordinator. V7 therefore keeps the global protocol in its own
runtime and continues to use adapter-owned snapshots for Chart restoration.

References:

- <https://tradingview.github.io/lightweight-charts/docs/api/interfaces/ISeriesApi>
- <https://tradingview.github.io/lightweight-charts/docs/api/interfaces/IChartApi>
- <https://tradingview.github.io/lightweight-charts/docs/plugins/intro>
- <https://github.com/tradingview/awesome-tradingview>

## Recovery Result

H009, H010, H049, and H050 return from `regressed` to `accepted`. H076 advances
from `executable` to `accepted`. Nine recovery regressions remain, all assigned
to R8.10–R8.14.

The refreshed exact production baseline contains 45 modules, 118 dependency
edges, 118 construction sites, seven critical writer sites, and two remaining
blocking findings. Both are the production `ModuleHost` composition roots
assigned to R8.11; the R8.9 post-terminal semantic-commit finding is closed.

No manual UI review is required under the standing workflow because successful
controls, labels, gestures, layout, chart semantics, and visible results are
unchanged. R8.9 changes commit ownership and failure atomicity only.
