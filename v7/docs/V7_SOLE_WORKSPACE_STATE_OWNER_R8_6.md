# V7 Sole Semantic Workspace State Owner — R8.6

Status: completed recovery activation (2026-07-30)

## Outcome

R8.6 activates `core.workspace-state-runtime` as the only production owner of
accepted Pane Workspace, Session Hours, semantic Viewport state, and the
persistence-facing Workspace checkpoint. Replay Workspace UI now dispatches
proposals, reads immutable accepted snapshots, and presents them; it no longer
keeps an accepted Pane ledger or reconstructs a semantic checkpoint from
separate mutable values.

This is an ownership correction. It changes no HTML, styling, labels, chart
semantics, or interaction behavior.

## Accepted Snapshot

Every runtime snapshot is a branded immutable value containing exactly one
coherent semantic revision:

```text
WorkspaceStateSnapshot
  identity: SessionId + ActivationGeneration + TransactionId
  revision: monotonic runtime revision
  paneWorkspace: accepted branded Pane Workspace
  sessionHours: calendar revision + mode + mode revision
  checkpoint: accepted persistence-facing semantic checkpoint
```

The initial reconstruction receives an explicit internal transaction identity
and revision zero. Every later focus or native Viewport completion receives a
new runtime-local complete identity. Workspace materialization may publish only
after `begin(identity)` and only with the same still-current complete identity.
Foreign Session/activation identities, duplicate identities, superseded
transactions, unbegun acceptance, skipped Session Hours revisions, foreign
Pane workspaces, structural snapshot lookalikes, and post-disposal reads fail
without changing the accepted snapshot.

## Pane And Viewport Boundary

`core.pane-workspace-domain` remains the pure branded value and transition
contract. The new runtime privately constructs accepted values, owns the
mutable Viewport controllers used by the chart adapter, and publishes a new
aggregate semantic revision after focus, manual wall capture, Reset View, or a
committed Pane-set replacement.

Pane additions and reductions retain the stable P1–P4 priority prefix. An
incoming proposed Pane Workspace must match the runtime's Session, activation,
allowed instruments, primary instrument, and stable Pane order before it can
be accepted.

## Session Hours And Persistence

Session Hours proposal and accepted revision now belong to the same runtime.
A mode change advances its revision exactly once; retaining the mode retains
the revision. Calendar revision and supported modes are immutable runtime
capabilities.

The accepted checkpoint is created inside the same publish operation as Pane,
Session Hours, and Viewport state. `workspace-checkpoint-persistence.js` reads
that branded checkpoint directly and adds only the separately owned Pane
Layout and Layout Sync values to the durable envelope. It cannot assemble a
second semantic state from UI getters.

## Transaction Integration

Replay Workspace execution begins the semantic owner with the same complete
identity sent to Workspace Transaction Runtime. A committed terminal envelope
must return that identity before visible UI publication asks Workspace State
Runtime to accept. Rejected, no-op, failed, or stale operations clear only
their matching pending semantic identity.

R8.6 does not claim global atomic rollback. R8.7 subsequently defines the
generic prepared participant protocol, R8.8 activates reversible Chart
application, and R8.9 activates Workspace State within the global coordinator.
The former UI-side `paneData.accept()` post-terminal publication is removed.

## Recovery Evidence

H007 returns from `regressed` to `accepted`, and H075 advances from `declared`
to `accepted`. `tests/workspace-state-runtime-harness.js` directly boots the
public runtime, proves stable Pane reduction, Session Hours replacement,
Viewport publication, checkpoint identity, activation rebranding, disposal,
and ten negative controls.

At the R8.6 checkpoint, the refreshed production analyzer finds the Pane Workspace writer only in
`core.workspace-state-runtime`. Its exact baseline contains 44 active modules,
113 actual dependency edges, 112 construction sites, nine critical writer
sites, and three remaining blocking findings: two ModuleHost composition roots
for R8.11 and the post-terminal UI semantic publication for R8.9.

R8.9 subsequently removes that post-terminal path and activates Workspace State
as a prepared participant under the global coordinator.

No manual UI review is required under the standing workflow because this step
does not materially change UI or interaction behavior.
