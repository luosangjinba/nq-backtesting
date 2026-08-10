# V7 Replay/Chart Architecture

Status: binding owner and transaction contract (2026-07-19)

## One-Way State Flow

```text
UI intent
  -> Workspace Transaction Runtime
    -> Session Store (identity/configuration)
    -> Replay Runtime (cursor/reveal proposal)
    -> Bar Data Runtime (raw + provenanced projected-history acquisition/cache)
    -> pure Projection Domain (hours + TF + no-future)
    -> atomic Workspace Snapshot commit
      -> Chart Runtime/Adapter (series)
      -> Viewport Runtime (existing intent)
    -> visible completion
```

Events notify observers after accepted commits. Events do not form an
asynchronous business-process chain and never trigger a second materialization.

## Independent Data Acquisition Administration

R7.3 added `adapter.data-acquisition-ui` outside the chart state flow. R12.2
retains its trusted administrator DOM and safety workflow but removes the
historical writer runtime from the standalone product. Databento refresh and
Contract Roll are visibly disabled until a separately authenticated,
V7-native maintenance service owns their write/backup/rollback contract. The
separately composed first-run importer below may still create one missing
database. No Data Acquisition surface has Replay, Pane, chart-series,
Workspace Snapshot, or raw-bar-cache authority.

The one-way chart flow is unchanged: `core.bar-data-runtime` remains the only
bar requester/cache owner and consumes `adapter.market-data-provider`
read-only. Chart or Session UI must never call Databento, start maintenance
work, or mutate DuckDB. The historical maintenance contract remains provenance
in `V7_DATA_ACQUISITION_MILESTONE_R7_3.md`; standalone runtime ownership is
superseded by `V7_STANDALONE_RUNTIME_SEPARATION_R12_2.md`.

### First-Run Database Import

R10.9 adds a bounded database-setup capability beside Data Acquisition rather
than inside its UI owner. `adapter.database-bootstrap-ui` owns the optional
panel/client and is injected into `adapter.data-acquisition-ui` only when its
public port is present. Removing that module leaves the maintenance surface
available and removes the setup panel cleanly. It does not give an optional
Maintenance service or chart path new authority. The panel calls a separate
loopback importer through an authenticated proxy.
That service alone owns uploaded-file staging, strict CSV-to-DuckDB conversion,
candidate validation, and create-if-absent activation. It supports only a
missing `V7_MARKET_DATA_DB` target; once a database exists, the import surface is
locked and cannot replace or merge it.

R12.1 keeps re-upload recovery inside those same owners. The Bootstrap UI owns
only the intent, inline confirmation, and control reset. The import service
alone may discard an authenticated user's stable `uploaded`, `ready`, or
`failed` staging task under its activation lock. Validation-in-progress and all
post-activation states reject the command; neither the target DuckDB nor its
durable activation lock is exposed as a discard path.

R12.8 keeps post-activation capability status equally separated. The importer
health route remains readable so the Bootstrap UI can show a locked active
database, but no importer mutation route is composed. A focused Data
Acquisition coverage controller first uses optional Maintenance evidence and,
when that capability is absent, reads only Market Data health/available dates.
It hides Maintenance-owned controls and never manufactures duplicate/integrity
evidence. The binding correction is
`V7_ACCEPTANCE_CAPABILITY_STATUS_R12_8.md`.

The CSV schema and DuckDB `futures_1m` schema are exact. Validation rejects
unsupported instruments, nulls, duplicate `(instrument, ts)` keys, non-minute
timestamps, and invalid OHLC/volume instead of normalizing them. API, Web, and
user-state systemd namespaces mount the complete database parent read-only;
only the importer namespace receives that parent as writable. Public access is
limited to authenticated `/v7/database/*`, port 8768 remains loopback-only, and
all unrelated mutation methods remain blocked. The chart-side one-way read flow
is unchanged. The binding contract is
`V7_DATABASE_BOOTSTRAP_IMPORT_R10_9.md`.

R12.3 adds `v7/server/duckdb_runtime.py` as the single resource-policy library
required by both V7 DuckDB services. It validates deployment-selected memory,
thread, and temporary-directory settings. Market Data and Database Import keep
separate writable spill roots; sharing the policy does not merge their read/
write authority. The minimum-host and swap owner remain in Linux deployment,
not in either data service. Binding contract:
`V7_ADAPTIVE_LOW_MEMORY_DEPLOYMENT_R12_3.md`.

## State Owners

### Session Store

Owns durable records keyed by opaque `sessionId`: date range, instruments,
workspace layout, pane intents, Replay checkpoint, and schema version. Every
read/write requires an explicit `sessionId`; there is no implicit active-session
persistence key.

The historical range stores its authoritative exclusive `endEpochMs` plus a
validated `presentationEndEpochMs` inside that range. Existing records default
the presentation End to the authoritative End; Saturday-close shorthand uses
Friday `16:59` for customer surfaces and Friday `17:00` for Replay's cutoff.

R2.4 adds explicit revision-checked Session deletion through the same owner.
Repository removes the indexed identity and its record key as one bounded
operation; Session Browser may dispatch the command only after visible user
confirmation and never manipulates storage directly.

It does not request bars, advance Replay, project bars, or write charts.

R7.1 activates `core.workspace-checkpoint-domain` and configured Session
workspace schema 6. Session Store writes Pane Layout, Layout Sync, and the
complete semantic checkpoint in one revision. The checkpoint contains Replay
cursor, Session Hours, active Pane, Pane instrument/timeframe, and semantic
Viewport intent only; bars, native logical/pixel coordinates, activation
identity, revisions, and transient playback/presentation state remain absent.
Soft re-entry and hard refresh rebrand Viewports under the new activation and
materialize every Pane once at the saved cursor through Workspace Transaction.

R11.1 adds an owner-bounded reversible checkpoint write. Session Repository
applies one raw record envelope under revision CAS and returns the only
finalize/rollback receipt; Session Store translates that receipt to the exact
Workspace checkpoint record. Before the global publication decision, rollback
restores the byte-identical prior envelope rather than creating a compensating
Session revision. After the decision, finalize only seals the accepted write.

### Server State Replication Adapter

R10.8 adds optional `adapter.server-state-sync` outside the Session Store
command boundary. Local Web Storage remains the immediate synchronous durable
write: Session Store, Replay Navigation Preferences, Workstation Settings, and
color history keep their existing owners and APIs. The adapter observes only
their allowlisted durable keys and serializes one complete immutable snapshot
after local success; network availability can never enter a Session CAS or
Workspace visible transaction.

The loopback state service persists one SQLite row per authenticated user and
uses a strictly increasing global snapshot revision. Replacement requires the
caller's expected revision. A stale writer receives the current snapshot and
the browser enters an explicit conflict state; it never silently merges or
uses last-write-wins. Empty-device hydration, first-device import, offline
local continuity, device/server backups, and both conflict choices are owned by
this adapter. Market bars, DuckDB, credentials, native Chart state, activation
identity, and pending transactions never enter the replicated schema.

R11.1 makes remote hydration an exact allowlisted local transaction. Apply or
metadata failure restores the captured entries and metadata. If restoration
also fails, the adapter enters terminal `poisoned` / reload-required state,
blocks Retry and synchronized-storage mutations, and prevents Session
application initialization; an unprovably restored device is never presented
as merely Offline or Conflict.

The module is removable. Without its port or without a trusted state route,
the application boots with the original local-only persistence behavior. The
binding state, identity, proxy, and deployment contract is
`V7_SERVER_STATE_SYNC_R10_8.md`.

### Replay Runtime

Owns the accepted cursor, revealed-through boundary, playback state, and source
traversal semantics for exactly one activated session generation. It can
produce a cursor proposal for a transaction, but publishes accepted progress
only when that transaction commits visibly.

