# V7 Restart Handoff

Last updated: 2026-08-13 after the Calculated-Series Chart-Owned Projection
Slice candidate was drafted without implementation authorization

## Restart Resume Checkpoint

Resume on branch `feature/v7-drawing-semantic-annotation`. The current branch
contains separately committed accepted R13.10c and R13.10d checkpoints plus
the Core/Community plugin-model decision. P0a/H113 now closes as its own thin
contract checkpoint. R13.10e is accepted as the first production vertical
slice through it; H114 passed its automated and focused human visual gates.
P0b and H115 are accepted after passing automated evidence and the corrected
focused human visual/interaction gate. P1a and H116 are accepted after the
separately authorized headless implementation. P1b has an accepted binding
specification and its separately authorized P1b.1 contract/archive, P1b.2
transaction/storage, and P1b.3 two-surface Plugin Center correction are
implemented. H117 is executable with 54 frozen negative groups and real-browser
IndexedDB/product evidence. The corrected P1b.3 focused human review passed on
2026-08-12, but H117 remains unaccepted because P1b.4 MCP/closure and all later
phases remain separately gated. ADR-V7-006's ten material decisions are now
accepted: the open host-governed Profile Registry architecture, five non-
exhaustive initial truth-model Profiles, orthogonal capabilities/Domain Tags,
multi-Contribution packages, and typed host composition are binding. ADR-V7-005
is now also accepted: calculated-series instances, Main/internal Chart Region
placement, structural Scale compatibility, multi-Plot output, exact no-stale
projection frames, host ownership, and same-Profile Core/Community semantics
are binding architecture. Acceptance of both decisions authorized no code. The
first required pure-contract dependency is now accepted: its separate future
Profile-registry/calculated-series owners, exact P0a binding, portable values,
limits, diagnostics, and migration contracts are binding. Acceptance of its
ten decisions authorized no code, delivery id, or Harness id. No calculated-
series implementation step is currently authorized; P1b.4 remains paused and
H117 remains unaccepted.
`git log` is the authoritative commit identity.

After a machine or agent restart, run:

```bash
cd /home/leo/myworkspace/trading/backtesting-v7
git branch --show-current
git log -1 --oneline
git status --short
```

Then read, in order:

1. `v7/docs/V7_RESTART_HANDOFF.md`
2. `v7/docs/V7_PLUGIN_CONTRIBUTION_PROFILES_AND_COMPOSITION_SPEC.md`
3. `v7/sessions/session_20260812_plugin_contribution_profile_composition_specification_draft.md`
4. `v7/sessions/session_20260812_plugin_contribution_profile_composition_specification_acceptance.md`
5. `v7/docs/V7_GENERIC_INDICATOR_PROJECTION_AND_CHART_REGION_SPEC.md`
6. `v7/sessions/session_20260812_calculated_series_projection_chart_region_specification_acceptance.md`
7. `v7/docs/V7_CALCULATED_SERIES_PURE_CONTRACT_SLICE_SPEC.md`
8. `v7/sessions/session_20260812_calculated_series_pure_contract_candidate_specification.md`
9. `v7/sessions/session_20260812_calculated_series_pure_contract_specification_acceptance.md`
10. `v7/sessions/session_20260812_generic_indicator_projection_chart_region_specification_draft.md`
11. `v7/docs/V7_CORE_AND_COMMUNITY_PLUGIN_MODEL_SPEC.md`
12. `v7/docs/V7_DRAWING_AND_SEMANTIC_ANNOTATION_FOUNDATION_R13_1.md`
13. `v7/docs/V7_REAL_PANE_WORKSPACE_R6_5.md`
14. `v7/docs/V7_LOCAL_PLUGIN_PACKAGES_AUTHORING_MCP_P1B.md`
15. `v7/docs/V7_LOCAL_PLUGIN_PACKAGE_P1B3_HUMAN_REVIEW.md`
16. `v7/sessions/session_20260812_p1b_3_developer_mode_surface_removal.md`
17. `v7/sessions/session_20260812_p1b_3_plugin_center_developer_mode_implementation.md`
18. `v7/sessions/session_20260812_p1b_2_inventory_transaction_implementation.md`
19. `v7/sessions/session_20260811_p1b_1_contract_archive_implementation.md`
20. `v7/sessions/session_20260811_p1b_local_packages_authoring_mcp_specification_acceptance.md`
21. `v7/sessions/session_20260811_p1b_local_packages_authoring_mcp_specification_draft.md`
22. `v7/sessions/session_20260811_p1a_agent_native_developer_kit_implementation.md`
23. `v7/docs/V7_AGENT_NATIVE_PLUGIN_DEVELOPER_KIT_P1A.md`
24. `v7/docs/V7_AGENT_NATIVE_PLUGIN_DEVELOPER_KIT_P1A_RATIONALE.zh-CN.md`
25. `v7/sessions/session_20260811_p1a_agent_native_developer_kit_specification_acceptance.md`
26. `v7/sessions/session_20260811_p1a_agent_native_developer_kit_specification.md`
27. `v7/docs/V7_CORE_PLUGIN_CENTER_P0B.md`
28. `v7/sessions/session_20260811_p0b_core_plugin_center_implementation.md`
29. `v7/sessions/session_20260811_p0b_core_plugin_center_specification.md`
30. `v7/docs/V7_PRODUCTION_MANUAL_FVG_WORKFLOW_R13_10E.md`
31. `v7/sessions/session_20260810_r13_10e_production_manual_fvg_workflow.md`
32. `v7/docs/V7_BUILT_IN_PLUGIN_CONTRACT_SUBSTRATE_P0A.md`
33. `v7/sessions/session_20260811_plugin_agent_authoring_pine_migration_amendment.md`
34. `v7/sessions/session_20260810_plugin_platform_interface_language_amendment.md`
35. `v7/docs/V7_FVG_EVIDENCE_INSPECTOR_VALIDATED_OVERRIDE_R13_10D.md`
36. `v7/docs/V7_DETERMINISTIC_FVG_CONSTRUCTION_PROJECTION_R13_10C.md`
37. `v7/TODO.md`

R13.10b/H110 and R13.10c/H111 are accepted. The focused FVG fixture contains
no temporary diagnostic surface, and its acceptance server is stopped.
ADR-V7-004 now classifies FVG, MA/SMA, BSL/SSL, and Fibonacci as built-in Core
Plugin capabilities and binds public derived dependencies plus a future
host-rendered Core/Community Plugin Center. Its later amendment binds one
strict TypeScript SDK/compiled ESM artifact model, JSON-schema-rendered
Inputs/Style/Visibility and applicable Evidence/History panels, and one
candidate pipeline for registry and local archives, with unpacked candidate
inspection retained as tooling. The thin P0a manifest/contribution/settings substrate is now proven
by FVG before broader plugin families or distribution layers. R13.10d Evidence
Inspector and validated overrides are accepted under H112 after the corrected
single-layer Preview human gate. R13.10e now composes the generic production
tool → exact Picker → Evidence → Core FVG → Runtime → multi-Pane projection →
Inspector path. H114 passes automation and the user accepted the focused
production review on 2026-08-11. P0b now implements the trusted-build Core-only
Center, restart-bound single-ModuleHost generation, durable Core profile, and
H115 gate. The first review found and corrected a shared-footer overlap; the
user accepted the corrected surface. P1a now implements one strict-TypeScript
SDK/CLI operation engine, isolated synthetic-host testing, non-installable
developer evidence bundle, structured diagnostics/provenance, and H116. Its
Chinese rationale preserves the four accepted boundary decisions; its source
stays outside the production graph. Community/Installed/Updates installation,
MCP, registry, Pine translator, arbitrary production code, Marketplace, and
later execution remain unavailable. P1b.1 implements the non-executing
contract/archive substrate. P1b.2 now adds pure change/migration contracts, one
sole inactive package-store runtime, immutable generations and receipts,
package/profile settings, atomic IndexedDB CAS, rollback/quarantine/tombstones,
cleanup/restart recovery, and Restricted Mode. P1b.3 now composes exactly the
Core-only Included and local Installed owners with explicit archive review/
commit/recovery. The accepted correction removes the production Developer Mode,
preference, retained directory handles, and generation lifecycle while keeping
strict unpacked inspection as Developer Kit security evidence. H117 has 18 + 18
+ 18 negative groups and corrected real-Chromium IndexedDB/product evidence. It
adds no MCP, external descriptor, import, evaluation, trust, execution, or
activation path.

ADR-V7-004's 2026-08-11 amendment requires the now-implemented Agent-native
developer path: one machine-readable strict-TypeScript SDK, canonical
CLI/library, deterministic conformance Harness and receipts. The accepted P1b
specification defines a local `stdio`, workspace-bounded MCP adapter over those
same eight operations with no install or lifecycle authority. A later Pine indicator
migration assistant parses and inventories authorized source, generates an
ordinary TypeScript package and tests, and fails closed on unsupported/no-future/
realtime/strategy semantics. It follows the target SDK and Worker tier; it does
not make Pine a runtime language or bypass human equivalence review.

## Current Overall Acceptance State

Phase-one foundation acceptance is closed as V7.0.0. The user accepted the
current standalone ES/NQ minute-replay system as a useful, complete product loop
that can remain valuable without later features and can serve as the stable
base for forks. Both human acceptance rounds and the binding automated gates
support that decision. The existing-database Data Acquisition mismatch found in
the second round is corrected by R12.8. Its focused cloud redeploy check, clean-
host bootstrap permutations, and multi-mode deployment matrix remain useful
non-blocking operational evidence rather than open milestone gates. Binding
closure: `V7_FOUNDATION_MILESTONE_V7_0_0.md`.

