# V7 Trusted-Build Core Plugin Center — P0b

Status: accepted 2026-08-11 after implementation, automated H115 evidence, and
focused human visual/interaction review

Date: 2026-08-11

Depends on: accepted ADR-V7-004, P0a/H113, R13.10e/H114, the production
ModuleHost boot boundary, Session persistence, and the R13 Annotation owner
graph

Harness: H115, accepted

## Outcome

P0b specifies the first visible Plugin Center slice for trusted-build Core
Plugins. It exposes a host-rendered **Core Plugins** surface containing only
validated first-party manifests present in the current V7 build. The surface
reports purpose, version, dependencies, capabilities, runtime status,
diagnostics, package/profile defaults, and an independently staged enable or
disable intent.

P0b does not hot-plug modules. A Core enablement or package/profile-setting
change is committed as one pending profile and becomes effective only through
an explicit application restart. The next boot selects one immutable module
definition generation, and the existing ModuleHost remains the only owner that
constructs, starts, stops, and disposes that generation. A failed candidate is
fully rolled back before a last-known-good or Kernel-safe generation starts.
Two production generations may never be running together.

The current production catalog initially contains only packages which already
publish a valid trusted-build manifest. P0b does not create placeholder entries
for MA/SMA, Liquidity Levels, Fibonacci, or any other accepted Core candidate.
Those packages appear only after their own separately accepted implementation
and conformance manifest exist.

## Upstream Reuse Decision

Lightweight Charts 5.2 exposes Custom Series, Series Primitives, and Pane
Primitives. Its official lifecycle supplies direct Chart/Series handles,
Canvas renderers, attach/detach callbacks, and update requests:

- <https://tradingview.github.io/lightweight-charts/docs/plugins/intro>
- <https://tradingview.github.io/lightweight-charts/docs/plugins/series-primitives>

The official examples and awesome-tradingview catalog provide rendering
scaffolds and curated links, not a package manager, dependency resolver,
durable enablement profile, settings host, candidate transaction, or recovery
contract:

- <https://github.com/tradingview/lightweight-charts/tree/master/plugin-examples>
- <https://github.com/tradingview/awesome-tradingview>

P0b therefore adds no upstream runtime dependency. Existing official Primitive
patterns stay behind the Chart-owned V7 adapters. The Plugin Center never
passes a Chart, Series, Canvas, Pane API, or vendor object to a plugin or UI
controller.

## Phase Boundary

P0b includes only:

- one host-rendered Core Plugins catalog/detail/settings surface;
- one versioned durable Core profile for trusted-build packages;
- pure catalog, status, dependency-impact, and boot-selection projections;
- restart-bound activation through one existing production ModuleHost;
- deterministic last-known-good and Kernel-safe recovery;
- durable preservation and later restoration of host-owned plugin evidence;
- H115 automated, browser, architecture, and human visual gates when
  implementation is separately authorized.

P0b does not include Community or Installed catalogs, updates, install from
file, Load unpacked, archive/package bytes, migrations across external package
versions, a registry, signatures, public SDK/build tooling, MCP, Pine
migration, Worker/WASM execution, network permissions, automatic detectors,
another Core business capability, or Marketplace behavior.

## Owner Boundary

```text
core.plugin-contract
  owns: pure trusted-build manifest/parameter validation, immutable package
        planning, Core profile normalization, dependency-impact planning,
        boot selection, and package-status projection
  never owns: bytes, lifecycle, DOM, reload, Chart, Replay, or persistence

core.plugin-profile
  owns: the one durable active/pending Core profile record, monotonic revision,
        stale-command rejection, failed-attempt diagnostics, and profile
        commit/discard/reset transactions
  receives: validated portable values plus an injected persistence adapter
  never owns: ModuleHost lifecycle, application reload, package code, DOM,
              Chart, Replay, Workspace, Annotation, or market data

adapter.plugin-center-ui
  owns: its catalog/detail/settings DOM subtree, local draft/focus state, and
        accessible presentation
  consumes: immutable view models, commands, receipts, and notifications
  never owns: profile truth, dependency decisions, lifecycle, or storage

application composition
  owns: a read-only pre-boot profile read, definition-generation selection,
        one bounded boot/fallback sequence, and an injected restart command
  never starts/stops package instances itself; it calls ModuleHost only

core.module-host
  remains: sole module construction/start/stop/disposal and reverse-order
           rollback owner for each selected definition generation

domain contribution registries and existing feature owners
  remain: validators/resolvers/writers for semantic, drawing, indicator,
          projection, evidence, Replay, Workspace, and persistence state
```