There is one shared Replay clock. Panes and instruments never own cursors.

### Pane Workspace Domain

Is pure. It defines the uniform Pane intent record used from one Pane to many,
validates active focus and Session-bounded instrument selection, and plans
pane-local or synchronized instrument intent. It owns no mutable runtime,
persistence, Replay, bars, projection, chart, or DOM state.

R6.1 activates `core.pane-workspace-domain`. Every Pane has exactly `paneId`,
`instrumentId`, `timeframeId`, and one branded Viewport intent. The Viewport
scope must match the Session, activation, and Pane; every Pane must observe the
same Replay cursor. Pane records structurally reject per-Pane Replay fields.

R6.2 activates `core.replay-pane-response-contract`. Manual Next/Previous,
Autoplay Next, Restart/Back-to, quick schedule GoTo, and exact GoTo all produce
one complete visible-Pane response plan. Active focus cannot narrow Replay
scope; the Session primary instrument remains clock authority; Session Hours is
one Session-level revision; forward jumps require complete interval coverage;
and failure preserves the last accepted Pane set.

R6.3 activates `core.pane-set-materialization` as a stateless adapter over the
existing transaction acquisition/projection stages. One exact request per
planned Pane settles before one schema-v2 complete Pane-set snapshot exists.
Ready Pane results share the exact Replay proposal; an explicit empty comparison
Pane does not stall Replay. The existing Chart Snapshot Application module
validates and visibly applies the complete set through one adapter call and one
exact receipt; no second chart writer or coordinator is introduced.

R6.4 activates `core.replay-navigation-runtime` as a thin action/target router,
not another coordinator. Replay Runtime issues inert exact forward/backward
target proposals and owns playing/paused state. A cancellable source-traversal
port resolves next/previous eligible primary-source cutoffs and verifies
DST-aware New York quick anchors; exact targets bypass traversal. The router
builds the R6.2 plan and R6.3 input, then invokes one Workspace Transaction.
Overlap is rejected without backlog, and every failed terminal pauses while
preserving the last accepted atomic state.

R6.6 replaces the implicit adjacent-source-minute navigation assumption with
one branded Session-level Replay step owned by Replay Runtime. The selected
fixed grid is independent from every Pane TF and changes without cursor,
revision, or data-request effects. The schema-v3 complete-Pane response plan
carries the exact step; cancellable source traversal resolves the next or
previous non-empty aligned primary-source bucket completion, skips empty
closed-session/weekend buckets, and preserves the same atomic Pane-set commit.

R6.7 adds one UI-local Autoplay cadence owner over public Replay and Workspace
Execution ports. It owns no accepted product state: Replay Runtime still owns
`playing`/`paused` and the shared cursor, while Workspace Transaction still owns
each complete Pane-set transition. The first action is immediate; every later
action is scheduled only after the prior visible commit plus `500ms`. Pause
invalidates the cadence generation and clears the future timeout, so a settling
atomic transaction cannot enqueue a successor. Completion, rejection, or
failure publishes `paused` through Replay Runtime.

R6.8 keeps that scheduler UI-local and adds bounded cadence selection. The
default `1×` gap remains `500ms`; `0.5×/2×/5×` map to
`1000/250/100ms`. Changing speed replaces at most one scheduled timeout or is
consumed after the current atomic tick. Speed is transport preference, not
Replay cursor/revision state, and it cannot create a Pane transaction.

R6.8a adds two bounded transport interactions without another owner. The Chart
Adapter translates a native chart click from a completion-display timestamp to
the projected candle's source bucket start. Workspace UI validates that target
against the Session and accepted cursor, then routes it through the existing
exclusive-cutoff `goto-exact` all-Pane transaction. The `Sync timeframe`
preference derives a Replay-step capability from the active Pane's registered
fixed TF; Replay Runtime still owns the selected step, and focus/TF sync moves
no cursor and creates no materialization transaction.

R9.1 caps registered Replay choices at `4h` without removing higher display
timeframes. Sync timeframe selects the active Pane's registered Replay step or,
when that display capability has no Replay option, the maximum registered step.
The composition derives this from capability registration and contains no
concrete higher-timeframe id branch. Selection remains cursor-, request-, and
Pane-transaction-neutral.

R6.9 activates `core.pane-layout-domain` as the pure owner of the registered
one-to-four Pane layout set, immutable split tree, versioned wire schema, and
measured minimum-size constraints. Replay Workspace UI owns the picker,
external split DOM, and transient drag preview while retaining one independent
chart host per product Pane. Session Store persists only accepted layout intent
under the explicit Session id. Same-count variant changes and resize commits do
not request bars, move Replay, or create a Workspace transaction; Pane-count
changes continue through the existing atomic complete Pane-set path.

R6.10a activates `core.layout-sync-domain` as the pure owner of the exact
Symbol/Interval/Crosshair/Time/Date-range policy and its versioned wire schema.
Session Store is the only durable writer and stores the complete policy beside
Pane Layout in configured workspace schema 5. Replay Workspace UI owns only the
menu projection; the existing Crosshair consumer remains chart-adapter-owned.
Replay and ETH/RTH remain always Session-wide and are not optional sync keys.
Symbol/Interval policies produce one complete Workspace replacement. Rejected
real-time Time and deliberately deferred Date-range values remain inert
compatibility fields with no production consumer; if either is reconsidered,
it must remain an adapter/Viewport projection rather than a per-Pane event chain
or persisted chart coordinate.

R6.10b activates those Symbol/Interval consumers. Pane Workspace Domain owns
the pure local/all-Pane intent transition; Replay Workspace UI reads one
accepted policy and submits one complete desired Pane set; Workspace
Transaction Runtime remains the only atomic materializer. Enabling a policy is
not itself a convergence command. If synchronized Symbol leaves no visible
primary-instrument Pane, Replay Navigation obtains bounded primary-source
`visibleThrough` evidence through its Bar Data-owned traversal port. A
comparison Pane never becomes clock authority and no hidden chart is created.

R6.10c3 activates explicit cross-Pane time location without restoring real-time
Time sync. Pane Time Location Domain brands the exact source-candle market
instant and purely plans a target result. Replay Workspace UI owns the
right-click menu and serial target coordination; Lightweight Chart Adapter is
the only native coordinate reader and Viewport writer. Missing target history
uses bounded Workspace Transaction and Bar Data paths. Replay cursor/reveal,
Pane configuration, source focus, and non-target Viewports remain unchanged;
an instant without a containing target candle is unavailable and never snaps
to an unrelated session. The R6 closure deliberately defers Date-range sync;
native pan and zoom remain Pane-local.

R6.9a keeps Pane OHLC and Crosshair synchronization on the chart-presentation
side of that boundary. Each Lightweight Chart Adapter owns native crosshair
subscription, accepted current/latest candle lookup, and the only calls to
programmatic chart crosshair APIs. The Pane-set Adapter fans one ephemeral
display timestamp across visible charts and accepts native movement only from
the Pane physically under the pointer, preventing programmatic feedback loops.
Replay Workspace UI renders Pane-local OHLC and dispatches the UI-local sync
toggle. None of these operations requests bars, writes series, changes focus,
moves Replay, persists Session state, or opens a Workspace transaction.

### Bar Data Runtime

Is the only raw market-data requester and cache owner. Cache identity includes
provider, instrument, source interval, and bounded time window. It never uses
the active UI session as an implicit cache identity and never writes Replay or
chart state.

Dataset revision completes raw cache identity. Identical in-flight requests are
coalesced, eviction is bounded, and Replay prefetch uses explicit watermarks.
Raw future bars may be cached but never projected past the accepted cursor.
Detailed performance and chunking rules are binding in
`V7_CACHE_AND_LATENCY_CONTRACT.md`.