Post-milestone development now follows accepted ADR-V7-001. R13.2 provides
`optional.annotation-geometry-domain`; R13.3 provides
`optional.annotation-runtime` as the removable sole Session document writer;
R13.4 provides `optional.annotation-chart-projection` under the existing Chart
visual owner. R13.5 adds removable `optional.annotation-interaction` plus
Chart-owned normalized gesture and transient Preview ports. R13.6 adds the
fixture-only Rectangle, selection, Inspector, endpoint-handle, and atomic
right-click-cancel slice; its corrected human gate is accepted. R13.7 adds
removable `adapter.annotation-persistence`, registered Geometry restore,
Session-keyed hard-reload state, bounded exact-revision undo/redo, v1-to-v2
migration, and opaque-envelope-preserving import/export. H100–H105 are accepted.
There is still no production drawing toolbar; the accepted semantic business
slice remains isolated behind the removable package boundary and fixture.
R13.8 source-agnostic Pane/time/Replay projection and H106 are accepted after
the local NQ 1m/5m visual gate. Exact Segment, containing-bucket Rectangle,
Replay no-future hide/restore, and unchanged candles were confirmed. R13.9 is
implemented under `V7_SEMANTIC_PACKAGE_LIQUIDITY_LEVEL_R13_9.md`. H107's
headless and real-Chromium evidence passes. Its corrected local human visual
gate is accepted: the first pass found an Inspector-only no-future leak, and
the accepted correction exposes only the generic hidden state before
observation with no semantic resolution/type/price fields. H107 is accepted;
at that closure R13.10 remained unauthorized. The documentation-only R13.9a review then
reconfirmed the full automated graph and owner boundaries but reproduced three
preconditions for a second semantic package: the core Artifact provenance shape
is fixed to the BSL/SSL slice, construction package/definition version is not
stored, and a failed policy generation can dispose asynchronously after its
replacement activates. R13.9b is now accepted under
`V7_SEMANTIC_CONTRACT_HARDENING_R13_9B.md`: Artifact schema 2 carries exact
host-stamped package/definition construction identity plus portable package
evidence; schema-1 identity migrates as unresolved `legacy-unrecorded`; and
failed-generation disposal settles before re-enable. H108 proves a second rich-
provenance package, durable round trips, upgrade mismatch, and lifecycle
serialization. R13.10a is now accepted under
`V7_PURE_ANNOTATION_EVIDENCE_RESOLVER_R13_10A.md`: one removable stateless
resolver accepts only a composition-supplied Session/Workspace/Pane/Replay
snapshot, exact selected Bar/Artifact revisions, and a bounded neighbor
requirement. H109 proves exact immutable provenance, deterministic output,
missing-neighbor failure, no future/unclosed evidence, zero Bar acquisition,
and optional removal. It adds no visible surface. R13.10b is accepted
under `V7_EXACT_BAR_PICKER_R13_10B.md`: removable
`optional.annotation-bar-picker` shares the existing exclusive Chart
interaction lease, resolves only exact mounted-Series Bar starts, preserves
native navigation, and emits no accepted-state mutation. H110 and focused
real-Chromium evidence pass. The user accepted its fixture-only
cyan-candidate/lime-accepted human visual gate on 2026-08-09 after the final
regression covered transient window blur during a complete click. R13.10c is
now authorized under
`V7_DETERMINISTIC_FVG_CONSTRUCTION_PROJECTION_R13_10C.md`. Removable
`optional.semantic-fair-value-gap` consumes only branded exact three-Bar
evidence, derives strict bullish/bearish wick gaps and immutable parameter
provenance, and emits generic Rectangle/midpoint/label projections through the
existing no-future and Chart owners. H111's headless and real-Chromium paths
pass, including durable unresolved restore, package disable/re-enable,
multi-Pane projection, unchanged candles, and native wheel/drag. The user
accepted the focused local visual gate on 2026-08-10. R13.10d is now separately
authorized and implemented: a bounded host schema renders Semantic/Evidence/
History fields; only the original observation cutoff permits a Core FVG
inner-zone edit; immutable baseline, append-only audit events, exact branded
revision drafts, Runtime-only accepted writes, transient Preview rollback,
durable rollback/round-trip, and unresolved read-only survival are automated in
H112. Its real-Chromium automation and corrected human interaction/visual gate
pass: accepted bytes remain intact while one dirty Preview is visible, and
Cancel/Apply settle to one accepted layer. H112 and R13.10d are accepted.
Detector and production-toolbar behavior remain unauthorized.
P0a is now implemented under
`V7_BUILT_IN_PLUGIN_CONTRACT_SUBSTRATE_P0A.md`: non-removable
`core.plugin-contract` validates portable built-in manifests, contribution and
parameter schemas, scoped effective settings, dependency plans, and read-only
ModuleHost status. FVG is its first conformance manifest. H113 passes without a
human gate because P0a adds no product UI or Chart behavior; ModuleHost remains
the sole lifecycle owner.
R13.10e is accepted under
`V7_PRODUCTION_MANUAL_FVG_WORKFLOW_R13_10E.md`: removable
`optional.annotation-manual-workflow` consumes only public P0a, Picker,
Evidence, Semantic Registry, Runtime, persistence, projection, Chart-surface,
and UI ports. The product route contains no FVG semantic branch. H114 passes
six negative controls and real Chromium for invalid/valid exact clicks,
single-write construction, single-layer Preview/Cancel/Apply, multi-Pane
projection, hard-reload provenance, unchanged candles, and native wheel input.
The focused production interaction/visual gate was explicitly accepted on
2026-08-11. The four R6.9 baselines affected by the FVG toolbar were recorded
only afterward; unrelated H091 visual findings remain preserved.
ADR-V7-002 audited the current public Lightweight Charts drawing,
indicator, toolkit, and alternative-engine ecosystem at pinned revisions.
Official Primitive/rendering patterns are approved for adaptation, but no
reviewed community runtime may become a parallel V7 owner or production
dependency. Indicator calculations remain a later adapter decision. The audit
adds no pixels or runtime code.
Binding records:
`V7_DRAWING_AND_SEMANTIC_ANNOTATION_FOUNDATION_R13_1.md` and
`V7_MINIMAL_ANNOTATION_GEOMETRY_CONTRACT_R13_2.md` and
`V7_HEADLESS_ANNOTATION_RUNTIME_R13_3.md` and
`V7_ACCEPTED_ANNOTATION_CHART_PROJECTION_R13_4.md` and
`V7_SEGMENT_INTERACTION_PREVIEW_R13_5.md` and
`V7_COMMUNITY_REUSE_GATE_FOR_R13_6.md` and
`V7_RECTANGLE_SELECTION_MINIMAL_INSPECTOR_R13_6.md` and
`V7_DURABLE_ANNOTATION_HISTORY_R13_7.md` and
`V7_PANE_TIME_REPLAY_ANNOTATION_PROJECTION_R13_8.md` and
`V7_SEMANTIC_PACKAGE_LIQUIDITY_LEVEL_R13_9.md` and
`V7_STAGE_ARCHITECTURE_REVIEW_R13_9A.md` and
`V7_SEMANTIC_CONTRACT_HARDENING_R13_9B.md` and
`V7_PURE_ANNOTATION_EVIDENCE_RESOLVER_R13_10A.md` and
`V7_EXACT_BAR_PICKER_R13_10B.md` and
`V7_DETERMINISTIC_FVG_CONSTRUCTION_PROJECTION_R13_10C.md` and
`V7_BUILT_IN_PLUGIN_CONTRACT_SUBSTRATE_P0A.md`, with frozen candidate evidence in
`v7-community-reuse-audit.json`.

R11 is the closed architecture-recovery record underlying the accepted
milestone; normal-delivery scope is restored. Its immutable pre-remediation checkpoint is
`6a101270`; the
binding plan is `V7_ARCHITECTURE_INTEGRITY_RECOVERY_R11.md`. R11.1 repairs the
global decision/rollback boundary, transaction-scoped leases and cancellation,
DuckDB dataset revision, atomic/poisoned state hydration, Linux host rollback,
the reviewed static public surface, removable Database Bootstrap UI, and
cross-runtime topology/writer evidence. Repository recovery may close from
automated evidence while the separately marked real-host, cross-device, and
visual checks remain executable as non-blocking follow-up after V7.0.0
foundation acceptance.

R12.1 added the bounded re-upload recovery after clean-host acceptance exposed
that a retained upload could be recovered but not discarded without host/API
commands. Database Bootstrap now owns an inline `Upload another file`
confirmation, while the importer alone owns authenticated staged-source and
candidate cleanup. Stable unactivated tasks may be discarded; validation in
progress and every post-activation state remain blocked. The authoritative
DuckDB and durable activation lock are never discard targets. Automated
service/client/real-browser evidence is implemented, H092 is accepted, and the
new confirmation has an exact visual fixture; the current lightweight host
still needs the committed release deployed and its retained large-file workflow
reviewed.

R12.2 removed the remaining
production dependency on V4: browser market-data URLs and provider identity,
Python read service, environment variables, systemd unit, Caddy route, release
archive, deployed-runtime manifest, and regression startup all become V7-owned.
The external DuckDB schema/path remains compatible data rather than executable
legacy code. Existing hosts migrate the old unit inside the rollback-protected
host transaction; clean releases contain only `v7/`. The historical
Databento/Contract Roll writer is not moved into the read service and remains
visibly disabled until a separate V7-native writer exists.

R12.3 established the adaptive deployment after the 512 MB acceptance host
proved that a successful 901.3 MB upload could still OOM-kill DuckDB during
Validate when the host had no swap. Deployment now treats 450 MiB reported
`MemTotal` as the provider 512 MB-class floor, auto-selects DuckDB memory and
threads, provisions a persistent profile-specific swap floor, and gives Market
Data and Database Import separate spill directories. H094 is automated; the
43.110.32.34 upgrade, 512 MB large-file retry/reboot, database fingerprints,
and same-client Play-bar latency comparison remain human gates.