There is no `PluginHost`, package-local lifecycle controller, global singleton,
or UI-owned service locator. Plugin Center commands cannot invoke
`ModuleHost.start()` or `stop()`. The application composition may request a
normal restart only after the Core profile owner has durably staged an exact
candidate receipt.

The read-only pre-boot path may deserialize the single Core profile record to
select a generation before hosted runtimes exist. It must not repair, migrate,
remove, or write storage. Every write, including successful-candidate commit
and failure diagnostics, goes through `core.plugin-profile` after a
running host exists.

## Trusted-Build Catalog

The catalog input is one immutable array of P0a `PluginManifestV1` values and
their exact registered module descriptors. It is supplied by application
composition, not discovered from the filesystem or network. Every manifest is
validated before a catalog row exists.

The host creates one package-neutral view model containing:

- package id/version and exact module id/version;
- display name, description, first-party publisher, Core/built-in trust;
- contributions, provided/required/extended capabilities, and dependents;
- host API compatibility and dependency-plan result;
- runtime state, pending-change state, and stable diagnostics;
- package/profile-setting schema and effective values with source;
- whether restart is required and the exact affected packages/modules.

The catalog and UI modules contain no `FVG`, MA, SMA, BSL, SSL, or Fibonacci
branch. Initially the real list may contain only Fair Value Gap. Synthetic
packages prove the generic list, dependency, and settings behavior in H115.

## Core Profile V1

The durable record is one exact, portable, versioned value:

```text
CorePluginProfileRecordV1 {
  schema: "v7.core-plugin-profile-record"
  version: 1
  revision: non-negative safe integer
  active: CorePluginProfileV1
  pending: null | {
    attemptId
    baseRevision
    profile: CorePluginProfileV1
  }
  lastFailure: null | {
    attemptId
    code
    moduleId: null | module-id
    packageId: null | package-id
    phase: "plan" | "instantiate" | "start" | "rollback"
  }
}

CorePluginProfileV1 {
  enabledPackageIds: sorted unique package ids
  packageValues: package-id -> contribution-id -> field-id -> portable value
  profileValues: package-id -> contribution-id -> field-id -> portable value
}
```

`active` is the last generation which reached the application-ready checkpoint.
Staging never overwrites it. `pending` is a complete candidate, not a patch;
unknown packages, contributions, fields, scopes, or non-portable values fail
before persistence. The profile owner uses exact-revision compare-and-swap, and
stale preparations or receipts cannot overwrite a newer profile.

A missing record derives the build's explicit default Core profile. An invalid
record produces a visible recovery code and tries the build default without
silently rewriting bytes. Package/default settings use the P0a parameter
schemas and precedence; instance settings, Artifact overrides, Evidence, and
History never enter this record.

The P0b record is device-local to the current browser origin and is not added
to the Server State Sync allowlist. Pre-boot generation selection must not wait
for network reconciliation, and a remote hydration must never replace the
profile after ModuleHost has already selected a graph. This also anticipates
later devices having different locally installed package inventories. A future
cross-device plugin-profile policy requires a separate contract which resolves
package availability and boot ordering first; it cannot silently add this key
to replication.

P0b owns persistence only for trusted-build Core enablement plus package/profile
defaults. P1 later generalizes package migrations and settings survival across
external archive, unpacked, and registry generations; it cannot create a
second Core profile owner.

## Restart-Bound Generation Transaction

Enablement and Core package/profile settings use this exact sequence:

1. UI dispatches a portable intent with the last observed profile revision.
2. The pure planner validates manifests, settings, dependencies, application
   consumers, and the full impact set without changing state.
3. If dependencies or dependents change, UI presents the exact impact and
   requires explicit confirmation. No dependency is silently enabled or
   disabled.
4. The profile owner persists one complete `pending` candidate and returns an
   exact attempt/revision receipt.
5. The current generation remains unchanged. UI displays `Restart required`
   and offers Restart now, Later, or Discard pending changes.
6. Restart now is accepted only for the current pending receipt. Normal
   `pagehide` teardown stops the current ModuleHost before a new boot begins.
7. Pre-boot selection tries the pending profile. Disabled package descriptors
   and every transitive optional application consumer which requires them are
   omitted before ModuleHost planning.
8. ModuleHost constructs and starts exactly one immutable definition graph.
   After the root application reaches ready, the profile owner promotes
   `pending` to `active` and clears the failure record.
9. Any plan/instantiate/start failure completes ModuleHost reverse rollback
   before application composition tries the prior `active` profile. If that
   also fails, it tries one Kernel-safe profile with all Core Plugins disabled.
10. After fallback reaches ready, the profile owner records the failed attempt
    and leaves host-owned evidence/settings intact. The Center visibly offers
    discard/reset/retry; it never loops or auto-reloads indefinitely.