R11.1 replaces any build-time or constant label with the authoritative DuckDB
revision derived from the main database/WAL filesystem identity and governed
table facts. Health discovery supplies it before requests; every bars and
projected-history response echoes the exact expected revision, and the V7
market-data service checks again after a query before returning. Revision
mismatch is a hard stale
failure. Raw Coverage, projected-history caches, and provider revision caches
therefore cannot reuse evidence across database activation or mutation.

Before the runtime is activated, `core.bar-data-contract` owns only immutable
provider-neutral request/bar/batch values. Raw identity is exactly provider,
instrument, source resolution, bounded half-open window, and dataset revision.
It excludes Session, pane, display TF, ETH/RTH, Replay, and viewport state.
Provider wire metadata is normalized at the adapter boundary and cannot leak
into the raw domain.

R3.2a activates one `core.bar-data-runtime` acquisition/cache path over an
injected provider resolver. Each runtime instance owns a bounded exact-window
LRU cache, identical-request coalescing, a global concurrency queue, abort
signals, and disposal. Provider output is revalidated before cache admission;
failures and late post-dispose completions cannot write cache state. Real
transport, overlapping coverage, revision discovery, gap policy, retry,
deadline, and prefetch remain inactive after R3.2a.

R7.2 keeps restored Replay traversal on the same buffered exact request
identity used by Pane materialization. It never creates a per-step
current-minute-to-range-end request. A Pane composition may reuse one exact
already-accepted raw batch before consulting the bounded LRU; the batch remains
accepted projection input and does not become a second raw cache/request owner.
Closed periods advance by bounded request ends until real source evidence is
found.

R7.3k adds `core.projected-history-contract` and a Bar Data-owned projected
history runtime for screenshot-scale `1h`–`12h` left context. R7.3m also uses
that same boundary before a projection replacement when its retained semantic
Viewport exceeds the bounded raw entry window. Bar Data acquires projected
prefix and authoritative raw tail concurrently; Pane composition merges one
target snapshot before the sole Chart writer commits. The projected cache
identity explicitly includes display timeframe, duration, ETH/RTH mode,
calendar and aggregation revisions, provider/dataset, and exact window. This
context is separately provenanced, never enters the raw source ledger, and is
invisible to Replay source traversal. It is a compact view of the same
immutable `1m` dataset, not an alternative source of replay evidence.

R7.3n extends that boundary with alignment kind/policy identity and registers
`core.calendar-timeframe-domain` for `1D`/`1W`/`1M`. Session Hours eligibility
and the exclusive Replay cutoff still precede calendar aggregation. Calendar
projected prefix and raw tail are composed before one visible Workspace commit,
so selecting a calendar period cannot expose a short series that waits for a
later native history event.

R7.3o tightens the Pane-local raw source ledger for complete-Pane
materializations. When an ordinary navigation request is wholly covered by the
ordered accepted batches of the same provider, instrument, source resolution,
dataset revision, and schema, the ledger retains that wider accepted source
wall instead of replacing it with the narrower acquired window. Target-history
location still uses the existing bounded history path; this rule protects only
unchanged non-target Panes. It introduces no second Bar Data cache, Projection
writer, Chart writer, or Replay owner.

The R8 production audit supersedes that final ownership conclusion: retaining
and merging accepted raw batches in Replay Workspace UI is a second raw
retention domain even when it does not invoke a provider. R8.4 therefore adds
`core.raw-coverage-lease-contract`. It binds finite same-source request windows
to complete Workspace transaction identity and permits only synchronous,
revocable callback-scoped reads from a Bar Data-owned cache capability. The
scope, lease, and lifecycle snapshot contain no raw batches. R8.5 activates
this boundary: Bar Data Runtime privately owns bounded accepted/staged/
transient raw coverage, while Pane Projection and Replay traversal can observe
it only through synchronous transaction-bound callbacks. UI source/display
ledgers and cached source reads are removed; only derived immutable snapshots
escape the owner.

R8.13 supersedes the R7.3o UI-ledger correction with executable production
evidence through that R8.5 owner. Covered ordinary navigation retains a Pane's
wider accepted request set inside Bar Data Runtime, while target history uses a
bounded extension lease. R8.13 also separates fixed and calendar timeframe
construction into versioned contributions merged by a policy-family-agnostic
composition registry; existing core owners import neither contribution and
contain no concrete timeframe-id branch.

R9.1 keeps the 500-source-minute navigation wall through `1h` and derives a
bounded 64-step wall for larger registered Replay durations. Exact accepted
request identity returns the same already-validated immutable Raw Batch;
contained or composed coverage still reconstructs and validates through Bar
Data Runtime. Future cached bars remain hidden by Projection's exclusive
cursor.

R8.6 activates `core.workspace-state-runtime` as the sole accepted semantic
Workspace State owner. One branded revision now contains the accepted Pane
Workspace, Session Hours capability/revision, semantic Viewport values, and
persistence-facing checkpoint under complete Session, activation, and
transaction identity. The runtime privately owns Pane construction and mutable
Viewport controllers. Replay Workspace UI dispatches proposals and reads the
accepted snapshot; it no longer owns an accepted Pane ledger, Session Hours
revision, or checkpoint reconstruction path. A materialized proposal may
publish only for the exact still-current begun identity. Focus and native
Viewport completions receive runtime-local complete identities and new
aggregate revisions. Global prepared/rollback coordination remains R8.7–R8.9.

R8.7 adds `core.prepared-commit-contract`, owned by Workspace Transaction
Runtime as the participant-neutral protocol boundary. Exactly Chart, Replay,
Workspace State, and publication may prepare. Each preparation binds one exact
deeply immutable candidate to complete Session/activation/transaction identity
and unchanged base revision. Apply advances exactly one revision but remains
reversible; rollback proves restoration to the exact base; finalize makes the
same exact commit receipt irreversible at its target revision. Forged,
cross-preparation, stale, duplicate, out-of-order, and unsafe-disposal paths
fail. R8.7 changes no participant implementation: Chart activates the protocol
in R8.8 and global coordination/publication activates it in R8.9.

R8.8 activates Chart as the first real prepared participant. Chart Snapshot
Application now stages the exact candidate, applies it visibly while retaining
the prior accepted revision, and returns the R8.7 reversible receipt. Rollback
restores every child series, future axis, OHLC index, time/price scale, host
metadata, complete Pane membership/status, and Pane-surface maximize state.
Finalize alone publishes the target Chart revision and releases removed child
charts/hosts.

R8.9 removes the legacy `present()` port and makes Workspace Transaction Runtime
the only owner of the four-participant decision. It prepares one immutable
semantic candidate across Chart, Replay, Workspace State, and publication/
persistence. After reversible Chart paint and a final currency check, the
coordinator applies the remaining participants in one synchronous turn,
then publication finalize records the sole irreversible coordinator decision.
Any failure before that decision triggers reverse rollback to the exact prior
accepted objects, raw durable bytes, and revisions. Once publication records
the decision, the terminal result remains `committed`; every remaining
finalizer is still attempted, and any incomplete finalization poisons the
activation so later commands cannot reuse uncertain resources. A failed
rollback/reject likewise poisons the activation. Replay Workspace UI no longer
commits semantic state, coverage, publication, or persistence after a terminal
response.

R11.1 also scopes Raw Coverage leases and shared projected-history consumers to
the full branded Workspace Transaction identity. Stale rejection cannot touch
a newer transaction's lease, and a cancelled caller detaches independently;
only the last consumer aborts shared provider work.