R12.5 measured
about 176 ms RTT to 43.110.32.34 and exposed the production provider's
one-millisecond dataset-revision TTL as a market-data health request on almost
every warm Replay transaction. R12.5 binds the read-only DuckDB revision to one
active service/runtime lifetime, retains HTTP 409 invalidation and restart for
replacement, and compensates completed transaction time inside the selected
single-flight Autoplay cadence. Binding contract:
`V7_CLOUD_REPLAY_HOT_PATH_R12_5.md`.

R12.6 is the prior public-IP deployment foundation. A repeat deployment on
146.190.100.212 found an old direct Replay Lab Caddy site plus the current
managed fragment, so Caddy rejected the duplicate public-IP owner. The public-
IP wrapper now infers first/repeat and database/bootstrap state, preserves
shared Caddy and migrates known listeners by default, and reconciles only
positively identified Replay Lab Caddy layouts. Foreign ownership still fails
closed. Binding contract:
`V7_HOST_ADAPTIVE_IDEMPOTENT_DEPLOYMENT_R12_6.md`.

R12.7 supersedes R12.6 only at the operator-entry layer. The normal command is
now `deploy/linux/deploy.sh`: `--local` selects loopback-only operation,
`--public` detects a routable IPv4, `--public-ip` is the manual override,
`--public-domain` uses automatic public HTTPS, and `--private-domain` uses
Caddy's internal CA for LAN/VPN DNS. A successful first run installs the
non-secret `/etc/replay-lab/deployment.conf` inside the host transaction;
subsequent upgrades normally omit the exposure option. The old public-IP
script forwards all arguments. R12.7/H098 automated evidence is implemented;
fresh/repeat local, IP, and domain host checks remain open as non-blocking
operational evidence. Binding contract:
`V7_UNIFIED_DEPLOYMENT_ENTRY_R12_7.md`.

R12.8 corrects the remaining second-acceptance mismatch without reopening
write authority. Existing-database deployments expose exact importer health so
Database Setup can show `Database active`; optional Maintenance failure falls
back to read-only Market Data coverage and shows `Read-only data ready` while
hiding Contract Roll/write controls. Replay Workspace translates internal
failure codes before presentation. Automated browser/deployment/architecture
evidence is implemented; one existing-database cloud redeploy and hard refresh
remains the focused human gate. Binding correction:
`V7_ACCEPTANCE_CAPABILITY_STATUS_R12_8.md`.

R12.4 remains a prior deployment correction. The first adaptive run
created and activated nominal swap but rejected Linux's slightly smaller
post-`mkswap` reported capacity. An explicit 8 MiB accounting tolerance and
matching allocation overhead now accept that existing file on rerun while a
larger shortfall remains blocked. Do not manually remove or recreate managed
swap before pulling and rerunning.

R10.1 adds a parallel Linux acceptance-host installer at
`v7/deploy/linux/install.sh`. It is implemented with automated dry-run/config
evidence but has not yet passed its real lightweight-cloud-host gate. Its
read-only public boundary must not be interpreted as Data Acquisition approval.
The 2026-08-04 full Harness sweep also left two reproducible pre-existing visual
findings open: a small Pane Workspace fixture delta and a Replay Workspace
render with candle wicks but missing filled bodies. R11.1 refreshed only the
architecture/source evidence baselines; no visual baseline was updated. Both
visual findings remain part of overall acceptance rather than R10.1 production
changes. The R11.1 sweep also retains the Session date-picker pixel drift. The
integrated R12.2 run executes all 95 top-level Harnesses: 92 pass, and only
those same three visual gates fail, with zero unexpected functional or
architecture failure.

The first Alibaba Linux apply stopped before host mutation on a NodeSource/
distribution npm conflict and exposed an unmanaged V4 listener on 8766. R10.2
corrects both boundaries and adds authenticated direct public-IPv4 HTTPS. Pull
the R10.2 commit, deliberately stop the identified legacy process, and rerun
the host gate; do not open 8007 or 8766 publicly.
R10.3 reduces that rerun to `deploy/linux/deploy-public-ip.sh`, retaining an
explicit exact-match legacy replacement flag and the same R10.2 boundaries.
The next host diagnostic proved the quick deploy had not completed: neither
Replay Lab systemd unit existed and neither loopback port was listening. It
also proved the host's active Caddyfile serves `recap.buddhiststudy.xyz`, so
R10.4 adds `--preserve-caddy` to import a managed Replay Lab fragment without
replacing that unrelated site. Pull R10.4 and rerun the wrapper with that flag.
The first R10.4 wrapper invocation then exited silently before the installer:
the empty legacy-listener branch inherited the failed test status under
`set -e`. R10.5 returns success explicitly when no listener exists and binds
that exact no-listener continuation as executable regression evidence.
The R10.5 rerun then reached dependency/release installation but the `replay`
identity could not execute the root-created shared venv Python. R10.6 now
normalizes both venv and release trees to root ownership plus service-group
read/traverse/execute access, including repair of the already-created venv.
The R10.6 host then reached healthy V4/V7 services and successfully obtained a
Let's Encrypt certificate for `43.110.32.34`, but external IP-literal clients
still received a TLS internal alert because they omitted SNI. R10.7 configures
that managed IP certificate as Caddy's `default_sni`, merging it into the
existing global block while retaining the unrelated domain and account email.
Authenticated cloud review then exposed a product UI finding: the bottom
Replay-step native select popup reverted from dark to white when the pointer
left it. The correction gives the select/options an explicit opaque dark base
and dark color scheme; real-Chrome style and pointer-exit assertions pass, and
the original Windows/browser path awaits human recheck.
The next cloud screenshot showed a white Canvas with blurred, low-contrast Pane
symbol/OHLC/change/Volume text. The Pane overlay had retained its dark-Canvas
palette and two black text shadows. It now derives a light/dark presentation
tone from the normalized Canvas background, preserves the original dark theme,
and uses crisp dark unshadowed readouts on light Canvas. Real-Chrome live
preview and Cancel restoration pass; the cloud path awaits human recheck.
The reviewer then requested an adjustable font size for the same Pane readout.
Workstation Settings version 7 adds global `paneReadout.fontSize` with 10–18px
choices and a 12px default. The DOM-only overlay scales every readout component
and its header height; live preview, Cancel, save, hard reload, all-Pane fan-out,
and v1–v6 migration pass. The cloud path awaits human review.
The completed checklist then identified six bounded interaction findings.
Session cards no longer show a misleading creation timestamp; instrument
selection collapses its picker; eligible Saturdays map Start to Sunday 18:00
and customer-visible End to Friday 16:59, backed by a Friday 17:00 exclusive
cutoff. Manual Next remains clickable and queues rapid intents
through the existing single-flight Workspace executor, Escape exits truncation
selection, and Exact GoTo now names the minute to reveal while translating to
the unchanged exclusive no-future cutoff. Automated browser evidence passes;
all six items await human confirmation on the deployed acceptance host.

R10.8 addresses the next cloud finding: browser-local storage could not restore
a Session on a different computer. V7 remains local-first, but the optional
`adapter.server-state-sync` now replicates only allowlisted durable Session,
Workspace checkpoint, Replay preference, Workstation Settings, and color-
history keys to a user-scoped SQLite snapshot through revision CAS. The current
Caddy Basic Auth username is the state identity. Divergence never silently
overwrites either side: the UI exposes Offline retry and explicit Use server /
Keep this device choices with local backups. The installer now owns a third
loopback service on 8767, exposes only authenticated `/v7/state/*` mutations,
keeps market DuckDB read-only, and preserves state data across code rollback.
Automated service, client, two-profile browser, optional-removal, and deployment
evidence is implemented; physical two-computer and state backup/restore review
remain non-blocking follow-up.

R10.9 addresses clean-host market-data onboarding. `--bootstrap` now permits a
single missing DuckDB target and exposes a visual Database Setup panel inside
the trusted Data Acquisition route. CSV is converted on the server under an
exact seven-column contract; uploaded DuckDB is copied to a candidate and
opened read-only. Both paths reject invalid schema, nulls, unsupported symbols,
duplicates, non-minute timestamps, and invalid OHLC/volume without automatic
normalization. Exact confirmation creates the target only if it is still
absent, then writes a durable lock that survives target removal. Retained-task
discovery restores uploaded/ready state after browser or service restart. A
fourth loopback systemd service owns port 8768 and the only writable database-
parent mount; API, Web, and State mount that complete parent read-only.
Authenticated Caddy exposes only
`/v7/database/*` during bootstrap. Automated service, real-browser, deployment,
and existing-database regression evidence passes; representative large-file
clean-host CSV/DuckDB review remains non-blocking follow-up.

The first real DuckDB host run then proved the recovery gap: the large upload
survived a failed Validate/redeploy as designed, but selecting it again hit the
single-candidate lock and required shell diagnostics. R12.1 closes that UX gap
without turning Bootstrap into a database editor. A recovered uploaded/ready/
failed task locks direct file selection and exposes Cancel or confirmed
discard; confirmation clears only staging, focuses the picker, and permits the
next upload. `DATABASE_IMPORT_BUSY` now recovers the retained task visibly.

This is the first document to read after a machine, server, or agent restart.
It records the exact continuation point; historical session notes are not
required for normal startup.

R10.10 corrected the clean-host interpreter finding. Debian/Ubuntu may
provide Python 3.12 and let `python3.12 -m venv --help` succeed while omitting
`ensurepip`, causing actual environment creation to stop and leave the then-
shared virtualenv partial. Python discovery requires `import ensurepip`, so
package planning installs the matching venv dependency. R11 supersedes the
shared environment with a release-owned `.venv`; failed releases are
quarantined and an incomplete host rollback retains root-only recovery
evidence. The affected host still needs the deployment rerun and human health/
rollback validation.

## Pre-Reboot Durable Snapshot