At most one candidate, one last-known-good fallback, and one Kernel-safe
fallback may be attempted per page load. Only one ModuleHost may be running.
The safe profile includes Kernel and Plugin Center infrastructure but no Core
business package. If even that graph cannot start, the failure is an
application/kernel failure rather than a recoverable plugin-profile failure.

P0b deliberately does not implement live/hot activation. A later phase may
propose an atomic in-process generation replacement, but it must prove no
duplicate writer, listener, Chart primitive, lease, Worker, or task and cannot
change P0b semantics silently.

## Dependency And Application Impact

The P0a capability graph remains authoritative. A disable intent for a package
with enabled dependents is rejected until the user confirms one atomic cascade.
An enable intent whose requirements are disabled likewise requires confirmation
of the exact dependency additions. Cycles, missing/incompatible versions,
undeclared module ports, or an impact which would omit a non-removable required
Kernel module fail closed.

The impact plan separately reports:

- Core packages whose desired profile changes;
- non-plugin optional modules/workflows omitted or restored by that profile;
- tools/projections/settings which disappear or return after restart;
- durable records retained without an active resolver;
- whether the current Session can continue before restart.

Non-plugin application consumers are never rewritten into fake packages. For
example, disabling the Core FVG package may omit the dependent manual FVG
workflow and toolbar contribution, while Annotation bytes remain owned by the
existing Runtime/persistence boundary.

## Per-Package Status Model

P0b does not map the one global ModuleHost state onto every package. Each view
model contains two independent dimensions:

```text
runtimeState:
  active | disabled | suspended | incompatible | failed | recovery-disabled

changeState:
  clean | pending-enable | pending-disable | pending-settings |
  pending-dependency-cascade
```

`active` requires all of: the active profile enables the package, the exact
module id is present in the running ModuleHost snapshot, its dependencies are
active, and no fallback suppressed it. `disabled` is an explicit active-profile
choice. `suspended` means the profile requests the package but an unavailable
dependency prevents activation. `incompatible` is a pre-start contract result.
`failed` is tied to one stable failed attempt. `recovery-disabled` means a
fallback intentionally omitted it without changing accepted historical data.

`changeState` compares the complete pending candidate to active. A staged
toggle must not claim the plugin has already stopped or started. ModuleHost
`starting`/`stopping` may appear only in boot diagnostics because Plugin Center
DOM is not available until one application generation is running.

Diagnostics expose stable code, package/module identity, phase, dependency
impact, and recovery action. Raw stacks, storage bytes, owner handles, and
arbitrary plugin-provided HTML are never rendered. ModuleHost failures must add
the exact failing module id and lifecycle phase while preserving the original
cause for developer diagnostics.

## Host-Rendered Package And Default Settings

The Center renders only `settings` tabs/fields declared by validated P0a
parameter schemas and only the `package` and `profile` scopes. It owns control
layout, labels, keyboard behavior, validation copy, dirty state, Reset, Cancel,
and Apply. A plugin supplies no DOM, CSS, event listener, or renderer callback.

Apply validates a complete candidate through the same profile transaction and
therefore requires restart in P0b. Reset removes the selected override so the
next effective source is disclosed as profile, package, or definition default.
There is no live Preview for generation-bound package/default settings.

The current FVG manifest advertises no editable package/profile settings, so
its detail surface must show an honest empty state instead of inert controls.
Evidence/History groups and per-Artifact validated overrides remain in the
existing Inspector. P0b does not move them into Plugin Center.

## Product Surface

P0b extends the host-owned Settings information architecture with one **Core
Plugins** destination. It does not add a Chart toolbar button or a separate
application. The surface provides:

- local search over name, description, package id, and contribution names;
- optional enabled-only filtering;
- compact package rows with name, version, purpose, status, dependency warning,
  and accessible staged toggle;
- one detail region for identity, trust, capabilities, dependencies,
  dependents, settings, diagnostics, and data-retention behavior;
- a persistent pending-change banner with Restart now, Later, and Discard;
- explicit loading, empty-search, unavailable, incompatible, failure,
  recovery, and no-settings states.

The host owns focus return, Escape behavior, keyboard traversal, screen-reader
names, contrast, reduced-motion behavior, and narrow-window layout. Toggle or
settings actions never close the Center before validation/impact completes.
The visible design may take information-density cues from Obsidian's Core
Plugins list and Chrome's extension management, but it uses V7 tokens and
interaction semantics and copies neither product's privilege model.

## Command And Notification Boundary

The UI may receive only immutable catalog/profile snapshots and dispatch
commands equivalent to:

- prepare enable/disable/settings intent at an expected profile revision;
- confirm or reject one exact dependency-impact preparation;
- durably stage one complete candidate;
- discard the current pending candidate;
- reset to the validated build-default profile;
- request restart for one exact pending receipt;
- retry or discard one recorded failed attempt.