R3.2b1 adds `core.provider-policy-contract` as a pure transport-neutral policy
boundary. Provider revision freshness, request limits, failure deadline,
bounded retries, stable error kinds, and the adapter port are declared before
any real provider is selected. Coverage math and policy execution remain later
substeps; no Session, Replay, chart, UI, or network owner is introduced.

R3.2b2 adds a pure `core.coverage-planning-contract`. Provider coverage is an
explicit full-window tiling rather than an inference from sparse bars. Its
planner subtracts settled intervals and splits unresolved acquisition by both
provider window and bar-count limits, in deterministic forward or backward
order. It performs no provider I/O and owns no runtime state.

R3.2b3 adds `core.provider-execution-runtime` between a concrete adapter port
and Bar Data Runtime. It executes revision TTL, deadline, retry, provider-local
concurrency, validated coverage, caller/root cancellation, and complete-plan
continuation. Bar Data Runtime remains the only raw cache/request owner. Only
deterministic fake adapters are used; no real transport is selected.

R3.3a adds `core.replay-contract` without activating a mutable clock. Manual
and Auto advancement are the same duration-based input, never a request for one
sampled display candle. A branded cursor proposal carries the complete workspace
transaction identity, base Replay revision, bounded target, and half-open reveal
window. Its cursor is an exclusive no-future cutoff; Projection remains the
future owner that applies that cutoff to bars.

R3.3b activates `core.replay-runtime` as the only mutable Replay cursor writer.
Each instance is permanently scoped to one branded Session/activation pair.
Proposing Manual or Auto advancement has zero state effects. The cursor and
revision advance only through `commitVisible`, after the future coordinator has
completed the matching visible workspace transaction. Foreign, rejected, and
base-revision-stale proposals cannot mutate the clock.

R3.3c adds `core.replay-prefetch-contract` as pure advice rather than another
request owner. When explicit contiguous raw coverage ahead of the accepted
cursor drops below low watermark, it recommends one bounded forward window
toward high watermark, clamped at Session end. A future coordinator may map the
window to provider identity and submit it to Bar Data Runtime; Replay never
performs provider I/O and pointer events never continue the plan.

### Projection Domain

Is pure. Its complete input includes instrument, source bars, proposed cursor,
session-hours mode/calendar revision, display timeframe, and no-future policy.
It returns final pane bars plus provenance. It performs no I/O and owns no
state.

R4.2 activates its provider-neutral identity-projection foundation. Ordered,
non-overlapping Raw Bar Batches must share provider, instrument, source
resolution, and dataset revision. The proposed Replay target is an exclusive
cutoff applied before Session Hours eligibility and aggregation. Registered
pure policy ports must match the selected Timeframe/Calendar capability ids;
the core domain contains no concrete capability-id branches. Output is one
deeply immutable pane snapshot with source request keys, capability/calendar
revisions, policy ids, dataset revision, and the original cursor proposal.
R4.2 implements no actual CME eligibility or higher-timeframe aggregation.

R5.2 activates `core.session-hours-domain`. It interprets the verified source's
UTC-like exchange wall-clock labels without a second timezone conversion,
applies half-open weekly ETH/RTH intervals plus versioned verified date
exceptions, and exposes source-backed visible-through and eligible traversal.
It is pure and does not own Replay or Bar Data state. Unknown/missing source
coverage remains unknown; it cannot silently become a holiday or a synthesized
bar.

R5.3 activates `core.fixed-timeframe-domain` as a pure registered aggregation
policy. Fixed buckets use an explicit Unix/clock origin and configuration offset
rather than caller/session/Replay origins. It aggregates only the eligible,
exclusive-no-future bars supplied by Projection Domain, preserves gaps, and
contains no concrete timeframe-id branches. Calendar day/week/month alignment
remains a separate policy boundary.

R5.4 activates `core.workspace-replacement-runtime` as a thin registered
selection and routing boundary over the existing Workspace Transaction Runtime.
Replay retention proposals distinguish projection-only replacement from time
advancement; exact projection provenance supplies explicit Session Hours mode
and source-level visible-through. Acquisition/presentation races and failures
cannot publish a stale selection, chart snapshot, cursor, or visibility value.

R7.2 adds a pure strictly-forward incremental projection path for Manual Next
and Autoplay. It first validates accepted capability, request, policy, and
cursor provenance, then reprojects only the accepted last aggregation bucket
plus the newly eligible raw tail. Its result must be identical to a complete
projection at the same cutoff. Backward/GoTo/history/replacement or incompatible
inputs always retain the complete path.

R9.1 gives Projection-produced immutable Pane snapshots an in-process private
identity. Chart application may skip repeated full-prefix bar normalization
only for that identity; injected or unbranded snapshots still cross the full
validation boundary. History extension and projected-history merge issue the
same identity only after producing their final frozen snapshot.

R12.2 supersedes R5.6's versioned transport with
`adapter.market-data-provider` as the concrete local market-data boundary. It
converts real request instants to V7 New York wall-clock query values,
normalizes returned wall timestamps to real instants, removes API padding
outside the exact half-open request, and returns validated Raw Bar and Coverage
contracts through the existing policy executor. It has no Session, Replay,
Projection, chart, or viewport ownership. Production has no synthetic bar
fallback; an unavailable V7/DuckDB source remains a visible failure.

The same adapter uses the read-only `/v7/market-data/projected-history` port.
The service filters source minutes under the
requested ETH/RTH policy and aggregates on V7's real-instant fixed grid before
returning one bounded projected batch. The adapter validates exact request,
dataset, timeframe, session, timestamp, and OHLCV identity. Chart Runtime still
receives only the final Workspace snapshot and remains the sole series writer.

### Workspace Transaction Runtime

Is the sole coordinator of chart-visible changes. It accepts an immutable
intent containing `sessionId`, `activationGeneration`, and `transactionId`.
It plans all affected panes, acquires data through Bar Data, projects, checks
currency once more, and commits or rejects the entire result.

It never becomes the owner of Session, Replay, Bar Data, Chart, or Viewport
state. It coordinates their public contracts.

R4.1 activates its headless coordination foundation for one branded Session
activation. A newer complete transaction identity supersedes older work;
aborting that work is cleanup only. Replay proposals remain inert across
acquisition and projection. An opaque visible-completion acknowledgement must
bind the exact identity and immutable projected snapshot before one final
currency check permits Replay `commitVisible` and accepted workspace revision
publication in the same synchronous turn. Late stale successes, late stale
failures, dependency failures, and disposal preserve the last accepted
workspace snapshot and Replay cursor. R4.1 uses fake owner ports and does not
claim real chart-visible completion.

### Chart Runtime/Adapter

Is the only chart-series writer. It applies an accepted workspace snapshot. It
does not infer missing bars, request history, choose a cursor, persist a
session, or initiate another projection.

R4.3 activates the headless Chart Snapshot Application behind this boundary.
It validates immutable projection provenance, stages without visible mutation,
checks complete transaction currency at the adapter's final mutation boundary,
and accepts only an exact branded adapter receipt before issuing exact visible
completion. Stale, failed, duplicate, forged, and disposed applications publish
no completion. R4.3 uses a deterministic fake adapter and makes no browser-paint
claim; the first Lightweight Charts adapter must add a paint-level visual gate.

R4.5 activates `adapter.lightweight-chart` as the only concrete series-API
implementation. It applies one complete snapshot, reapplies Viewport intent,
waits across rendering opportunities, and requires candle pixels from
`takeScreenshot()` before returning its exact receipt. The adapter owns native
logical-range capture and chart disposal, but no Replay, bars, projection, or
durable viewport state.