All NQ/ES full-chain repair work is complete, committed, and independently
verified. No Maintenance job, database transaction, Preview, or Commit remains
in progress. The current ad hoc V4/V7 server processes are disposable runtime
state and are expected not to survive the reboot.

- final NQ repair commit: `9e94af07`;
- final ES repair commit and pre-reboot code baseline: `b91a1057`;
- authoritative database:
  `/home/leo/myworkspace/trading/backtesting/v4/data/trading_data.duckdb`;
- final database rows: 12,662,287 total, 6,494,880 ES, and 6,167,407 NQ;
- duplicate `(instrument, ts)` rows: zero for ES and zero for NQ;
- final Roll Calendar revision:
  `86d01ee693741bd0200c435de843a3bea3671ace1f4a8dfc02f203aaf96469fd`;
- both instruments have 65 governed transitions from 2010 Q2 through 2026
  Q2, using Databento `v.0 d0` normalized to the preceding natural date at
  `18:00 America/New_York`;
- pre-Databento history is intentionally retained unchanged.

The binding repair records are `V7_NQ_DATABENTO_FULL_CHAIN_REPAIR.md` and
`V7_ES_DATABENTO_FULL_CHAIN_REPAIR.md`. Their executable manifests are
`v4/data_config/historical_roll_repairs/nq-databento-full-chain.yml` and
`v4/data_config/historical_roll_repairs/es-databento-full-chain.yml`; their
machine-readable audit evidence is
`v7/docs/v7-nq-databento-full-chain-audit.json` and
`v7/docs/v7-es-databento-full-chain-audit.json`.

Verified recovery artifacts outside Git are retained under
`/home/leo/.local/share/replay-lab/historical-roll-repair/`. The exact NQ and
ES database backups, calendar backups, retained Preview manifests, and shared
append-only audit paths are recorded in the two binding repair documents. All
seven referenced external recovery artifacts existed immediately before this
handoff was committed.

## Repository State

- repository: `/home/leo/myworkspace/trading/backtesting-v7`
- default release branch: `main`
- accepted release tag: `v7.0.0`
- historical delivery branch: `v7/rebuild`
- immutable R11 pre-remediation checkpoint: `6a101270`
- recovery state: R11.1 automated architecture recovery is complete and
  inactive; the V7.0.0 foundation milestone is accepted. Historical human-host
  checks retained by R12.1/R12.2, H087/H088/H091, R9.4, R10.8, and R10.9 are
  non-blocking operational evidence, not open V7.0.0 product gates;
- the separate R7.3/R7.3c Data Acquisition admin review remains deferred and
  non-blocking;
- R8.1 recovery constitution is commit `7dbabbed`;
- R8.2 production architecture analyzer is commit `f19b7f32`;
- R8.3 descriptor/lifecycle/independent-harness repair is commit `60b92d93`;
- R8.4 Raw Coverage Lease contract is commit `f3d0feed`;
- R8.5 sole Bar Data retention owner is commit `23d2b17a`;
- R8.6 sole semantic Workspace State owner is commit `a4576e13`;
- R8.7 prepared commit participant contract is commit `518eab82`;
- R8.8 reversible Chart application is commit `83a82364`;
- R8.9 global atomic Workspace transaction is commit `18ebe58d`;
- R8.10 UI/composition split is commit `d341b034`;
- R8.11 production ModuleHost boot is commit `ce42eb9f`;
- R8.12 source/documentation closure is commit `f62db2b9`;
- R8.13 Calendar capability and RTH Locate re-derivation is commit `37db33bb`;
- R8.14 full production regression matrix is commit `9433c823`;
- R8.15 human acceptance and zero-debt closure is commit `be15a15d`;
- R8.16 audit evidence consistency correction is commit `364c6b27`;
- R9.1 Replay four-hour cap and latency tuning is commit `a3b12a50`;
- R9.2 shared multi-Pane replay work is commit `041d53f8`;
- R9.3 viewport-segmented multi-Pane replay is commit `31c91b0d`;
- R9.4 aggregated bucket time labels are commit `d256369d`;
- the read-only NQ 2025 roll audit is commit `51c01700`;
- the guarded NQ 2025 historical roll repair is commit `c738f670`;
- the read-only NQ pre-2025 continuous roll prescreen is commit `6798fc09`;
- the NQ 2023 Q3–2024 raw roll audit is commit `1cd86e60`;
- the generic NQ 2023 Q3–2024 manifest repair is commit `3e0e08f1`;
- the read-only NQ legacy-red Databento mapping audit is commit `599c4cbd`;
- the NQ Databento full-chain mapping diff, raw attribution, and guarded repair
  are complete in commit `9e94af07`;
- the matching ES Databento full-chain mapping, raw attribution, and guarded
  repair are complete in commit `b91a1057`;
- the NQ 2025 roll audit rejects the legacy boundaries as historical authority,
  retains raw Databento contracts plus the R7.3c session-aligned volume policy,
  and the separate guarded repair has replaced 2,262 rows with 2,400 source
  rows, restored 138 minute timestamps, and verified zero NQ duplicates;
- the original NQ continuous CSV retained volume exactly outside those repair
  intervals; the 68-window 2008–2024 prescreen reports 8 red, 33 amber, and 27
  green windows and grants no historical write authority;
- raw old/new evidence for 2023 Q3/Q4 and 2024 Q1–Q4 retained two boundaries;
  the generic Maintenance API workflow replaced 14,321 current rows with
  14,517 fingerprint-matched source rows, restored 196 timestamps, finished at
  6,158,777 NQ rows with zero duplicates, and retained full recovery evidence;
- all eight red legacy windows now have free `NQ.v.0` date mappings plus raw
  bilateral evidence; session-aligning each `d0` to the prior natural date at
  `18:00 ET` moves seven boundaries earlier and 2020 Q1 later, with candidate
  slices totaling 10,568 current rows versus 14,468 replacements and no write;
- early historical sparsity is explicitly treated as normal context rather
  than tested against a modern fixed minute-count threshold;
- the free full-chain result contains 66 contiguous mappings and 65
  transitions; all 45 diagnostic legacy seams now have exact bilateral raw
  attribution, yielding nine already aligned events and 56 repair intervals;
- Databento `NQ.v.0` `d0`, normalized to the prior `18:00 ET` session open,
  now governs NQ from 2010 Q2 through 2026 Q2 while pre-June-2010 NQ remains
  explicitly legacy-source history;
- the fixed manifest replaced 110,932 rows with 119,562, restored 8,630 net
  minutes, finished at 6,167,407 NQ rows with zero duplicates, and published
  all 65 target boundaries below the USD 4 ceiling;
- ES now follows the same `v.0 d0` prior-`18:00 ET` authority for 65 transitions;
  10 were already aligned and 55 repaired intervals replaced 99,875 rows with
  102,512, restoring 2,637 net minutes below the USD 4 ceiling;
- the closed 2026-03-14 condition contains no staged ES rows and did not grant
  `missing` permission; only repaired 2019 Q1 and 2026 Q1 explicitly accept
  `degraded`;
- final market data contains 6,494,880 ES rows and 6,167,407 NQ rows with zero
  duplicates; independent backup comparison proves complete NQ and 846,060-row
  pre-Databento ES history remain unchanged;
- R8.3 closes all seven descriptor, lifecycle, and independent-harness findings;
  the refreshed exact baseline scans 42 production modules, 100 actual
  dependency edges, 101 construction sites, two production roots, and 10
  critical writer sites, with six blocking findings assigned to later steps;
- R8.3 boots all 42 production public entries through the descriptor graph,
  proves reverse disposal for all 10 lifecycle modules, and proves the complete
  one-case optional-removal matrix without booting the application shell;
- R8.5 activates that lease through Bar Data Runtime, removes both UI market-
  data ledgers and cached source reads, and accepts H074 after bounded LRU/
  coverage reuse, delayed cancellation, inactive-Pane release, and disposal;
- R8.6 activates one branded, revisioned owner for accepted Pane Workspace,
  Session Hours, semantic Viewport, and checkpoint state; the UI Pane ledger,
  Session Hours revision, and checkpoint reconstruction path are removed;
- H007 is recovered and H075 is accepted through complete current-identity,
  cross-scope, stale, restore, and disposal controls;
- R8.7 adds the participant-neutral Prepared Commit contract for exactly Chart,
  Replay, Workspace State, and publication, with no-mutation prepare,
  reversible apply, exact rollback, and irreversible finalize receipts;
- H076 is accepted after all four real participants and the global decision
  owner complete prepared apply/rollback/finalize activation in R8.9;
- R8.8 makes Chart a real prepared participant, preserves prior series/scales/
  OHLC/Pane surface through reversible painted apply, and releases old Panes
  only on exact finalize;
- H056 is recovered through real-canvas rollback plus Replay, Workspace State,
  and publication failure restoration;
- R8.9 makes Workspace Transaction Runtime the sole global commit coordinator,
  activates prepared Replay and Workspace State, moves publication/persistence
  inside the reversible boundary, and removes UI post-terminal commits plus the
  Chart `present()` migration bridge;
- H009, H010, H049, and H050 are recovered; H076 is accepted;
- R8.10 moves every Replay Workspace owner factory and orchestration helper out
  of the UI adapter into `core.replay-workspace-composition`, adds one focused
  command port plus an explicit UI presentation adapter, and deletes the mixed
  UI controller without changing successful behavior;
- H024 is recovered through the production boundary Harness and six negative
  controls;
- R8.11 boots both real routes through exact descriptor-closure ModuleHost
  graphs, proves two isolated Session application instances, reverse cleanup,
  post-application partial-start rollback, both real application roots, and
  the two-consumer Replay Workspace optional-removal matrix;
- H018 was recovered with two production-path negative controls; the remaining
  recovery regressions were assigned to and closed through R8.12–R8.14;