Prepare is pure. Stage/reset/discard commit through the profile owner before a
notification is published. Restart is an application-composition command and
is rejected if the receipt is stale, no pending candidate exists, or a profile
write is unsettled. UI modules never call each other and never control a
package or ModuleHost directly.

## Evidence And Data Survival

Disabling a package removes its live contributions only after the accepted
restart. It must not delete or rewrite:

- Annotation Artifacts, revisions, provenance, undo/redo history, or exported
  wires;
- Session, Replay, Workspace, Journal, or later Validation data;
- package/profile settings;
- package/definition identities required for later resolution.

When a resolver is absent, host owners preserve opaque semantic records and
render only an existing generic unresolved/read-only fallback where that
surface remains available. Re-enabling the exact compatible package restores
normal resolution/projection from accepted bytes without creating a new
Artifact revision. Disabling cannot change candles, Replay cutoff, Pane state,
or Bar Data requests.

## Required Implementation Decomposition

P0b implementation must create focused boundaries rather than extend current
hotspots:

- add pure profile/status/impact helpers in focused `core.plugin-contract`
  files rather than enlarging one mixed contract file;
- add a dedicated non-removable Core profile owner and an independent Harness;
- add a dedicated removable Plugin Center UI module/controller and keep route
  or Settings-shell code limited to mounting and command wiring;
- add a read-only bootstrap selection helper plus a bounded application boot
  supervisor; neither may write profile storage or start modules individually;
- split `production-manual-annotation-workflow.js` before any catalog
  generalization touches it; do not append another hard-coded package array;
- do not add behavior to the 450-line Annotation interaction port or the
  near-limit Semantic Registry; P0b should not need either.

The implementation must remain below the canonical source-quality ceilings
with no new exception or debt comment.

## H115 Acceptance Gate

H115 was accepted after implementation produced the following automated,
browser, production, and human evidence:

### Headless and negative controls

- exact profile wire/round trip, build defaults, monotonic revision, CAS, and
  stale preparation/receipt rejection;
- manifest-derived catalog identity with no package-specific UI/status branch;
- separate runtime/change states and foreign/mismatched host-snapshot failure;
- enable, disable, dependency-add, dependent-disable, settings, discard, reset,
  and no-op plans with exact impact disclosure;
- unknown/incompatible/cyclic/missing dependency, invalid settings, corrupt
  storage, attempted remote-profile substitution, invalid fallback, and
  non-removable-impact failures;
- pending/active promotion only after application-ready evidence;
- exact failing module/phase diagnostics and fully settled reverse rollback
  before fallback start;
- one running ModuleHost, no duplicate writer/listener/lease/Primitive/task,
  and no direct package lifecycle API outside ModuleHost;
- package disable/re-enable with byte-identical historical evidence and no new
  accepted Artifact revision;
- no raw Chart/Series/Canvas/DOM, Bar Data, Replay, Workspace, Annotation
  writer, filesystem, network, loader, Worker, or external package bytes in the
  contract/profile modules.

### Real browser and production gates

- the production Settings shell opens Core Plugins and lists only validated
  real built-in manifests;
- search, enabled filter, detail disclosure, keyboard/focus behavior, dirty
  state, validation, impact confirmation, and pending banner work visibly;
- staging FVG disable does not change the running generation; explicit restart
  removes its tool/live projections while preserving the Session and exact
  accepted Annotation bytes;
- re-enable plus restart restores resolution/projection without rewriting
  evidence;
- a synthetic failed candidate completely rolls back, starts last-known-good
  or Kernel-safe mode once, and exposes actionable diagnostics without a loop;
- hard reload, native Chart pan/zoom, Replay no-future, multi-Pane projection,
  persistence rollback, optional-removal, production boot, source-quality,
  writer-closure, and the production regression matrix remain green except for
  explicitly inventoried pre-existing H091 findings;
- new Core Center normal, pending, disabled, and recovery visual fixtures pass
  at the accepted reference viewport.

H115 required focused human visual/interaction review because P0b adds a
visible management surface and restart-bound behavior. The first review found
the shared Settings footer painting over Core Plugin detail text; after the
footer containment correction and focused regression rerun, the user accepted
the corrected surface on 2026-08-11. No visual baseline was re-recorded.

## Authorization Boundary

This document first specified P0b and declared H115. The user accepted that
contract and explicitly authorized implementation on 2026-08-11. P0b is now
implemented and accepted under H115, including the corrected focused human
visual and interaction gate.
P1a/P1b, Community distribution, Workers, Pine migration, new Core business
packages, and Marketplace remain later separately specified phases.