R9.1 adds an append-replacement plan for one forward transaction that admits
multiple ordered tail bars. The adapter reuses the identical projected/chart
prefix, calls `setData()` exactly once, and crosses the same two-frame series-
change proof used by safe tail updates. Historical changes, backwards moves,
and capability replacements retain full replacement and its stronger painted-
candle proof.

R6.9e1 adds adapter-only future time-axis continuity through a separate bounded
Lightweight Charts whitespace series. Projection provenance supplies the fixed
timeframe duration; whitespace contains only timestamps and never becomes bar,
Replay, OHLC, history, or Viewport truth. It is staged and rolled back with the
same visible mutation as candles while logical walls remain measured from the
latest real-candle index.

### Viewport Runtime

Owns pane-local horizontal wall and vertical-scale intent. Data commits preserve
the current intent. Only explicit Reset/Follow creates a new default intent.
Replay places new bars at the existing wall and pushes prior bars left.

R4.4 activates its pure horizontal intent foundation. One branded Session
activation and opaque pane identity bind immutable default/manual wall values.
Replay cursor movement preserves origin, offset, span, and intent revision;
native logical-range measurements create manual intent, while adapter logical
ranges remain transient projection output. There is still no chart mutation,
DOM, persistence, vertical-scale policy, or Lightweight Charts dependency.

R4.5 adds the mutable pane controller inside the same owner. The real adapter
may request a projection or submit a native logical-range measurement; it
cannot replace intent through data application.

## Deployed Runtime And Public Surface

R11.1 extends architecture ownership beyond browser modules. The binding
`v7-deployed-runtime-manifest.json` inventories the Node web delivery entry,
optional Python state/import services, deployed V7 market-data entry, Linux
deployment transaction, proxy routes, and their persistent writer surfaces.
Required and optional dependencies are
distinct; absence of State Sync or Database Bootstrap cannot disable Web or
the read-only market provider.

R12.2 makes that topology standalone. Linux systemd starts
`v7/server/market_data_api.py` as `replay-lab-market-data.service`; the release
contains only `v7/`. The read entry admits only reviewed
`/v7/market-data/*` GET paths, rejects every mutation method, and has no
persistent writer surface. Historical Maintenance code is neither packaged nor
started. Caddy exposes `/v7/market-data/*` to the read service, optional
`/v7/state/*` and `/v7/database/*` to their isolated services, and the
remaining application path to Web; internal ports stay loopback-only. The
installer recognizes the old service only as transactional upgrade/rollback
state and leaves no old route or unit after success.

R12.3 makes host capacity explicit in that topology. Linux deployment rejects
instances below the provider 512 MB class, selects a bounded DuckDB profile,
and persists only missing swap capacity as a deployment-owned writer surface.
Managed swap survives release rollback because it is host capacity rather than
application state; release/env/unit/Caddy rollback semantics are unchanged.

The static server maps each reviewed URL prefix to one exact filesystem root.
It rejects decoded traversal segments and separators, verifies lexical and
realpath containment, and refuses symlink escape. Repository docs, tests,
server/deploy source, legacy source, Git metadata, and arbitrary dependency trees
are not a web asset surface.

Deployment is one host transaction over the immutable release and its owned
Python environment, environment file, units, proxy configuration, filesystem
metadata, enablement/active state, and `current` link. Failure restores the
captured host snapshot and verifies restored service health; an incomplete
rollback retains a root-only recovery snapshot rather than deleting its only
repair evidence.

## Modular Assembly Contract

V7 is assembled from modules; it is not one application object split across
files. Every production module declares a machine-readable descriptor:

- stable module id and version;
- exactly one owning responsibility;
- public commands, queries, notifications, and data contracts;
- required and optional ports;
- lifecycle: `create`, `start`, `stop`, `dispose` as applicable;
- persistence namespace and schema, if any;
- independent harness entry;
- whether the module is core or removable.

Rules:

- imports may target another module's public entry only, never its internals;
- a module receives dependencies through explicit ports, not globals or service
  location;
- notification subscribers cannot be required for the publisher to be correct;
- stopping/disposal releases subscriptions, requests, timers, and surfaces;
- optional features can be absent without conditional branches in core owners;
- replaceable adapters pass the same contract suite;
- persistence namespaces do not overlap;
- a module's independent harness uses in-memory/fake ports and no app shell;
- the composition root wires modules but owns no product behavior;
- circular module dependencies fail the architecture gate.

Core modules are not necessarily removable from a running replay, but each is
independently constructible and replaceable behind its contract. Optional
Backtesting, Journal, analytics, evidence, drawing, and future plugins must be
freely addable/removable without modifying replay/chart core source.

## Module Harness Gates

The executable modularity harness must enforce:

1. descriptor completeness and unique ownership;
2. imports only through declared public entries;
3. acyclic dependency graph;
4. unique command/state writer inventories;
5. independent contract harness for every module;
6. minimal-core boot without optional modules;
7. optional-module removal boot matrix;
8. lifecycle cleanup with no leaked subscriptions/timers/requests;
9. adapter replacement against a shared conformance suite;
10. no V4/V5/V6 runtime imports.

No feature step is accepted when it adds production code without adding its
descriptor and independent harness to the manifest.

## Capability Extension Contract

Growing supported values must not require edits to replay/chart core. V7 uses
typed registries at the composition boundary; core owners consume capability
interfaces and opaque identities.

### Timeframes

`TimeframeDefinition` declares identity, duration/calendar alignment,
aggregation policy id, source-resolution requirements, and display metadata.
Core code cannot enumerate `1m`, `1h`, or other concrete values in branching
logic. A user-defined fixed duration is a validated definition. Calendar-based
periods use a registered alignment policy.

### Data Granularity And Seconds

`MarketDataProvider` declares instruments, available source resolutions,
coverage, precision, and request limits. Replay operates on the selected source
timeline through a provider-neutral port. Adding seconds/ticks is a provider
and execution-precision capability; it does not create a second Replay or Chart
runtime. Product surfaces must disclose the precision actually available.

### Instruments And Calendars

`InstrumentDefinition` declares symbol identity, price/quantity precision,
exchange timezone, calendar id, and supported providers. `TradingCalendar` and
Session Hours policies are registered separately. NQ/ES are configuration, not
branches in core runtime.

### Indicators And Formula Engines

Indicators are optional modules. They receive immutable, no-future pane bar
snapshots and parameters, and return declarative series/overlay outputs plus
provenance. They cannot request bars directly, move Replay, write chart-engine
instances, or mutate pane data. A future formula language runs behind a
sandboxed `FormulaEngine` adapter with versioned syntax and deterministic
conformance fixtures.

### Open/Closed Gate

Adding a conforming timeframe, provider resolution, instrument, calendar,
indicator, or formula package must require:

- a new descriptor/definition and focused module code;
- registration at composition or plugin installation;
- conformance and independent harnesses;
- no modification to existing owner implementations;
- no expansion of protected writer inventories.

If a new capability requires editing Replay traversal, Chart mutation, or
Workspace transaction branching by concrete feature id, the extension contract
has failed and the step must stop for architecture review.

## Long-Term Complexity Contract

V7 must support complex future modules without predicting their complete
behavior today. The stable kernel exposes versioned mechanisms rather than
feature-specific hooks:

- versioned command, query, notification, snapshot, and provenance schemas;
- capability discovery and compatibility negotiation at composition time;
- module-scoped persistence namespaces with independent schema migrations;
- explicit permissions for market data, persistence, chart overlays, files,
  network, and background work;
- cancellable task/scheduling ports with resource budgets and backpressure;
- structured diagnostics, transaction traces, performance metrics, and error
  attribution by module/transaction/session;
- read-only projection/snapshot subscriptions for analytics and AI consumers;
- import/export contracts that preserve version and provenance;
- compatibility suites for public ports and stored schemas;
- feature flags/configuration owned outside core business modules.