- the exact production baseline now scans 51 modules, 127 dependency edges,
  115 construction sites, 16 declared writer surfaces, and 19 observed
  writer sites with zero blocking production architecture findings;
- R8.12 binds all production source to exact size, responsibility, public-
  contract, invariant, debt, and source-drift evidence with no exceptions;
- R8.13 reintroduces fixed/calendar timeframes as registered contributions and
  proves repeated ETH plus bidirectional RTH Locate through Bar Data-owned
  leases without moving Replay or collapsing either Pane wall;
- H019, H066, and H078 became executable in R8.13; the remaining three
  regressions were assigned to and closed in R8.14;
- R8.14 binds 11 axes to eight real production scenarios, dynamically fails
  persistence after every Pane paints a newer candidate, and proves exact
  visible, semantic, Replay, and durable rollback; H021/H025/H079 are
  executable and H069 is accepted, leaving no regressed rules;
- R8.15 records the user's explicit `验收通过` for the hard-reloaded Calendar
  and dense two-Pane ETH/RTH sequence, accepts H019/H021/H025/H066/H071/H072/
  H077/H078/H079, closes the recovery inventory with zero regressed rules, and
  deactivates recovery mode without production behavior changes;
- R8.16 closes `BUG-V7-0006` by reconciling six current prose source summaries
  with the canonical baseline and adding fail-closed H023 summary validation;
  recovery remains inactive and production behavior is unchanged;
- R9.1 limits Replay choices to `4h`, maps higher synchronized Pane timeframes
  to that maximum, cuts the measured `4h` provider cadence from 51/100 to
  3/128, and records 125 warm-cache samples at p95 `210.8ms`; H080 is
  executable and the historical hard-reload rapid-click check remains useful
  non-blocking evidence;
- R9.4 preserves completion-slot candle coordinates while formatting fixed
  aggregate labels from bucket start, formats daily/weekly/monthly labels from
  explicit trading-period dates without time, and passes native formatter,
  real projected-history, Calendar, Replay Workspace, and multi-Pane latency
  regression gates; focused hover review remains pending;
- implemented code baseline: human-accepted R4.5 and R5.1–R5.6; completed
  headless R6.1–R6.4; human-rejected R6.5 real Pane workspace and R6.6 combined
  bar-step interaction gate; R6.7 continuous Autoplay implemented; R6.7a
  multi-Pane RTH history preservation implemented; and R6.7b manual Viewport
  span, contributing history-window, and stable-toolbar corrections accepted as
  one combined R6.7 gate; combined R6.8/R6.8a–b fixed Replay transport,
  truncation, Sync timeframe, and text-only selectors human accepted;
  combined R6.9/R6.9a–b Pane layouts, overlays, and interactions human
  accepted; R6.9c lower-right control dock implemented and awaiting focused
  visual review; R6.9d shared GoTo contract completed headlessly; R6.9e eight-
  action Quick GoTo, global settings, and range feedback human accepted;
  R6.9e1 future time-axis continuity and R6.9h Exact GoTo human accepted; R6.9f
  global Workstation Settings catalog and ownership contract plus R6.9g
  field-level product refinement completed headlessly; R6.9i global Settings
  owner/persistence/shell with one Grid consumer, R6.9j Symbol presentation,
  R6.9j1 maintainable color picker, and R6.9k Status/current-price controls
  human accepted; R6.9l Canvas/Crosshair/scale/Pane-control/default-margin
  settings plus owner-managed live-preview/Cancel-restore correction human
  accepted; R6.9m New York/UTC/local, date, weekday, and 12/24-hour
  presentation human accepted; R6.10a versioned Session Layout Sync policy,
  R6.10b Symbol/Interval sync, R6.10c1 stable Pane priority, and R6.10c2
  real-time Time-sync rollback human accepted; R6.10c3 explicit right-click
  Pane time location accepted after the owner-routed automatic left-history
  correction; Date-range synchronization deliberately deferred beyond the
  foundation; R7.1 versioned Session Workspace checkpoint plus atomic soft
  re-entry/hard-refresh restore human accepted after automated and manual
  re-entry gates; R7.2 restored mixed-Pane cache-hit performance, buffered
  source traversal, incremental Projection, and complete foundation race/axis
  gates automatically accepted with no visual or interaction change; R7.3,
  R7.3a–c remain at their recorded human gates; R7.3j re-derived the history
  anchor/single-commit correction after the explicit reset to `5077c13e`, and
  R7.3k replaces its insufficient high-timeframe raw window with projected
  screenshot-scale history; R7.3l corrects empty premarket RTH entry/restore
  while preserving forward cache identity; both are human accepted. R7.3m
  preplans dense TF/ETH-RTH replacements without native input and is also human
  accepted after the filled dense-workspace review; R7.3n activates
  Projection-owned session-aware `1D`/`1W`/`1M`, and R7.3o preserves a dense
  non-target RTH Pane when an explicit location in another Pane materializes a
  narrower contained navigation window; both were human accepted only through
  the combined R8.15 hard-reloaded workflow on 2026-07-31;
  R2.4
  Session Browser
  readability and confirmed durable delete human accepted
- expected worktree after this handoff commit: clean
- browser URL when the static service is running:
  `http://127.0.0.1:8007/v7/app/`

Do not continue V7 work in `/home/leo/myworkspace/trading/backtesting`; that is
the legacy/reference repository. V7 production work belongs to the worktree
listed above.

## Minimal Restart Reading Order

1. repository `AGENTS.md`;
2. this file;
3. `docs/V7_STANDALONE_RUNTIME_SEPARATION_R12_2.md`;
4. `docs/V7_ARCHITECTURE_INTEGRITY_RECOVERY_R11.md`;
5. `docs/V7_PRODUCTION_ARCHITECTURE_ANALYZER_R8_2.md`;
6. `docs/v7-production-architecture-baseline.json`;
7. `docs/V7_DESCRIPTOR_LIFECYCLE_INDEPENDENT_HARNESS_REPAIR_R8_3.md`;
8. `docs/V7_RAW_COVERAGE_LEASE_CONTRACT_R8_4.md`;
9. `docs/V7_SOLE_BAR_DATA_RETENTION_OWNER_R8_5.md`;
10. `docs/V7_SOLE_WORKSPACE_STATE_OWNER_R8_6.md`;
11. `docs/V7_PREPARED_COMMIT_CONTRACT_R8_7.md`;
12. `docs/V7_REVERSIBLE_CHART_APPLICATION_R8_8.md`;
13. `docs/V7_GLOBAL_ATOMIC_WORKSPACE_TRANSACTION_R8_9.md`;
14. `docs/V7_UI_COMPOSITION_SPLIT_R8_10.md`;
15. `docs/V7_PRODUCTION_MODULE_HOST_BOOT_R8_11.md`;
16. `docs/V7_SOURCE_AND_DOCUMENTATION_CLOSURE_R8_12.md`;
17. `docs/V7_CALENDAR_CAPABILITY_RTH_LOCATE_REDERIVATION_R8_13.md`;
18. `docs/V7_FULL_PRODUCTION_REGRESSION_MATRIX_R8_14.md`;
19. `docs/V7_HUMAN_ACCEPTANCE_ZERO_DEBT_CLOSURE_R8_15.md`;
20. `docs/V7_SERVER_STATE_SYNC_R10_8.md`;
21. `docs/INDEX.md`;
22. `TODO.md`;
23. `docs/V7_ARCHITECTURE.md`;
24. `docs/V7_HARNESS_STANDARD.md`;
25. `docs/V7_EXECUTION_ROADMAP.md`;
26. only the documents directly relevant to the explicitly selected next step.

Do not resume from the historical status narrative alone. The R11.1 closure
record and machine-readable inactive recovery state override earlier statements
that recovery or its feature-delivery freeze remains active.

Do not load all historical `sessions/` records. For R6 planning, read only the
R6-relevant architecture/roadmap documents plus:

- `sessions/session_20260720_r4_5_lightweight_chart_slice.md`.
- `sessions/session_20260720_r5_1_v6_interaction_carry_forward.md`.
- `sessions/session_20260720_r5_2_session_hours_domain.md`.
- `sessions/session_20260720_r5_3_fixed_timeframe_domain.md`.
- `sessions/session_20260720_r5_4_workspace_replacement_runtime.md`.
- `sessions/session_20260720_r5_5_compact_workspace_controls.md`.
- `sessions/session_20260720_r5_6_real_v4_bars_provider.md`.
- `sessions/session_20260720_r5_6a_exchange_time_presentation.md` through
  `sessions/session_20260720_r5_6f_corrective_gate.md`.
- `sessions/session_20260720_r5_6g_second_review_rejection.md` and
  `sessions/session_20260720_r5_6h_second_review_corrections.md`.
- `sessions/session_20260721_r5_6i_third_review_rejection.md` and
  `sessions/session_20260721_r5_6j_third_review_corrections.md`.
- `sessions/session_20260721_r5_6k_fourth_review_rejection.md` and
  `sessions/session_20260721_r5_6l_history_responsiveness.md`.
- `sessions/session_20260721_r5_6m_fifth_review_acceptance.md`.
- `sessions/session_20260721_r6_1_pane_workspace_domain.md`.
- `sessions/session_20260721_r6_2_replay_pane_response_contract.md`.
- `sessions/session_20260721_r6_3_pane_set_materialization.md`.
- `sessions/session_20260721_r6_4_replay_navigation_runtime.md`.
- `sessions/session_20260721_r6_5_real_pane_workspace.md`.
- `sessions/session_20260721_r6_6_replay_bar_step.md`.
- `sessions/session_20260721_r6_7_continuous_autoplay.md`.
- `sessions/session_20260721_r6_7a_multi_pane_rth_history.md`.
- `sessions/session_20260721_r6_7b_manual_viewport_span.md`.
- `sessions/session_20260721_r6_7c_contributing_history_windows.md`.
- `sessions/session_20260721_r6_7d_stable_toolbar_refresh.md`.
- `sessions/session_20260721_r6_8_fixed_replay_transport.md`.
- `sessions/session_20260721_r6_9_resizable_pane_layouts.md`.
- `sessions/session_20260721_r6_9a_pane_ohlc_crosshair_sync.md`.
- `sessions/session_20260721_r6_9b_canvas_overlay_maximize.md`.
- `sessions/session_20260721_r6_9_combined_acceptance.md`.
- `sessions/session_20260721_r6_9c_pane_control_dock.md`.
- `sessions/session_20260722_r6_9d_goto_redesign_contract.md`.
- `sessions/session_20260722_r6_9e_quick_goto_settings.md`.
- `sessions/session_20260722_r6_9e1_future_time_axis.md`.
- `sessions/session_20260722_r6_9k_status_current_price.md`.
- `sessions/session_20260722_r6_9l_canvas_settings.md`.
- `sessions/session_20260722_r6_9m_time_presentation.md`.
- `sessions/session_20260722_r6_10a_layout_sync_contract.md`.
- `sessions/session_20260721_r2_4_session_browser_readability_delete.md`.
- this handoff plus `docs/V7_V6_INTERACTION_CARRY_FORWARD.md`.
- the V6 ETH/RTH Phase A1/A2/A3 documents targeted by R5.2.
- the revised human checklist at
  `docs/V7_R5_6_CORRECTIVE_REVIEW.md`.

## Completed Boundary

R3.3 Replay and R4.1–R4.4 headless foundations are complete; R4.5 is implemented
and human-accepted:

- Replay advancement is duration-based, not one sampled display candle;
- Manual and Auto inputs share one proposal path;
- one Replay clock exists per branded Session activation;
- proposing advancement has zero accepted-state effects;
- only `commitVisible` publishes cursor/revision progress;
- cross-Session, cross-activation, foreign, rejected, and stale proposals have
  zero cursor side effects;
- the cursor is an exclusive no-future cutoff;
- pure low/high-watermark advice emits bounded forward windows without I/O;
- Bar Data Runtime remains the sole raw requester/cache owner;
- one headless coordinator is scoped to each branded Session activation;
- slow/stale success, stale failure, dependency failure, and disposal preserve
  the last accepted workspace snapshot and Replay cursor;
- exact visible acknowledgement and a final currency check precede acceptance;
- pure pane projection consumes common-identity Raw Bar Batches without I/O;
- exclusive Replay no-future filtering precedes Session Hours eligibility and
  aggregation;
- identity `1m` projection preserves every eligible intermediate source bar;
- projection output carries exact source/capability/calendar/policy/cursor
  provenance and contains no concrete capability-id branch;
- one headless Chart Snapshot Application is the sole chart-series writer;
- frozen projection provenance, exact adapter receipt, and exact visible
  completion bind the same complete transaction and snapshot;
- stage/apply races, failure, duplicate, forged receipt, and disposal cannot
  publish chart completion;
- the fake adapter checks currency at its final visible mutation boundary;
- pure pane-local viewport intent distinguishes default and manual walls;
- Replay cursor/logical-index movement preserves manual origin, offset, span,
  scope, and revision while shifting earlier bars left;
- adapter logical ranges are transient projections, not stored product truth;
- official Lightweight Charts 5.2.0 is isolated behind one real adapter;
- NQ/`1m`/ETH chart entry reveals a 120-minute historical prefix plus the
  selected Session start bar through one transaction; Manual Next reveals one
  additional eligible source bar;
- full replacements use two rendering opportunities plus screenshot-proven
  candle pixels; safe tail updates require exact series-change evidence plus
  two rendering opportunities;
- native drag creates manual wall intent, Next preserves it, and Reset View
  explicitly restores default intent;
- the NQ route uses an immersive chart-first shell with compact controls and no
  centered cache-hit update overlay;
- the UI discloses its real local V4/DuckDB market-data feed;
- H005/H006/H008/H009/H010/H013/H014/H015/H016/H017/H042 are human-accepted through
  the R4.5 browser review; H011/H039/H040/H041 have automated evidence.
- R5.1 binds settled V6 Reset View, Replay, Settings, multi-pane, ETH/RTH, and
  multi-instrument interaction decisions as prior product evidence.
- R5.2 verifies the source wall-clock encoding and activates a pure,
  revisioned ETH/RTH calendar/eligibility/traversal domain without runtime or UI
  mutation.
- R5.3 activates generic canonical fixed-duration OHLCV aggregation policies,
  including inherited whole-hour and configured four-hour-offset grids.
- R5.4 routes registered timeframe/ETH-RTH replacements through the existing
  atomic transaction, with cursor retention, source-level visible-through, and
  acquisition/presentation stale isolation.
- R5.5 mounts one grouped fixed minute/hour TF dropdown and compact ETH/RTH
  controls over that path, preserves cursor/manual wall, and keeps accepted
  chart pixels visible during bounded refresh/error states. Its review
  corrections restore the V6 prefix-plus-start/no-future entry baseline and add
  repeatable bounded leftward history extension.
- R5.6 removes the production synthetic generator and connects the existing
  V4/DuckDB NQ source through an independent, policy-bound adapter with padding
  removal and no silent fallback.
- R5.6a–e present the chart in New York exchange time, separate bucket identity
  from completion-slot display, remove foreground provider/refull-series stalls,
  eliminate cache-hit status flashing, and open new Sessions directly.
- follow-up commits remove the redundant Canvas metadata row and route wheel
  input over the right price axis to pointer-anchored vertical zoom; plot wheel
  remains horizontal and Reset View restores price autoscale.
- R5.6g records the second human rejection: browser-local Session input,
  RTH-specific completion offsets, 20-second high-TF work, empty left context,
  and perceptible ETH→RTH latency.
- R5.6h makes Session input explicitly New York, gives ETH/RTH one completion
  grid, bounds target-sized history without recursive foreground continuation,
  caches exchange offsets, and clamps transient logical range when bounded
  high-TF history is shorter than the canonical Viewport span.
- R5.6i records the third human rejection: replacement could splice separated
  old/new source windows into a ten-day `1h` hole, while a heavily dragged
  low-TF wall could become an invalid aggregate logical range.
- R5.6j retains only contiguous source-window prefixes, rejects gaps in
  Projection, and repairs adapter-only inverted logical ranges without
  changing canonical Viewport intent.
- R5.6k records the fourth human rejection: rapid boundary dragging accumulated
  history into a multi-second synchronous full-projection/response path that
  stopped mouse response.
- R5.6l adds bounded incremental history Projection, validated Raw Bar trust
  paths, allocation-light calendar/aggregation loops, deterministic modern New
  York DST conversion, and yielding seven-day V4 transport chunks.
- R5.6m records explicit fifth-review acceptance and closes the complete R5.6
  corrective gate, unblocking R6.
- R6.1 defines one uniform one-to-many Pane intent value, binds Pane instruments
  to Session assets, validates one shared Replay cursor through pane-local
  Viewport intent, and isolates focus plus instrument-sync transitions.
- R6.2 binds Next, Previous, Autoplay, Restart/Back-to, five quick New York
  GoTo anchors, and exact forward/backward GoTo to every visible Pane through
  one pure atomic response plan. Session Hours remains Session-scoped, forward
  jumps require continuous range coverage, and Economic Calendar is deferred
  to an optional business module.
- R6.3 materializes every planned Pane behind the existing Workspace
  Transaction acquisition/Projection stages and applies one exact complete set
  through the existing sole Chart Snapshot Application writer. Mixed
  instruments/timeframes, explicit empty Panes, delayed supersession, and all
  dependency/application failures preserve the last accepted atomic state.
- R6.4 gives Replay one exact forward/backward target-proposal path and real
  playing/paused state, resolves Next/Previous and DST-aware New York quick
  anchors through an injected primary-source traversal port, and routes all
  non-no-op actions through one R6.3 transaction. Overlap has no backlog;
  failures pause and preserve the last accepted state.
- R6.5 mounted the real one/two-Pane workspace but human review rejected its
  implicit Next-minute behavior, interim transport, limited layouts, and
  missing layout sync.
- R6.6 adds one Session-level Replay bar-step grid independent from Pane TF,
  resolves real aligned non-empty Next/Previous completions through Bar Data,
  and exposes the selector plus `Next bar`. Human review retained that
  invariant but rejected the combined gate because Autoplay executed only one
  step and Pause had no scheduled continuation to stop.
- R6.7 adds a completion-driven UI cadence owner over the existing one-step
  action. Play advances immediately and continues only after each prior atomic
  all-Pane visible commit plus `500ms`; Pause clears future work, including
  during an in-flight settlement, and Session completion/failure stops
  playback through Replay Runtime.
- R6.7a fixes the review-discovered ETH→RTH multi-Pane history regression.
  Consecutive earlier closed-session windows now advance exact raw coverage
  while preserving an already-ready accepted Pane; current Replay provenance
  is rebound without cursor movement, and real identity/policy/contiguity
  failures remain hard errors.
- R6.7b fixes the follow-up rapid-drag Viewport collapse. A left-clamped manual
  adapter range now translates both endpoints and retains its exact canonical
  span, so no-contribution RTH history cannot create oversized candles; that
  wall survives two-to-one Pane replacement and the next drag extends history.
- R6.7c fixes the next review-discovered RTH `09:30` boundary behavior. A
  nominal history window that is wholly closed now expands, within the same
  bounded raw request, until it reaches up to 240 prior eligible minutes or the
  35-day cap. One accepted transaction crosses an overnight close or weekend;
  it neither synthesizes bars nor starts recursive foreground continuation.
- R6.7d fixes the visual-only toolbar flash during candle refresh. The same DOM
  subtree and functional transaction locks remain, while only transiently
  locked controls retain their ready-state opacity; intrinsic disabled states
  stay visibly disabled.