Complex modules such as semantic drawings, simulated orders, strategy formulae,
campaign analytics, bulk data providers, optimizers, or AI assistants may
coordinate through a workflow module, but they cannot receive private owner
state or bypass public commands. Workflow modules orchestrate; they do not
become alternate state owners.

ADR-V7-001 is the accepted first detailed semantic-drawing boundary in
`V7_DRAWING_AND_SEMANTIC_ANNOTATION_FOUNDATION_R13_1.md`. It separates
market-coordinate `DrawingGeometry`, generic `DrawingEntity`, typed
`SemanticArtifact`, declarative `ArtifactProjection`, and adapter-local
`RenderPrimitive`. One removable Annotation Runtime remains the sole writer of
its document; the existing Chart Runtime/Adapter remains the sole visual
writer. FVG, OB, Breaker, BSL, and EQL are semantic artifacts which may produce
several projections, not subclasses or string labels of line/rectangle
geometry. Its human gate closed on 2026-08-08. R13.2 activates only the pure
`optional.annotation-geometry-domain`: immutable market-coordinate anchors,
Point/Segment/Rectangle Geometry, and a composition-local extensible Registry.
It adds no Annotation document writer, Chart projection, interaction, UI,
persistence, Replay policy, or semantic type.

R13.3 separately activates `optional.annotation-runtime` as the sole headless
writer of one Session-scoped Annotation Document. It owns only generic Drawing
creation, Geometry replacement, archive/restore, exact document/entity
revisions, and reversible fake-Repository transactions. Geometry is consumed
through an optional public port. The Runtime contains no semantic business id
or package branch and can be removed without changing existing applications.
Durable persistence/history, Chart projection, interaction, and semantic
plugins remain later owner boundaries.

R13.4 separately activates `optional.annotation-chart-projection` under the
existing `chart-runtime-adapter` owner. It consumes immutable declarative
projections rather than Annotation Runtime internals, transacts only Annotation
primitive attach/update/detach through an injected bounded adapter, and proves
exact rollback/finalize/disposal with a static Segment Series Primitive. It
does not call candlestick `setData`/`update`, mutate Viewport/Replay/Workspace,
or wire a browser control. The module is removable and contains no semantic
business id; R13.5 interaction and transient preview remain separate.

R13.5 activates `optional.annotation-interaction` as a removable one-shot
generic Segment gesture controller. It receives only normalized market-anchor
events and injected Geometry, transient Preview, and generic-Drawing command
ports; it never receives DOM, Chart, Series, Replay, Bar Data, Workspace,
repository, or semantic-package handles. The existing Chart-owned optional
projection module now also owns the exclusive PointerEvent lease, exact
display-to-market coordinate conversion, native pan/zoom suppression and
restoration, and a latest-wins transient Preview port. Pointer moves never
write accepted Drawing state, cancellation clears Preview with zero command,
and pointer-up may issue exactly one command. This boundary is proven only in
a test fixture in R13.5 and does not compose production drawing UI.

R13.6 extends only the V7-owned interaction/projection fixture with generic
Rectangle placement, accepted hit selection, geometry-specific Inspector
drafts, and one exact-revision save command. TradingView-style click-move-click
and drag-release placement share the same interaction owner; Escape and
secondary-click cancellation publish no Drawing and suppress the native menu.
Selected Segment endpoint handles are projection state, not a second document
owner. This remains fixture-only and introduces no production toolbar.

R13.7 adds removable `adapter.annotation-persistence` as the sole writer of
Session-keyed Annotation bytes while `optional.annotation-runtime` remains the
sole accepted document/history writer. Runtime owns bounded undo/redo and
monotonic document revisions. The adapter owns wire migration, opaque envelope
sidecars, import/export, compare-and-swap, and exact reversible writes. Geometry
restoration dispatches only through registered definitions. No current-Session
singleton, browser storage choice, Chart/Replay dependency, server replication,
or semantic package enters this boundary.

R13.8 adds removable `optional.annotation-context-projection` between immutable
Annotation state and injected per-Chart projection ports. It derives bounded
per-Pane sets from one exact Session/Annotation/Replay frame, dispatches anchor
mapping through composition-local versioned policies, and traverses Geometry
only through registered Geometry definitions. Replay cutoff changes use a
separate monotonic reconciliation revision, so one unchanged Annotation
revision can hide and restore projected shapes without rewriting canonical
Geometry or history. The coordinator prepares and applies every mounted Pane
reversibly before accepting the decision; only the Chart-owned projection port
may mutate primitives. It receives no Chart, Series, Canvas, Bar requester,
Replay writer, Workspace state, persistence, or semantic-business authority.

R13.9 activates the first trusted-build semantic vertical slice through
`optional.annotation-semantic-registry` and removable
`optional.semantic-liquidity-level`. BSL/SSL meaning remains package-local;
Annotation Runtime receives only branded generic Artifact drafts, and the
package emits only portable projection inputs and host-rendered Inspector
schemas. H107 accepts the bounded BSL/SSL lifecycle, unresolved restore,
no-future, and optional-removal behavior.

The documentation-only R13.9a stage review in
`V7_STAGE_ARCHITECTURE_REVIEW_R13_9A.md` reconfirms those owner boundaries but
blocks a second semantic package until three contract defects are repaired:
core provenance must stop encoding the first package's exact evidence shape;
durable Artifacts must retain immutable construction package/definition
identity; and failed-generation asynchronous disposal must settle before
re-enable. R13.9 remained accepted, and R13.10 was not authorized at that
checkpoint.

R13.9b repairs those blockers without adding a business type. Semantic Artifact
schema 2 separates a host-owned universal no-future provenance header from one
deeply portable `packageProvenance` record and stores immutable, host-stamped
package/definition construction identity. Registry resolution is exact across
package, type, definition, and version; legacy schema-1 Artifacts migrate as
`legacy-unrecorded` and remain unresolved. Failed policy-generation disposal is
tracked and serialized before re-enable. Construction/identity, cleanup, and
document migration live in focused internal modules rather than expanding
Registry or wire entry-file responsibilities. H108 proves the boundary with a
second synthetic package.

R13.10a separately activates the removable, stateless
`optional.annotation-evidence-resolver`. It consumes only one composition-
supplied owner-accepted Session/Workspace/Pane/Replay snapshot, one exact
selected Bar plus optional exact Artifact revisions, and one bounded generic
neighbor requirement. Its frozen Evidence Bundle retains dataset, instrument,
source/display timeframe, Bar interval, accepted Workspace revision, Artifact
revision, and exact Replay cutoff. A partial tail Bar or post-cutoff Artifact
fails no-future resolution; missing neighbors fail instead of being requested.
The module has no Bar Data, Replay, Workspace, Annotation Runtime, semantic
package, Chart, persistence, UI, storage, network, or lifecycle authority.
R13.10b now separately activates removable `optional.annotation-bar-picker`
under the existing interaction owner and adds a Bar mode to the same exclusive
Chart-owned interaction lease used by Drawing gestures. The controller receives
only normalized Pane/exact-Bar-start events; the Chart adapter derives those
events from the mounted Series' original `seriesData` item rather than rounded
pixels. The Picker requests no Bars, changes no Replay/Workspace/Annotation
state, and leaves native Chart navigation enabled. Official Chart click is the
primary acceptance path; a same-owner no-drag pointer fallback may accept only
a candidate already resolved from official Series data and never a
coordinate-derived Bar. Its Bar-only pointer-down observation runs at window
capture so a vendor container cannot hide the event; plot filtering and the
existing shared lease keep that observation bounded. Pan-sized movement emits
no selection. Official clicks with transiently empty Series data may reuse only
the last exact candidate at the same time-axis slot; an independent 8px Picker
click slop absorbs physical/remote jitter without changing Drawing's 3px drag
threshold. Remote environments may emit transient window blur inside a
complete Picker click; only an already active primary Picker press receives a
150ms focus-loss completion window, while ordinary/idle focus loss remains an
immediate cancellation. Its
fixture-only candidate and accepted highlights use the existing transient
projection owner and center one full slot on the exact target Bar. H110 and the
corrected human visual gate are accepted. Evidence Inspector and overrides
remain outside that step.