- The user accepted the combined R6.7/R6.7a–d gate and approved R6.8's fixed
  transport form. R6.8 moves Replay controls into a centered capsule inside a
  dedicated `38px` bottom rail, combines Play/Pause, and adds bounded dynamic
  `0.5×/1×/2×/5×` completion cadence without entering Replay product state or
  overlapping the Pane grid.
- R6.8a adds a Session-bounded truncation/time-machine gesture through the
  existing exact all-Pane transaction, plus the named one-way `Sync timeframe`
  preference and TradingView-like transport icons; it remains part of the
  combined R6.8 human review gate.
- R6.8b removes native dropdown arrows from the speed and Replay-step
  selectors, orders the plain text values speed-to-step, and preserves native
  click and keyboard selection. Its final accepted cleanup removes the visible
  `Sync timeframe` caption while retaining the accessible name and tooltip.
- The combined R6.8 gate was human accepted on 2026-07-21. The user explicitly
  reaffirmed Session-wide ETH/RTH ownership: one switch atomically reprojects
  every Pane even when Pane instruments differ.
- R6.9 implements the exact reviewed 12-variant one-to-four Pane layout set
  through one pure split-tree domain and one independent chart host per product
  Pane. Every horizontal/vertical divider supports pointer and keyboard resize,
  measured minimum Pane sizes, and Session-owned ratio persistence. Same-count
  layout/resize changes do no data, Replay, or Workspace transaction work;
  count changes retain the atomic complete Pane-set path. This interaction and
  visual gate was human accepted on 2026-07-21.
- R6.9a corrects the review-visible active focus and header: every Pane now
  shows symbol/TF plus accepted selected-or-latest OHLC, non-active Panes retain
  native hover without taking focus, and the Crosshair layout switch projects
  display timestamps through adapter-owned official chart APIs. Programmatic
  targets cannot feed back as new pointer sources, mixed-TF misses retain each
  target's latest OHLC, and the entire effect performs no Replay, data,
  Session, series-write, or Workspace transaction work. The readability floor
  is now `280×120px`. R6.9a was human accepted with R6.9/R6.9b on 2026-07-21.
- R6.9b integrates the symbol, compact TF, OHLC, and prior-close change into
  the Canvas; removes the global Reset in favor of hover/focus Pane-local
  controls; and adds transient multi-Pane Maximize/Restore. Every chart stays
  mounted, exact split geometry returns on restore, and the display mode
  changes no Pane Layout, Replay, Workspace, Session, Bar Data, or series state.
  Neutral black Canvas surfaces, brighter text, and a stronger active border
  complete the visual correction. Market-open status remains deliberately
  omitted until a reliable product contract exists. R6.9b was human accepted
  with R6.9/R6.9a on 2026-07-21.
- R6.9c moves the unchanged Pane-local Maximize/Restore and Reset actions into
  a vertical lower-right Canvas dock. Explicit right and bottom insets keep the
  controls out of the price and time scales. Visibility follows actual hover or
  keyboard-visible focus rather than persistent active-Pane/pointer focus;
  actual pointer activation, mounted chart hosts, exact restore geometry, and
  zero Replay or Workspace revisions remain enforced. It awaits focused visual
  confirmation.
- R6.9d freezes Quick and Exact GoTo as two presentations over the same Replay
  cursor and expands Quick GoTo to eight strict-forward New York anchors.
- R6.9e exposes those eight actions, keeps only five keyboard shortcuts, and
  adds one seven-time Reset/Discard/Save settings dialog. A focused immutable
  contract and global Replay Navigation Preference Store persist one schedule
  for every Replay Session; legacy Session workspace schema 3 remains one-time
  migration input while current schema 5 stores Pane Layout plus the unrelated
  Layout Sync policy. Save replaces the schedule without
  Replay or Workspace revision, and expected range exhaustion now leaves the
  Workspace ready with an inline message naming the range end. This visible
  slice awaits human interaction and visual review.
- R6.9f freezes one global visual Workstation Settings scope, separate from the
  global domain-specific Quick GoTo preference and Pane operational state. It retains the V6-proven
  draft/Save/Cancel/Reset semantics, routes each field to its real owner, and
  originally bounded persistence, direct chart/candle, and optional visibility
  slices after Exact GoTo. It changes no production behavior and was completed
  headlessly; R6.9g supersedes only the future ids and field detail below.
- R6.9g records the user's detailed four-tab FXReplay audit without activating
  a production control. Body/Border/Wick visibility, shared Precision, and
  nullable Volume become real planned fields; Crosshair gains
  opacity/width/style; Grid becomes visibility-only; Canvas border/session-break
  noise is rejected; all eight current-price Name/Value/Line combinations and
  practical New York/UTC/local date/hour presentation are retained. Future
  unimplemented ids move to R6.9h-m rather than reusing the delivered R6.9g id.
- R6.9h separates Exact GoTo from Quick GoTo and adds Session-range-aware
  Calendar dates plus closed-boundary
  New York validation. Invalid input retains the dialog and issues no Replay or
  Workspace transaction. It was accepted on 2026-07-22 after the roll-boundary
  visible-completion correction. The 2026-08-05 overall-acceptance follow-up
  now defaults the dialog to the latest revealed minute and translates that
  visible-minute choice to the existing exclusive Replay cutoff.
- R6.9i activates one separate versioned global Workstation Settings record and
  owner. Its four-tab draft shell exposes only Canvas Grid visibility; OK stages,
  applies, persists, and commits all consumers atomically, while failures roll
  presentation back. The Pane-set adapter converges every current and future
  Pane without Replay, Workspace, series-data, or Viewport mutation. It was
  accepted on 2026-07-22.
- R2.4 returns to the accepted Session Browser boundary for a bounded user
  follow-up: list-only deeper neutral surfaces, brighter/larger typography, and
  one confirmed Delete action per card. Browser UI dispatches only the command;
  Session Store validates identity/revision and Repository removes index plus
  record while preserving every other Session. It was accepted on 2026-07-22.
- R6.9j activates independent Body/Border/Wick visibility and up/down colors plus
  Auto/manual shared price precision. Native series options never write data;
  each Pane derives Auto from its instrument increment and the OHLC readout uses
  the same formatter. R6.9j and its R6.9j1 color-picker refinement were accepted
  on 2026-07-22.
- R6.9k advances global Settings to schema version 4 and activates independent
  OHLC/change/Volume plus current-price Name/Value/Line controls. A bounded
  adapter primitive covers name-only price-axis presentation; compact symbol
  labels come from explicit Instrument metadata. It was accepted on
  2026-07-22.
- R6.9l advances Settings to schema version 5 and activates Canvas, shared
  Crosshair, scale, Pane-control, and owner-routed margin presentation. Its
  review correction previews valid drafts immediately and restores the full
  committed presentation on every discard/failure path. It was accepted on
  2026-07-22.
- R6.9m advances Settings to schema version 6 and centralizes New York/UTC/
  browser-local, date-order, detailed-weekday, and 12/24-hour presentation for
  native chart formatters, Replay Workspace, Exact GoTo, and Session Browser.
  Session creation and Quick GoTo retain their New York domain clocks; no
  canonical instant or Replay state moves. It was accepted on 2026-07-22.
- R6.10a adds one pure versioned Layout Sync policy with reviewed Symbol-on and
  other-switches-off defaults. Session Store now persists Pane Layout plus the
  policy in configured workspace schema 5 and lazily migrates schemas 1–4.
  The already accepted Crosshair switch now saves and restores per Session;
  Symbol and Interval now have accepted consumers. Time and Date range remain
  absent/inert by explicit product decision. Replay and ETH/RTH remain always
  Session-wide.
- R6.10c3 adds a separately owned explicit right-click command. It selects one
  exact source candle by canonical market time, targets stable P1-P4 identities,
  preserves target span, and uses bounded owner-routed history when required.
  It does not restore ordinary-click coupling or activate Date-range sync.
  Its first human review found that a newly exposed left edge waited for a
  later mouse event before history extension. The correction immediately
  publishes the accepted programmatic range through the existing
  history-boundary port; Workspace/Bar Data owners still decide and execute
  the fill. Repeat human review accepted the correction on 2026-07-23.
- R6 closure deliberately defers Date-range sync rather than carrying it as an
  unfinished R6.10d task. Its versioned field remains false/inert, the Layout
  menu exposes no control, and native pan/zoom remains Pane-local. R7 starts
  with complete Session Workspace restoration instead.

Latest corrective commits:

1. `beaced4f fix(v7): present chart time in New York`
2. `8d93cd92 fix(v7): place aggregate candles at completion`
3. `6dd86fff perf(v7): accelerate aggregate replay updates`
4. `c2abb6f0 fix(v7): delay slow refresh feedback`
5. `9947f77a fix(v7): open newly created sessions`
6. `4a6e6869 fix(v7): stabilize high-timeframe replay interactions`
7. `af0173c1 fix(v7): use New York session wall time`
8. `55d36761 docs(v7): record third R5.6 review rejection`
9. `8616913c fix(v7): preserve continuous chart replacements`
10. `9d05e0cd docs(v7): record fourth R5.6 review rejection`
11. `3d66f46e perf(v7): keep rapid history loading responsive`

## R5.6 Human Review Result

Status: **accepted and closed**.

On 2026-07-21 the user explicitly reported `R5.6复审通过`. Rapid earlier-history
loading is accepted without the reported input freeze, and the complete R5.6
corrective gate is now binding regression behavior. R6 is unblocked.

Passed and protected:

- real NQ candles, exact initial no-future boundary, and one source minute per
  Next;
- repeated leftward history extension without moving Replay;
- compact single-column TF menu and atomic ETH/RTH replacement;
- plot-wheel horizontal zoom, price-axis wheel vertical zoom, and Reset View;
- full-height Canvas with no feed/wall/cursor metadata strip.

Corrective implementation, in order:

1. New York exchange-axis presentation is locked without changing real source,
   request, cache, Projection, or Replay instants.
2. Projected bars retain bucket `startEpochMs` and carry chart-only
   `displayEpochMs` for `4m :03/:07/...`, `30m :29/:59`, and `1h :59`.
3. Bounded forward raw coverage plus safe adapter tail updates produce zero
   provider requests across 100 covered `5m` Next actions; the final full-gate
   run remains below the binding p95/p99/max thresholds.
4. Cache-hit work shows no `Updating…`; slow replacement dimming begins only
   after 500 ms and contains no overlay text.
5. Successful Session creation navigates to and activates the exact new route.
6. Session creation `12:40` is now New York wall time and produces a `12:40`
   New York initial chart boundary, independent of browser timezone.
7. ETH and RTH share `4m :03/:07/...` and hour-family `:59` completion slots.
8. High-TF replacement no longer starts recursive foreground history work;
   the final real-Chrome gate measured about `1.42s` for uncached `12h` RTH,
   `159ms` for first `5m`, and `72ms` for cache-hit ETH→RTH.
9. Bounded high-TF history no longer leaves an empty left chart margin or needs
   another pointer action to repair its initial logical range.
10. Replacement cannot splice non-adjacent accepted history into a target
    request; Projection also rejects any gapped source-window sequence.
11. A historical low-TF manual wall cannot submit `from > to` after a high-TF
    replacement; the transient range remains valid and includes loaded bars.
12. Real Chrome history→`1h`→RTH→ETH evidence reaches the Replay-visible tail,
    reports a normal 50-hour weekend as its maximum interval, and preserves the
    high-timeframe performance improvement.
13. Deep earlier-history projection cost is bounded to the new plus boundary
    chunks instead of all accumulated raw history.
14. Sub-hour V4 history retains an adapter-wide two-transfer pool over
    contiguous seven-day raw transport parts. `1h`–`12h` left context instead
    uses separately provenanced, Bar Data-owned projected history from the same
    immutable `1m` dataset and never enters Replay raw-source traversal.
15. One screenshot-scale dense `4h` drag spans about 1,910 logical bars, fills
    the complete visible left edge with 2,427 final candles, and commits exactly
    one visible revision/`setData` in `496.3ms`; Canvas opacity stays `1`, stale
    state never appears, and the pre-existing candle anchor remains exact.
16. RTH materialization anchors its context window at Session entry. A premarket
    entry therefore crosses to the prior eligible RTH Session instead of
    committing an empty Pane from closed-market natural minutes; no-future bars
    stay hidden, and Manual Next retains the same buffered request identity.
17. Dense TF/ETH-RTH replacements derive their complete bar target from the
    retained semantic Viewport before acquisition. Sub-hour targets use one
    shared conservative raw window; capped `1h`–`12h` targets merge separately
    provenanced projected context with the authoritative raw tail. No native
    history event or second visible transaction is required.
18. A complete-Pane time-location transaction cannot narrow an unchanged
    Pane's accepted source wall when its ordinary navigation request is already
    fully covered by same-scope accepted raw batches. The target Pane locates
    normally while the dense non-target Pane retains its bar count and span.

Use V6 source/docs/tests as binding interaction evidence for items 1–4. Do not
restart product interviews or copy V6 runtime ownership.

Latest R3.3 commits, oldest to newest:

1. `356577d8 feat(v7): define replay cursor contract`
2. `f9cb0626 feat(v7): add visible-commit replay clock`
3. `56fdfce4 feat(v7): add bounded replay prefetch advice`

R4.1–R4.5 are the commits after this handoff's original R3.3 baseline.

## Deliberately Not Implemented

There is still no production-complete CME holiday dataset or Date-range sync.
The registered day/week/month policy uses the current weekly ETH/RTH calendar
and real source gaps; it does not imply holiday completeness. Active Layout
Sync is intentionally limited to Symbol, Interval, and Crosshair.
V7 now uses real local DuckDB NQ history, but this does not imply complete
exchange-calendar or tick-level coverage.

## Verification After Restart

The authoritative database may remain at its historical filesystem path; that
is external data compatibility and does not reintroduce a V4 runtime. From the
repository root, first confirm the durable checkout and database without
starting services:

```bash
git branch --show-current
git status --short
python3 -c '
import duckdb
db = "/home/leo/myworkspace/trading/backtesting/v4/data/trading_data.duckdb"
with duckdb.connect(db, read_only=True) as conn:
    print(conn.execute("""
        select instrument, count(*) as rows,
               count(*) - count(distinct ts) as duplicate_timestamps
        from futures_1m
        where instrument in ('ES', 'NQ')
        group by instrument
        order by instrument
    """).fetchall())
'
```

Expected results:

- branch is `main` for a normal release checkout, or detached at `v7.0.0` when
  reproducing the accepted milestone;
- `git status --short` is empty;
- ES reports 6,494,880 rows and NQ reports 6,167,407 rows.

Then start the two required V7 services in separate terminals:

```bash
cd /home/leo/myworkspace/trading/backtesting-v7
V7_MARKET_DATA_DB=/home/leo/myworkspace/trading/backtesting/v4/data/trading_data.duckdb \
  python3 v7/server/market_data_api.py
```

```bash
cd /home/leo/myworkspace/trading/backtesting-v7
node v7/scripts/serve.mjs 8007
```

Both commands own their terminals while running. The V7 market-data service is
required for the real chart; if it is unavailable, V7 shows Chart unavailable
and does not substitute fake bars.

After a service restart verify both endpoints:

```bash
curl -s http://127.0.0.1:8766/v7/market-data/health
curl -s -o /dev/null -w '%{http_code}\n' http://127.0.0.1:8007/v7/app/
```

Expected: V7 market-data health returns JSON with `"status":"ok"` and
`"version":"7.0"`, and Web returns HTTP `200`. Do not rerun either historical
repair manifest during ordinary restart;
both guarded writes are already committed and verified.

Installing dependencies or running the complete Harness suite is not required
for an ordinary server reboot when the checkout is unchanged. Before resuming
development, the standard optional regression command remains:

```bash
npm --prefix v7 install
for test_file in v7/tests/*-harness.js; do node "$test_file"; done
```

## Exact Next Step

P1c.1 now implements the accepted calculated-series pure-contract dependency
through separate `contribution-profile-contract` and
`calculated-series-contract` modules. The product owner accepted the focused
contract/evidence review on 2026-08-13; H118 is accepted with the P1c.1
implementation session as durable evidence, and P1c.1 is closed.

The separately requested documentation-only candidate for the second
dependency is
`V7_CALCULATED_SERIES_CHART_OWNED_PROJECTION_SLICE_SPEC.md`. It proposes a
complete-surface Chart child transaction, bounded adapter-native bridge,
same-chart Main/internal regions, structural Scale/standard Plot realization,
exact rollback, and future synthetic Chromium evidence. Its ten decisions are
not accepted. No `P1c.2` or H119 has been allocated.

The exact next step is product-owner review of those ten candidate decisions.
Review may accept, amend, or reject the specification; even acceptance alone
does not authorize implementation. Do not infer authority for production Chart
projection, a live instance/persistence owner, SDK execution availability,
MA/SMA, Community/Worker execution, or P1b.4. H117 remains unchanged.

R13.10e/H114, P0b/H115, and P1a/H116 are closed. P1b.1–P1b.3 implement the
non-executing local package contract/archive, transaction/storage, and corrected
two-surface Plugin Center boundaries. Installed generations remain explicitly
inactive and cannot reach activation, MCP, registry, or production candidate
execution. The accepted amended P1b
specification is
`V7_LOCAL_PLUGIN_PACKAGES_AUTHORING_MCP_P1B.md`; H117 is registered as
executable with 54 groups but remains unaccepted. Its five binding decisions are:
installation is not activation; `.v7plugin` is distinct from `.v7dk.tar`; one
device-local package store owns inventory transactions; prepared candidates
remain non-executing authoring/tool artifacts; and local `stdio` MCP is
authoring-only. Focused review first corrected a vertically stretched tab
layout and bound a compact 40 px strip with 30 px controls in real Chromium.
The accompanying role review found that Developer Mode had no unique
product outcome: P1a owns validate/build/test/preview/pack, Installed owns
admission, and P1b cannot execute or preview an external package. The product
owner accepted its removal: production now has exactly Included and Installed,
the browser adapter is archive-only, and strict unpacked-candidate inspection
remains tooling/security evidence without retained handles or mode state. The
corrected focused human review in
`V7_LOCAL_PLUGIN_PACKAGE_P1B3_HUMAN_REVIEW.md` passed on 2026-08-12. P1b.4 is
deliberately paused and still requires a separate product-owner instruction.
The calculated-series candidate does not supersede that pause. Do not create
the MCP adapter or claim H117 acceptance, P2 registry, P3a Worker runtime, P3b
Pine migration, detector, MA/SMA, Fibonacci, Marketplace, or R13.11–R13.13
before the applicable authorization.

Older clean-host, physical cross-device, Data Acquisition admin, resource, and
known H091 visual checks remain non-blocking operational follow-up for the
already accepted V7.0.0 foundation. Second-level/tick-sourced Replay also stays
behind its separate predecision hard gates; no provider purchase, prototype,
second cache owner, or implementation is implied by R13.10d acceptance.

## Standing Workflow

- every bounded substep receives its own commit;
- run focused Harnesses, full Harness suite, and `git diff --check` before commit;
- update `TODO.md`, architecture metadata, and one session record when closing;
- only interaction or visual changes stop for manual review;
- headless contract/runtime/documentation changes use automated evidence and a
  concise explanation;
- R4's first browser-visible chart slice must stop for interaction and visual
  review before further work.