R13.10c activates removable `optional.semantic-fair-value-gap` as a second
trusted-build business package and the first evidence-derived construction.
It accepts only a branded R13.10a Evidence Bundle with exact adjacent
`[-1, 0, 1]` Bars, common source identity and Replay cutoff, no Artifact
references, and the matching branded Session. Its package-local versioned
definition recognizes only strict bullish `preceding.high < confirming.low`
or bearish `preceding.low > confirming.high` wick gaps; touching and overlap
fail closed. Generic Runtime stores the host-stamped Artifact without an FVG
branch. The package emits only Rectangle and midpoint-Segment subjects under
the existing containing-bucket/no-future projector, while the Chart-owned
Rectangle primitive renders a bounded projection-only label. Disable or
absence removes projections but preserves unresolved semantic bytes. The
package receives no Chart, Series, Canvas, DOM, Bar requester, Replay or
Workspace writer, Annotation writer, persistence, storage, or network handle.
H111's automated headless/Chromium evidence and focused local human visual gate
are accepted. R13.10c is closed without changing the production toolbar.
Evidence Inspector, editable overrides, detectors, production toolbar,
R13.10d, and R13.10e remain unauthorized.

ADR-V7-004 now binds the product-level plugin taxonomy without changing this
owner graph. Kernel owners remain non-plugin descriptor `kind: "core"`
modules. Built-in first-party **Core Plugins** remain optional/removable
capability modules and will carry distribution/trust metadata rather than being
promoted into the Kernel. **Community Plugins** later use the same public
capability contracts under stricter install, permission, isolation, budget,
and failure controls. The full contract is
`V7_CORE_AND_COMMUNITY_PLUGIN_MODEL_SPEC.md`.

FVG, MA/SMA, BSL/SSL, and Fibonacci are the accepted initial Core capability
catalog. Core status freezes a maintained versioned baseline; it does not
erase semantic variants. Higher-level plugins may declare `requires`,
`provides`, and `extends` relationships against public capability ids, but may
not import another plugin's internals or directly control its UI/state. The
ModuleHost resolves and injects declared ports, suspends incompatible
dependents, and disposes in reverse dependency order. Plugin-produced durable
evidence remains host-owned and readable when a package is disabled or absent.

The eventual host-rendered Plugin Center is delivered separately: P0 manages
trusted-build Core packages only; later phases add local declarative install,
a signed free Community registry, and isolated calculation workers. Arbitrary
community privileges and a paid Marketplace are not implied or authorized.
R13.10d/e remain focused on Inspector/override and manual FVG production
closure, and may not absorb the general Plugin Center.

ADR-V7-002 adds a mandatory community-reuse gate before R13.6. V7 may adapt
official Lightweight Charts Series Primitive lifecycle, renderer/view,
coordinate conversion, update, and teardown patterns, but reviewed community
drawing/toolkit runtimes cannot receive raw owner authority or become a second
Chart, interaction, Annotation document, Replay, or persistence owner. No
candidate becomes a production dependency through the gate. Indicator
calculation remains a separately decided adapter concern. Binding evidence is
`V7_COMMUNITY_REUSE_GATE_FOR_R13_6.md` and
`v7-community-reuse-audit.json`; the gate remains binding after R13.6.

The kernel must remain small: Session identity, Replay truth, Bar Data access,
projection transactions, Chart application, Viewport intent, module lifecycle,
and public contract/version infrastructure. Speculative feature engines are not
added to core until a reviewed vertical slice needs them.

## UI Architecture Boundary

UI modules render read-only view models, collect user intent, and dispatch
public commands. They never read owner internals or repair incomplete runtime
state. A presentation system module owns design tokens and reusable interaction
states; feature surfaces compose those primitives without owning global CSS or
chart lifecycle.

R8.10 activates `core.replay-workspace-composition` between the Replay
Workspace UI adapter and the existing runtime owners. The UI surface constructs
only its view and explicit presentation adapter, then dispatches controls to the
composition command port. The composition constructs Session-scoped owners,
wires only public ports, and disposes them in reverse order; it imports no DOM
surface internals and owns no semantic state held by those owners. At the
R8.10 checkpoint, production HTML boot remained assigned to R8.11.

R8.11 activates two explicit application lifecycle adapters. Each real route
loads its transitive graph from the committed manifest/descriptors, registers
public entries with one isolated ModuleHost, and constructs browser resources
only inside the selected application module's `start()`. Host rollback and
normal stop dispose the application before its dependency ports. The Session
application consumes Replay Workspace as an optional port, so its absence is a
real booted production case rather than a descriptor-only fixture.

Every browser-visible module declares:

- supported viewport/container constraints;
- loading/empty/error/stale/ready view-model variants;
- keyboard/focus behavior and accessible names;
- visual-regression fixtures;
- whether refresh gating is workspace-wide or pane-local.

Calendar/date-time presentation is owned by the shared Calendar Surface
adapter. Feature surfaces consume its public selection contract and cannot
import its DOM or calendar-model internals. Calendar Surface owns navigation,
selection, focus, and its rendered subtree only; it never requests market data,
decides coverage, queries feature records, moves charts/Replay, or persists
Session state. The UI Calendar Surface is distinct from the future
`TradingCalendar` exchange-session/alignment capability. Future decorated-day
or chart-jump behavior requires a separate reviewed consumer contract rather
than speculative business-data ports in the calendar module.

Blank chart output is never treated as a loading indicator. Runtime readiness
must be explicit, and the prior accepted chart snapshot remains visible behind
a bounded refresh gate whenever product semantics allow it.

Product-Pane status is a read-only Canvas overlay owned by Replay Workspace UI;
it does not reserve chart geometry or become a second chart state owner.
Pane Maximize/Restore is transient outer-DOM presentation: it keeps all chart
hosts mounted, never rewrites Pane Layout intent, and cannot move Replay,
request data, mutate series, persist state, or open a Workspace transaction.
Reset View remains an explicit Pane-local Viewport intent. Pane-local controls
occupy a lower-right plot-safe dock, vertically stacked left of the price scale
and above the time scale; scale geometry remains owned by the chart adapter.
Their visibility follows actual Pane hover or keyboard-visible focus and is
independent from the persistent active-Pane selection.

### Workstation Settings

R6.9i activates `core.workstation-settings` as the sole owner of one global,
versioned visual-preference value, its revision, recovery state, persistence
record, and presentation-only Save transaction. It is deliberately separate
from Session records, Pane intent, and the global Replay Navigation preference.

Consumers expose stage/apply/commit/rollback. The owner stages every consumer,
applies all, writes the durable record, and only then commits and publishes the
new revision; any failure rolls every applied consumer back and restores prior
durable state when necessary. The Pane-set adapter is the only initial consumer:
it fans Grid visibility to every current Lightweight Charts adapter and applies
the committed value to future Panes before first data paint. Settings cannot
open a Workspace transaction or mutate Replay, chart series data, bars,
Viewport intent, or Pane operational state.

R6.9j extends the same branded value and transaction with Symbol presentation.
The Pane-set remains the sole fan-out owner, while each child chart adapter maps
Body/Border/Wick intent through `series.applyOptions` and never through series
data mutation. Auto precision is derived from the current Pane instrument's
exact decimal `priceIncrement`; manual precision changes formatting only and
retains the real `minMove`. One pure price-presentation helper is shared by the
series price scale and the Pane OHLC/absolute-change readout. Instrument changes
apply their formatter inside the existing fallible chart transaction and restore
the prior formatter if that transaction is rejected.

R6.9j1 keeps the six color controls replaceable by separating three owners. The
version-3 Settings value owns normalized `#RRGGBBAA` presentation intent and
deterministically migrates version-2 opaque colors. A small MIT-licensed
`vanilla-colorful` Web Component owns only precise color/alpha interaction. The
V7 UI adapter owns the popup, fixed palette, accessibility, draft behavior, and
commit boundary. Recent colors live in the distinct global
`v7.color-history:global` convenience record: only colors touched by a
successfully accepted Settings Save enter that record. Cancel, Reset without a
color choice, Escape, backdrop dismissal, and rejected Saves have no history
side effects. Color-history persistence failure cannot roll back an already
accepted Settings transaction.

R6.9k advances the Settings value to version 4 with `paneReadout` and
`currentPrice` presentation families. The Pane overlay owns OHLC, bar-change,
and nullable Volume visibility while symbol and timeframe provenance remain
mandatory. The chart adapter owns current-price Name, Value, and Line. Native
series title/value/line options cover the six combinations where Name is off or
Value is on; one adapter-owned series primitive covers both name-only/no-value
combinations without creating a second series-data writer. Foundation metadata
supplies the compact instrument
label through an explicit Pane-set resolver, so the adapter never parses opaque
Instrument ids. All fields remain one global presentation transaction and
cannot move Replay, Workspace, Pane, Viewport, bars, or series-data revisions.

R6.9l advances the Settings value to version 5 with Canvas, Crosshair, scale,
margin, and Pane-control presentation. The Pane-set adapter remains the sole
chart-presentation fan-out owner: each child maps solid background, shared Grid,
Crosshair color/opacity/width/style, scale text, and top/bottom price margins
through native Lightweight Charts options. Replay truncation temporarily owns
its blue selection Crosshair while armed and restores the committed user
Crosshair when it exits. Replay Workspace UI owns only hover/always/hidden DOM
visibility for the existing Pane-control dock. A separate transactional
Viewport consumer routes `rightMarginBars` into Viewport Runtime as the default
for future/new Panes and explicit Reset View; changing Settings never rewrites
an existing manual wall or increments its Viewport revision. All fields remain
one global transaction and cannot mutate Replay, Workspace, Pane, bars,
series-data, or chart-visible receipt state.

The R6.9l review correction adds one owner-managed preview layer above the
durable value. Each valid dialog draft stages and applies every Settings
consumer synchronously but does not commit a consumer, write persistence, or
replace the authoritative revision. Replacing a preview first rolls its stages
back to the committed value, then applies the next complete draft. OK persists
and commits the currently applied stages as one revision. Cancel, close,
Escape, backdrop dismissal, or Workspace disposal rolls the preview stages
back in reverse order. Preview/apply/persistence failures also restore the
committed presentation; the dialog never writes chart or Viewport surfaces
directly. Replay Workspace presentation is itself a formal reversible consumer,
so Pane readouts/control visibility cannot escape the same transaction as chart
and Viewport presentation.

R6.9m advances the Settings value to version 6 with one shared time-
presentation family. `core.workstation-settings` owns the pure conversion from
canonical epoch milliseconds to New York, UTC, or resolved browser-local text,
including date order, optional detailed weekday, and 12/24-hour presentation.
The chart adapter consumes it only through Lightweight Charts'
`localization.timeFormatter` and `timeScale.tickMarkFormatter`; Replay
Workspace, Exact GoTo, and Session Browser consume the same public helper.
Calendar Surface accepts an injected wall-date/time presentation port and owns
only its DOM/control conversion. It does not depend on Workstation Settings or
acquire Replay, market-session, Quick GoTo, or Economic Calendar state.

Display timezone is deliberately not a domain timezone. Session creation and
Quick GoTo anchors remain New York wall-time contracts. Exact GoTo converts the
selected display-zone wall value back to a canonical epoch. The UI value now
names the exact minute to reveal and is translated forward by one minute to the
existing exclusive Replay cutoff; the selectable upper bound is therefore the
last minute strictly before Session End. Preview and
commit can therefore reformat every mounted and future Pane without moving the
Replay cursor, changing visibility, requesting bars, issuing a Workspace
transaction, rewriting series data, or changing Pane/Viewport revisions.

Session creation's market-date policy remains owned by Session Browser rather
than Calendar Surface. It adds source-backed Saturday shorthand: Start resolves
to the following Sunday `18:00`, while End resolves to the preceding Friday
`16:59`, both in New York time and only when the fixed boundary is inside shared
source coverage. The End presentation translates to Friday `17:00` for the
stored exclusive Replay range so the `16:59` bar remains visible. Calendar
Surface still owns only generic date-time DOM, formatting, and epoch conversion.

The overall-acceptance Manual Next correction keeps the UI target enabled once
an accepted Chart exists and queues click intents in command order. Workspace
Execution exposes only an idle notification; every queued intent still enters
the same single-flight navigation transaction and Replay Runtime remains the
sole cursor owner. Workspace UI dispatches Escape through the existing
truncation toggle command and owns no truncation state beyond presentation.

The 2026-08-05 overall-acceptance correction advances Workstation Settings to
version 7 with global `paneReadout.fontSize`. `core.workstation-settings` owns
its 10–18px integer contract, 12px default, persistence, and deterministic
version-1 through version-6 migration. Replay Workspace UI projects the value
to every current/future DOM-only Pane overlay and scales the Pane number,
symbol, timeframe, OHLC, change, Volume, and overlay height through one CSS
custom property. It does not route through Lightweight Charts: the library's
documented `layout.fontSize` controls only scale text. Preview, Cancel, Save,
rollback, and hard-reload semantics remain the existing global Settings
transaction and cannot move Replay or mutate Chart data.

## Session Isolation Invariant

All mutable records and async results carry:

```text
sessionId + activationGeneration + transactionId
```

- activation generates a new monotonically increasing generation;
- leaving a session invalidates its pending transactions;
- a completion is accepted only if all three identities match current state;
- stale success and stale failure are observational only;
- no chart snapshot, cursor, viewport, layout, or persistence write can omit
  the explicit session identity;
- switching A -> B -> A creates three distinct activation generations.

Session identity is not a guard sprinkled across stages. It is required by
every public transaction and commit contract.

## Atomic Projection Invariant

A user intent produces at most one chart-visible commit:

1. capture immutable input;
2. produce one plan for all affected panes;
3. acquire all required raw data;
4. project every pane;
5. reject stale or failed work before mutation;
6. atomically accept Replay and workspace snapshot revisions;
7. apply all affected chart panes behind one visual gate;
8. reapply existing viewport intents;
9. publish completion after the result is visible.

Append, replace, prepend, cached, and uncached are internal strategies, not
separate semantic pipelines.

## Cross-Product Requirement

The same transaction owner handles create/open/re-enter, Next/Auto/Previous,
TF, ETH/RTH, pane layout, pane instrument, refresh restore, and history
extension. Tests cover their combinations rather than timeframe-specific fixes.

## Failure Semantics

- failure preserves the last accepted snapshot and pauses playback;
- partial multi-pane state is never exposed;
- a stale result cannot clear a newer loading gate or surface an error;
- network delay exists only at raw acquisition boundaries;
- cache-hit Next has no artificial delay;
- chart readiness is measured by visible output, not command dispatch.
