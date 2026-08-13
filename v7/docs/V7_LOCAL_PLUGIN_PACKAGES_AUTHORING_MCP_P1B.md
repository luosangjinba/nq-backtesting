# V7 Local Plugin Packages And Authoring MCP — P1b Accepted Specification

Status: accepted binding specification 2026-08-11, amended 2026-08-12 to remove
the top-level production Developer Mode; P1b.1–P1b.3 separately authorized and
implemented; H117 executable with 54 frozen negative groups and corrected
two-surface product-browser evidence, focused human review pending, not accepted

Date: 2026-08-11

Acceptance record:
`../sessions/session_20260811_p1b_local_packages_authoring_mcp_specification_acceptance.md`

P1b.1 implementation record:
`../sessions/session_20260811_p1b_1_contract_archive_implementation.md`

P1b.2 implementation record:
`../sessions/session_20260812_p1b_2_inventory_transaction_implementation.md`

P1b.3 implementation record:
`../sessions/session_20260812_p1b_3_plugin_center_developer_mode_implementation.md`

P1b.3 product-correction record:
`../sessions/session_20260812_p1b_3_developer_mode_surface_removal.md`

## 2026-08-12 Binding Product-Surface Amendment

After implementation, the product owner accepted the recommendation to remove
Developer Mode as a top-level production surface. P1a already owns source
validate/build/test/preview/pack; Installed owns meaningful package admission;
and P1b authorizes no external runtime with which browser Reload could provide a
live feedback loop. The extra mode, persistent preference, retained directory
handles, and session generation lifecycle therefore added no unique product
outcome.

This amendment supersedes every original requirement below for a production
Developer Mode tab, toggle, Load unpacked, Reload, Validate/Pack, Unload,
preference, retained directory handle, or `developer-inactive` generation. The
production Plugin Center contains exactly Included and Installed. Its browser
adapter selects and inspects only `.v7plugin` archive snapshots.

The security boundary is retained, not weakened: the pure unpacked-entry
inspector remains in `core.plugin-contract`, and strict directory double-
snapshot/path/symlink/special-file/resource/cancellation/receipt checks remain
tooling-only H117 evidence. The stable internal source kind
`developer-unpacked` records artifact provenance; it does not name or authorize
a product mode. A visible developer surface may return only under a separately
reviewed specification when a safe external preview runtime or demonstrated
browser-only workflow creates a distinct user outcome.

Depends on:

- `V7_CORE_AND_COMMUNITY_PLUGIN_MODEL_SPEC.md` (`ADR-V7-004`);
- `V7_BUILT_IN_PLUGIN_CONTRACT_SUBSTRATE_P0A.md` and accepted H113;
- `V7_CORE_PLUGIN_CENTER_P0B.md` and accepted H115;
- `V7_AGENT_NATIVE_PLUGIN_DEVELOPER_KIT_P1A.md` and accepted H116.

## Outcome

P1b defines the first local package-admission layer above the accepted P1a
Developer Kit. It gives a user a transactional **Install from file** workflow,
an honest Installed inventory/recovery surface, and a local workspace-bounded
MCP adapter over the existing P1a authoring operations. Prepared unpacked
candidates remain Developer Kit artifacts rather than a production mode.

P1b does not authorize external package code to execute. In this phase,
installation means that verified immutable package bytes, metadata, settings,
and provenance enter a device-local inventory. It does not mean enablement,
ModuleHost composition, production execution, publisher trust, or access to
V7 owners. An external package which declares an executable or otherwise
unavailable contribution is reported honestly as unavailable and cannot enter
an active definition graph.

This deliberately separates three security decisions:

1. P1a can prove that a developer workspace produced reproducible evidence.
2. P1b may admit a distinct local package archive to a device-local inventory
   after explicit user review.
3. Only a later authorized declarative runtime or P3a Worker tier may make an
   external contribution executable.

P1b therefore closes local packaging, inventory, recovery, and authoring
transport boundaries without pretending that Community execution already
exists.

## Upstream Capability And Security Check

The design borrows established workflow ideas without inheriting another
product's privilege model:

- Visual Studio Code supports explicit local archive installation and disables
  automatic update for a manually installed VSIX by default. V7 adopts the
  visible local-source and manual-update posture, not VS Code extensions'
  application-level privileges:
  <https://code.visualstudio.com/docs/configure/extensions/extension-marketplace#_install-from-a-vsix>
- VS Code Workspace Trust demonstrates that untrusted workspace content should
  enter a restricted mode before any automatic code execution. P1b is stricter:
  external code never executes in this phase:
  <https://code.visualstudio.com/api/extension-guides/workspace-trust>
- MCP `2025-11-25` defines `stdio` as a client-launched subprocess transport;
  P1b selects it so no localhost listener or remote endpoint exists:
  <https://modelcontextprotocol.io/specification/2025-11-25/basic/transports>
- MCP Roots define explicit filesystem operating boundaries and require path
  traversal and access controls. P1b treats roots as a narrowing hint in
  addition to, never instead of, its own startup allowlist:
  <https://modelcontextprotocol.io/specification/2025-11-25/client/roots>
- MCP Tools recommends clear exposure and a human ability to deny tool calls.
  P1b exposes stable read/write annotations but does not treat annotations as
  enforcement or permit any tool to install or activate a package:
  <https://modelcontextprotocol.io/specification/2025-11-25/server/tools>
- MCP's security guidance identifies local-server command execution,
  filesystem reach, and network reach as material risks. P1b uses one visible
  fixed startup command, a workspace allowlist, no network transport, and no
  generic command passthrough:
  <https://modelcontextprotocol.io/docs/2026-07-28/tutorials/security/security_best_practices>

These references are evidence for interaction and threat-model choices. They
do not replace V7's own ownership, transaction, no-future, or acceptance gates.

## Authorization Boundary

The product owner authorized **drafting this specification and correcting the
P1a status record** on 2026-08-11. After detailed review, the product owner
explicitly accepted all five material decisions below on 2026-08-11. That
acceptance makes this document the binding P1b specification; it does not
authorize P1b.1 or any implementation.

After that acceptance, the product owner separately instructed
`授权按已验收的 P1b 规格开始实现 P1b.1。` Only the contract/archive slice in
the required decomposition was authorized by that instruction. On 2026-08-12,
the product owner then separately instructed `授权 P1b.2`, authorizing only the
inventory transaction owner, atomic browser storage, migration, quarantine,
tombstone, and recovery slice. The product owner then instructed
`授权 P1b.3 Plugin Center 与 Developer Mode。` on 2026-08-12, authorizing only
the host-rendered local-package product surface, browser adapter, and its
additive H117 evidence. After reviewing the implemented mode, the owner accepted
the recommendation to remove that top-level surface and proceed with the
bounded P1b.3 correction. P1b.1–P1b.3 are implemented as amended. None of these
instructions authorizes P1b.4 MCP/H117 closure.

A separately authorized P1b implementation may include only:

- one versioned, deterministic local-install archive distinct from P1a's
  `.v7dk.tar` evidence bundle;
- one pure package-candidate validator and planner extending the existing
  plugin-contract boundary rather than creating a second plugin API;
- one device-local transactional package inventory owner with immutable
  generations, exact-revision commands, recovery, quarantine, and rollback;
- Included, Install from file, and Installed host-rendered Plugin Center
  surfaces, with Core/local trust kept visibly separate;
- tooling-only inspection of an explicit unpacked **candidate output
  directory**, never automatic execution of a source workspace or a production
  directory-picker lifecycle;
- declarative settings migration, uninstall/data-survival, and restricted-mode
  behavior;
- one local `stdio` MCP adapter exposing the eight existing P1a authoring
  operations within one selected workspace;
- the declared H117 automated, browser, architecture, and human-review gate.

P1b explicitly excludes:

- importing, evaluating, activating, or dynamically loading external ESM,
  TypeScript, WASM, Python, Pine, HTML, CSS, or lifecycle scripts;
- creating external ModuleHost descriptors or allowing an installed package
  into an application definition graph;
- a production Worker, calculation runtime, arbitrary declarative expression
  language, native renderer, custom DOM, or direct Chart/Series/Canvas handle;
- package filesystem, shell, process, credential, database, Bar Data, Replay,
  Workspace, Annotation repository, Journal, network, or AI-provider access;
- registry discovery, download, publishing, signing, publisher verification,
  automatic update, revocation service, accounts, entitlement, or Marketplace;
- silently converting a P1a developer evidence bundle into an install archive;
- MCP install, update, uninstall, enable/disable, trust, permission, restart,
  package-store, Plugin Center, or ModuleHost operations;
- MA/SMA, Fibonacci, a detector, a new Semantic package, a new drawing, a
  product Setup workflow, R13.11–R13.13, P2, P3a, P3b, or P4 behavior;
- cross-device replication of package bytes, trust choices, or local inventory.

No new package, installed row, control, storage record, MCP server, schema,
Harness entry, or production code may be created from specification acceptance
alone. Every implementation slice requires a separate product-owner
instruction. P1b.1–P1b.3 received their own instructions; P1b.4 still requires
one.

## Accepted Material Decisions

The product owner explicitly accepted these five material choices on
2026-08-11:

1. **Install is not activate.** P1b stores and manages local package candidates
   but executes none of their external code or business contributions.
2. **The install archive is a new artifact.** `.v7dk.tar` remains evidence-only;
   a `.v7plugin` archive requires a separate versioned pack result and explicit
   install confirmation.
3. **Local inventory has one new owner.** A device-local package-store runtime
   owns bytes and transactions; it does not absorb the Core profile, ModuleHost,
   domain evidence, or application lifecycle.
4. **Prepared candidates stay authoring/tool artifacts.** The original accepted
   design placed their non-executing inspection behind a production Developer
   Mode. The 2026-08-12 amendment removes that surface: source editing,
   compilation, isolated tests, preview, pack, and unpacked inspection stay in
   the P1a/Developer Kit boundary. Production admits only a separately selected
   `.v7plugin` archive after explicit review.
5. **MCP is authoring-only.** It uses local `stdio`, one startup-allowlisted
   workspace, and the canonical P1a engine. It cannot perform package lifecycle
   actions even when an agent asks.

If any of these choices changes, this document must be revised and reviewed
before implementation rather than letting code silently settle the policy.

## Terms And Artifact Separation

P1b uses these names consistently:

- **Developer Workspace** — the P1a source, fixtures, expected outputs, and
  authoring configuration rooted by `v7-plugin-kit.json`.
- **Developer Evidence Bundle** — P1a's deterministic `.v7dk.tar`; always
  `installable: false` and never accepted by the package store.
- **Unpacked Candidate Directory** — a prepared output layout containing the
  P1b manifest, payload, index, source disclosure, and exact current
  P1a/P1b receipts. It is not an arbitrary source directory.
- **Local Plugin Archive** — the deterministic `.v7plugin` installation
  candidate produced from an eligible unpacked candidate by `pack` v2.
- **Installed Generation** — immutable archive bytes plus host-issued source,
  trust, compatibility, and inventory metadata committed by the package store.
- **Active Generation** — a package generation admitted to a production
  execution graph. P1b never creates one for a local package.
- **Quarantine** — retained bytes and diagnostics which are excluded from
  contribution resolution because integrity, compatibility, migration, or
  recovery failed.
- **Restricted Mode** — a startup condition in which external inventory is
  ignored for contribution selection while diagnostic and recovery access
  remains available.

`installable`, `installed`, `enabled`, `active`, `conformant`, `trusted`, and
`signed` are independent claims. No adapter may infer one from another.

## P1b Contract Profile

P1b defines one additive profile:

```text
profile id: local-declarative-package-v1
distribution tier: community
admitted sources: local-archive | developer-unpacked
host-issued trust: unverified-local | developer-local
permissions: []
production execution target: null
production execution authorized: false
automatic update: false
network: unavailable
```

The profile admits package metadata, host-rendered management fields, settings
schemas, source/license disclosure, conformance evidence, and opaque build
artifacts. It does not publish a business capability or application module.
Its `provides`, live `contributions`, permissions, and executable entrypoint
must therefore be empty. A candidate requesting an indicator, Semantic type,
drawing, tool, workflow, custom surface, or Worker is `unavailable`, not
partially installed and not misreported as active.

This intentionally makes the first implementation a real package-lifecycle
proof rather than an inert example pretending to perform trading behavior.
H117 may use synthetic lifecycle packages but P1b adds no built-in product
package. A later declarative contribution profile or P3a Worker profile must
add its own schema version, real reference contribution, permissions, resource
limits, Harness growth, human review, and separate authorization.

P1a's `trusted-built-in-core-v1` profile remains unchanged. A local archive
cannot claim `core`, `built-in`, `first-party`, or the identity of an included
Core package. Repacking the FVG reference never turns it into a local first-
party release.

## Package Manifest V2

P1b defines `PluginPackageManifestV2` as a portable package-authored value.
The accepted shape and constraints below bind P1b.1. Exact JSON Schema field
spellings and catalog limits become implementation artifacts only when a
separately authorized P1b.1 adds them; a material change requires review.

```text
PluginPackageManifestV2 {
  manifestVersion: 2
  packageId
  packageVersion
  display: { name, description }
  publisher: { id, name }
  license: { expression, noticePath }
  hostApiRange
  contractProfile: "local-declarative-package-v1"
  capabilities: { provides: [], requires: [], extends: [] }
  contributions: []
  settings: null | host-rendered package/profile schema
  permissions: []
  execution: { tier: "none", entrypoint: null }
  persistence: {
    schemaVersion
    retention: "preserve-on-uninstall"
    migrations[]
  }
  conformance: {
    sdkVersion
    toolchainDigest
    requiredReceiptDigests[]
  }
}
```

The publisher fields are self-asserted display/provenance data. They are not a
verified identity. The manifest does not authoritatively declare install
source, trust, signature, selected file path, install time, or user consent;
the host records those facts separately.

Unknown fields, non-portable numbers, duplicate ids, incompatible versions,
non-empty permissions/capabilities/contributions, an entrypoint, remote URL
used as executable input, or a P0a first-party distribution claim fail closed.
README, notices, changelog, and other package text are rendered as escaped
plain text or a separately accepted sanitized subset; they never supply HTML,
commands, links with automatic navigation, or authority.

## Host-Issued Source And Trust Record

The package store creates an immutable record which cannot be supplied or
overridden by archive bytes:

```text
PackageSourceRecordV1 {
  sourceKind: "local-archive" | "developer-unpacked"
  trust: "unverified-local" | "developer-local"
  archiveDigest | unpackedSnapshotDigest
  manifestDigest
  selectedByUser: true
  automaticUpdate: false
  signature: { status: "not-applicable" }
  publisherVerification: { status: "self-asserted" }
}
```

Host paths, usernames, directory names, file-picker handles, wall-clock values,
and MCP client identity do not enter portable package identity or content
digests. A local path may appear transiently in host UI but is neither exported
nor exposed to package content.

Install confirmation must show package id/version, self-asserted publisher,
source kind, archive SHA-256, license, host compatibility, profile, requested
permissions, unavailable contribution claims, settings/data-retention policy,
dependencies, migrations, and whether this is an install, upgrade, downgrade,
or same-version replacement. Confirmation binds to the exact candidate digest
and inventory revision; a changed byte invalidates it.

## Deterministic Local Plugin Archive V1

P1b defines suffix `.v7plugin` and media identity
`application/vnd.replay-lab.v7-plugin+tar`. The container is deterministic
uncompressed ustar so the already-proven strict P1a tar boundary can be reused
rather than adding a second archive parser or decompression attack surface.

The archive contains only:

```text
v7-package.json
content-index.json
provenance/source-disclosure.json
receipts/developer-kit.json
receipts/package-candidate.json
LICENSE or the manifest-declared notice path
payload/**
```

The package-candidate receipt binds:

- the exact P1a evidence/workspace, manifest, source, artifact, fixture, and
  expected-output digests;
- P1b manifest/profile/schema/catalog and archive-format identities;
- every content-index entry and the canonical unpacked payload digest;
- compatibility, declared settings/migrations, permissions, and unavailable
  claims;
- `installCandidateEligible: true`, `installed: false`, `activated: false`,
  `publisherTrusted: false`, and `productionExecutionAuthorized: false`.

`pack` operation v1 remains byte-for-byte P1a evidence behavior. P1b defines
`pack` operation v2 with explicit `outputKind: "unpacked-local-candidate"` or
`"local-install-archive"` plus profile selection; output kind is never inferred
from a filename. The first form creates the exact prepared directory consumed
by Developer Kit/tooling inspection, and the second encodes the same canonical
layout as ustar.
Both refuse when required P1a receipts are absent, stale, blocked, or tied to
different bytes. A `.v7dk.tar` file is rejected by Install from file even if
renamed to `.v7plugin`.

Archive parsing is non-executing and fail-closed. It rejects absolute or parent
paths, alternate separators, Unicode/path normalization collisions, duplicate
entries, links, devices, sparse files, PAX/GNU extensions, undeclared entries,
non-normal metadata, padding/trailing bytes, excessive entry count, excessive
per-file or total unpacked size, digest mismatch, stale receipts, and nested
archives beyond the explicitly indexed opaque-file policy. Exact limits live
in the versioned P1b catalog and cannot be raised by a package.

Inspection extracts nothing to a caller-selected filesystem path. The browser
and package-store adapters stream/parse into bounded memory or private staged
storage; only the store's immutable commit writes durable bytes.

## One Candidate Pipeline

Local archive admission and tooling-only unpacked inspection share the same pure
non-executing validation boundary. Only the archive path can continue into the
production transaction:

```text
selected archive bytes
        |
        v
strict archive/layout parser
        |
        v
plugin-contract manifest/profile/compatibility validator
        |
        v
receipt + integrity + source/trust planner
        |
        v
exact impact/migration/retention plan
        |
        v
explicit user confirmation (install-from-file only)
        |
        v
plugin-package-store transaction
        |
        v
installed-inactive inventory OR quarantined diagnostic
```

No step imports ESM, constructs a module descriptor, calls a package callback,
starts ModuleHost, mutates the Core profile, or publishes a domain capability.
Tooling-only unpacked inspection stops before the product boundary. To install,
the user separately packs an archive, selects it through Install from file, and
completes the ordinary review/transaction.

The pure planner returns a portable candidate result containing candidate
digest, source/trust, compatibility, current/prior version, dependency impact,
settings-migration plan, data-retention effect, required review statements,
and stable diagnostic codes. UI text is derived from that result and cannot
reinterpret eligibility.

## Device-Local Inventory Contract

P1b defines one record family owned by `core.plugin-package-store`:

```text
LocalPluginInventoryRecordV1 {
  schema
  version
  revision
  installed: package-id -> InstalledPackageGenerationV1
  quarantined: package-id -> QuarantinedPackageRecordV1
  pending: null | PackageTransactionV1
  tombstones: package-id -> PackageTombstoneV1
}
```

An installed generation contains immutable archive/content/manifest/receipt
digests, host-issued source/trust, compatibility, settings schema version,
retained prior-generation identity, and state. It never contains an imported
function, owner handle, DOM node, native browser handle, absolute host path, or
ModuleHost descriptor.

The inventory is device-local and excluded from Server State Sync. Package
bytes, trust choices, pending transactions, and local paths never replicate.
Host-owned Session/Replay/Annotation/Journal data keeps
its existing synchronization and ownership rules. A later cross-device package
policy must resolve device inventory and compatibility before it can be
specified; it cannot add P1b keys to the current allowlist silently.

The storage adapter must provide atomic multi-record transactions suitable for
immutable package bytes and a compare-and-swap inventory revision. `localStorage`
alone is not an acceptable package-byte transaction store. Storage mechanics
remain adapter-owned; candidate validity and transaction state remain domain-
owned.

## Local Package Settings

An eligible package may declare only host-rendered package and profile/default
settings using P1a-supported control/value schemas. The package store keeps
those values in the package's device-local namespace and applies complete
values through the same exact inventory revision contract. The package supplies
no callback validator, default function, DOM, or migration code.

Apply, Cancel, and Reset remain host-owned. Apply validates the complete static
schema, rejects stale inventory or package generation, commits atomically, and
does not activate a contribution. Reset removes the selected override so the
declared default and effective-value source remain visible. P1b has no instance
settings because it has no live external contribution instance.

P0b's `core.plugin-profile` remains the sole owner of built-in Core package/
profile settings. The P1b package store neither copies nor generalizes that
record; it owns only external local-package namespaces. Upgrade migration and
uninstall quarantine preserve these external values without touching Core or
host-owned evidence.

## Install, Upgrade, Downgrade, And Recovery Transaction

Every state-changing command carries the last observed inventory revision and
one exact candidate or transaction receipt. The package store serializes
transactions and rejects stale, duplicated, overlapping, or replayed receipts.

Install/upgrade/downgrade uses this sequence:

1. Read selected bytes without executing or extracting them to a public path.
2. Parse and validate archive, index, manifest, receipts, profile, compatibility,
   dependencies, settings schema, migration, retention, and exact limits.
3. Compare against the current immutable inventory and construct one complete
   impact plan without writing.
4. Show the exact source/trust/integrity/version/migration/retention plan and
   require explicit confirmation bound to candidate digest plus inventory
   revision.
5. In one private transaction, stage immutable candidate bytes, migrated
   package-owned settings, the previous-generation reference, and a pending
   journal record.
6. Re-read and verify every staged digest and migration output. No package code
   participates.
7. Atomically replace the inventory pointer, increment revision, and mark the
   generation `installed-inactive`; then clear pending state.
8. On validation, quota, storage, migration, cancellation, stale-revision, or
   crash failure, expose no candidate generation and preserve the prior
   committed generation byte-for-byte.

A same-version changed-digest replacement is not a routine reinstall. It is a
visible source substitution requiring explicit confirmation and preserved
prior provenance. Downgrade is explicit and allowed only when the declarative
migration/retention plan can preserve current data; otherwise it is blocked or
quarantined, never coerced.

At startup, a complete pending journal is either finalized only when every
commit marker and digest proves the atomic commit already happened, or rolled
back to the last complete inventory. Recovery never guesses which generation
the user intended. Repeated recovery failure enters Restricted Mode and keeps
Kernel/P0b available.

## Declarative Migration And Data Survival

P1b never executes a migration script. `MigrationPlanV1` is a host-interpreted,
bounded transformation over package-owned package/profile setting values only.
The accepted operation set is:

- rename one declared field to one declared field;
- copy one declared field when the destination is absent;
- set a declared default only when a value is absent;
- move a removed/unknown field into an opaque quarantine map.

Every step declares from/to schema versions, exact JSON Pointer paths, input
preconditions, and a canonical plan digest. The P1b.1 field name
`expectedOutputDigest` is retained for wire compatibility: because package/
profile overrides contain user-specific values which a static manifest cannot
predict, it binds the canonical from/operations/to plan, while the transaction
records the actual migrated-output digest and the staged settings-record digest
binds those exact values. Cycles, ambiguous paths, wildcard
paths, type changes without a host validator, arbitrary expressions, callbacks,
and access outside the package namespace fail. Original bytes and the
pre-migration value remain available for rollback.

P1b migrations never rewrite accepted Annotation revisions, evidence,
provenance, Session, Replay, Workspace, Journal, or Core profile values. Those
owners preserve package ids, schema ids, and opaque unresolved fields. A later
runtime-specific migration must use the applicable owner transaction and
receive separate authorization.

Uninstall removes current package payload bytes from the active inventory only
after dependency and retention review. It retains a compact tombstone with
package/version/source/digest/schema identity, package-owned settings in
quarantine, and references required to explain host-owned historical records.
It does not delete user evidence. Permanent data deletion/export is a separate
future operation and is not implied by uninstall.

## Package States And Restricted Mode

P1b local packages use honest non-executing states:

```text
candidate | installed-inactive | incompatible |
quarantined | migration-blocked | removed
```

They never report `active`, `enabled`, `running`, or `trusted`. The detail view
states that an execution tier is unavailable and identifies the later contract
required. P0b Core runtime/change states remain separate and unchanged.

V7 enters or offers Restricted Mode when:

- the inventory or package-store schema cannot be read exactly;
- a pending journal cannot be deterministically finalized or rolled back;
- installed content, index, manifest, or receipt digests disagree;
- compatibility/profile/catalog identity is unknown or stale;
- storage initialization fails or the user explicitly requests safe startup.

Restricted Mode starts Kernel and accepted trusted-build Core behavior using
the existing P0b boot/fallback rules, ignores every external package for
contribution selection, performs no migration/update/removal automatically,
and exposes sanitized inventory diagnostics and explicit retry/export/remove
recovery actions. Because P1b external packages never execute, Restricted Mode
is also a durable forward contract for P2/P3 rather than a claim that P1b code
was sandboxed.

## Unpacked Candidate Inspection — Tooling Only

An **Unpacked Candidate Directory** is an explicit P1a/P1b output, not a source
workspace or production package state. The tooling adapter double-snapshots only
bounded regular files, rejects unsafe/NFC-invalid paths, prefix collisions,
symlinks, special files, resource excess, cancellation, changed snapshots, and
stale receipts, then delegates to the same pure contract entry inspector used
by archive inspection.

The call retains no directory handle or generation after it settles. It has no
preference, watcher, automatic reload, background polling, install command,
package-store reference, code evaluation, ModuleHost descriptor, or production
DOM. Pack remains an explicit P1a Developer Kit operation. Installing its
`.v7plugin` result always requires the independent host-owned Install from file
review and transaction.

## Plugin Center Surface

P1b extends the host-owned Plugin Center without adding package DOM:

- **Included** remains the P0b Core-only surface;
- **Installed** lists local installed/quarantined rows and recovery state,
  visibly separate from Core trust;
- **Install from file** opens a host file picker for one `.v7plugin`, then a
  review surface before any package-store write;
- package details disclose identity, self-asserted publisher, local source,
  digest, signature-not-applicable state, compatibility, unavailable execution,
  settings, migrations, retention, prior generation, and recovery state;
- upgrade, downgrade, same-version replacement, uninstall, retry, quarantine,
  and rollback use exact plans and confirmations rather than optimistic labels.

The UI receives immutable snapshots and dispatches commands. It never parses an
archive, decides compatibility, writes inventory, touches Core profile state,
or calls ModuleHost. It renders package prose as safe host-owned text and does
not load package icons, remote images, HTML, CSS, or links automatically.

The visible implementation requires keyboard, focus-return, screen-reader,
contrast, narrow-window, cancellation, stale-result, progress, error, and
reduced-motion evidence. File-picker cancellation is a no-op, not an error or
partial transaction. The surface must also prove that no Developer Mode label,
toggle, directory action, or development-generation DOM exists.

## Owner And Module Boundaries

P1b binds this ownership graph for later implementation:

```text
core.plugin-contract
  extends: pure V2 manifest/profile/archive-candidate normalization,
           compatibility, dependency, migration, and impact planning
  never owns: bytes, persistence, DOM, lifecycle, or code execution

core.plugin-package-store
  owns: device-local immutable package generations, inventory revision,
        transaction journal, quarantine, tombstones, and exact commands
  never owns: Core profile, ModuleHost, domain evidence, DOM, network,
              application restart, or package execution

adapter.plugin-package-storage
  owns: atomic browser storage mechanics and quota/error translation
  never owns: candidate validity, migrations, recovery policy, or status

adapter.plugin-center-ui
  extends: Included/Installed/Install from file DOM and local review drafts
  never owns: archive parsing, inventory truth, compatibility, or lifecycle

v7/tools/plugin-developer-kit
  extends: pack v2, canonical authoring operations, and tooling-only unpacked
           candidate inspection/security checks
  remains outside: the production owner graph

v7/tools/plugin-developer-kit/mcp
  owns: MCP JSON-RPC/stdio transport and request/result adaptation only
  never owns: validation meaning, package lifecycle, app state, or authority

core.plugin-profile
  remains: sole P0b built-in Core active/pending profile owner

core.module-host
  remains: sole application module construction/start/stop/disposal owner;
           it receives no P1b external package descriptor
```

There is no `PluginHost`, installer-owned module lifecycle, package service
locator, UI store, or MCP-to-application control channel. New internal files
must be split by manifest/archive contract, inventory values, transaction
planning, store runtime, browser storage, UI, and MCP transport rather than
accumulating in an existing route/runtime entry file.

## MCP Adapter Contract

P1b pins the initial adapter to MCP protocol version `2025-11-25` and local
`stdio`. A later protocol/transport upgrade requires compatibility review. The
server opens no TCP/HTTP/Unix listener, performs no OAuth flow, contacts no
registry, and has no long-running daemon/install mode.

The user/client launches one fixed executable with an explicit absolute
`--workspace-root`. The exact command and root must be visible before first
execution. The server canonicalizes the root once, rejects a missing/non-
directory/symlink root, and never accepts a broader root from a tool argument.
If the MCP client supplies Roots, the effective root is the intersection of
the startup allowlist and one matching client root; Roots can narrow but never
broaden authority. A root change cancels or blocks unsettled operations before
adoption.

The adapter exposes exactly these tools, mapped one-to-one to P1a operations:

```text
v7_plugin_discover
v7_plugin_scaffold
v7_plugin_validate
v7_plugin_build
v7_plugin_test
v7_plugin_preview
v7_plugin_pack
v7_plugin_inspect
```

Each tool uses the versioned DeveloperKit request schema and returns the exact
canonical `DeveloperKitResultV1` or its explicitly versioned successor as MCP
structured content. Optional text is presentation only. The same request,
workspace bytes, SDK, toolchain, and output kind must yield the same result,
diagnostics, artifacts, and receipt through Library, CLI, and MCP.

The server exposes no resources, prompts, sampling, elicitation, completions,
experimental tasks, generic file read/write, shell, Git, package-manager,
browser, database, registry, install, lifecycle, or application tools. Unknown
methods and fields fail closed. Tool annotations truthfully distinguish
read-only and workspace-writing operations, but authorization never relies on
untrusted annotations.

All client paths are workspace-relative. The adapter injects the selected root,
revalidates every resolved real path against it, rejects symlink/hardlink/path
escape and special files, and permits writes only to the P1a ownership-marked
output root or a new empty scaffold target. It never overwrites source. It
serializes workspace-writing operations, rejects stale input digests, and
propagates cancellation/timeout through the existing isolated child cleanup.

The server starts with an environment allowlist sufficient only to locate its
pinned runtime/toolchain. It never returns environment variables, credentials,
home paths, hostnames, Git state, or absolute paths. Candidate test/preview
continues to run through P1a's disposable bubblewrap/Node/VM isolation with no
network; MCP is not the sandbox.

MCP cannot install the archive it just produced. Human package admission stays
inside the host-owned Plugin Center transaction so an agent cannot turn source
write authority into application lifecycle authority.

## Stable Diagnostics And Receipts

P1b diagnostic codes extend, not reinterpret, P1a `V7DK_` codes. The accepted
catalog must distinguish at least:

- evidence bundle supplied where an install archive is required;
- archive format/version/path/size/index/integrity failure;
- forged distribution, trust, publisher, signature, receipt, or Core identity;
- unsupported profile, permission, execution tier, contribution, or entrypoint;
- incompatible host, dependency, schema, migration, or downgrade;
- stale inventory/candidate/confirmation/receipt and concurrent transaction;
- storage quota/read/write/commit/recovery failure;
- quarantined, restricted-mode, or retained-data state;
- removed production developer ports, invalid unpacked directory, unsafe path,
  cancelled/stale snapshot, or stale candidate receipt;
- MCP root unavailable/changed/escaped, unsupported client capability,
  cancelled operation, malformed tool call, or forbidden lifecycle request.

Every prepare, commit, rollback, quarantine, uninstall, unpacked tooling
inspection, and MCP operation returns a stable portable result. Receipts bind content and decisions
but do not contain host paths or secrets. Install receipts record explicit user
confirmation and committed inventory revision as host facts; they still deny
activation, publisher trust, signature, and production execution.

## Declared H117 Acceptance Gate

H117 is allocated in `v7-harness-rules.json` as `executable`, not `accepted`.
P1b.1 freezes 18 Package Contract And Archive negative groups. P1b.2 adds 18
transaction/migration/recovery groups plus real-Chromium IndexedDB atomicity,
durability, and CAS evidence. P1b.3 retains 18 product/browser and unpacked-
candidate security groups plus corrected real-Chromium evidence, for 54 groups
total. Its focused human checklist is prepared but remains pending. P1b.4 must
add the MCP controls, complete the standing evidence, and may not reinterpret
or prematurely accept H117.

### Package Contract And Archive

- `.v7dk.tar` and renamed evidence bundles are never installable;
- pack v1 remains unchanged while pack v2 produces byte-identical `.v7plugin`
  archives for identical inputs across two clean roots;
- archive inspection validates exact layout, ustar metadata, index, receipts,
  provenance, license, limits, and content binding without execution;
- local candidates cannot forge Core/built-in/first-party/signed/trusted state;
- non-empty executable contributions, permissions, entrypoints, scripts, DOM,
  remote resources, or unsupported profiles fail closed.

### Transactions, Migration, And Recovery

- install, upgrade, downgrade, replacement, rollback, quarantine, and uninstall
  use exact candidate/inventory revisions and immutable generations;
- injected failures before staging, during each storage write, before commit,
  after commit marker, during cleanup, and across restart yield either the
  previous complete generation or the new complete generation, never both or
  neither;
- stale, duplicated, replayed, cancelled, or concurrent commands cannot change
  inventory;
- host-rendered local package-setting Apply/Reset uses exact revisions,
  preserves defaults/source, and never changes Core profile or activation;
- declarative migrations are namespace-bounded, deterministic, reversible,
  and cannot touch host-owned evidence or the Core profile;
- uninstall preserves tombstone/settings/provenance and leaves historical
  Session/Annotation/Journal bytes readable and unchanged;
- corrupt inventory, digest mismatch, unknown schema, and repeated recovery
  failure enter Restricted Mode while Kernel/P0b remains usable.

### Two-Surface Product And Unpacked Security

- production Plugin Center exposes exactly Included and Installed; its browser
  adapter has no developer preference, directory/save port, retained handle,
  generation, reload, or pack API, and rejects deprecated ports fail-closed;
- tooling-only unpacked inspection accepts only a prepared candidate directory,
  rejects path/NFC/symlink/special-file/resource/cancellation/stale-snapshot/
  stale-receipt attacks, retains no handle, never watches or executes code, and
  never installs automatically;

### MCP — P1b.4 Pending

- Library, CLI, and MCP produce equivalent canonical results for all eight
  P1a operations and pack v2 where applicable;
- the MCP server uses only `stdio`, exactly one startup-allowlisted root, no
  listener/network, no arbitrary files/shell/resources/prompts/sampling/tasks,
  no secret/absolute-path leakage, and complete cancellation cleanup;
- client Roots can narrow but not broaden access; root change, traversal,
  symlink escape, output escape, unknown tool/field/version, and lifecycle calls
  fail for the intended stable diagnostic;
- MCP-generated output cannot install, enable, trust, publish, update,
  uninstall, restart, or control ModuleHost.

### Product, Architecture, And Regression

- real Chromium proves Install from file review/cancel/commit/failure,
  Installed detail/status, the absence of a Developer Mode surface,
  restricted-mode diagnostics, focus/keyboard/accessibility, compact two-tab
  layout, and narrow-window behavior;
- the prepared focused human gate must accept the visible source/trust/
  integrity warnings, inactive-status honesty, confirmations, recovery, and
  minimal Included/Installed information architecture before that evidence is
  recorded;
- production architecture proves one package store, one Core profile owner,
  one ModuleHost, zero external descriptors, zero external imports/evaluation,
  and no new owner write outside declared surfaces;
- package inventory is device-local and absent from state-sync allowlists;
- P0a/H113, R13.10e/H114, P0b/H115, P1a/H116, ModuleHost, architecture,
  writer-closure, source-quality, deployed-runtime, and full regression gates
  retain their accepted behavior;
- every negative control first passes with the violation disabled, then fails
  for its intended reason; P1b.1 freezes its 18 contract/archive groups, and
  each later separately authorized slice must freeze its additive count and
  fixtures before H117 can be accepted.

H117 requires a human gate because P1b changes visible Plugin Center behavior
and asks the user to make local source/trust/data-retention decisions. It does
not require a trading-chart semantic/visual gate because no local package can
produce Chart or Semantic output in P1b.

## Required Implementation Decomposition

If implementation is separately authorized, the work must remain bounded and
committed in this order:

1. **P1b.1 — Contract and archive:** Manifest V2/profile/schema/catalog,
   pack v2, strict archive inspection, portable candidate/receipt, synthetic
   negative fixtures; no production UI or storage.
2. **P1b.2 — Inventory transaction owner:** package-store domain/runtime,
   atomic browser-storage adapter, migrations, quarantine, tombstones,
   restricted-mode recovery; no package execution.
3. **P1b.3 — Two-surface Plugin Center:** Included/Installed/Install from file,
   review/confirmation/recovery surfaces, archive-only browser adapter, tooling-
   only unpacked security inspection, browser automation, and focused human
   gate. The initially implemented Developer Mode was removed by the binding
   2026-08-12 product amendment.
4. **P1b.4 — Authoring MCP and H117 closure:** local `stdio` adapter over P1a,
   root/cancellation/security controls, Library/CLI/MCP equivalence, complete
   H117 and standing regression evidence.

Each slice must preserve one public owner boundary, add its applicable negative
controls, run standing gates, pass `git diff --check`, update TODO/session/
handoff records, and stop after one bounded commit. Acceptance of this document
approves the contract only; each implementation slice still requires a
separate product-owner instruction. P1b.1 received that instruction on
2026-08-11; P1b.2 and P1b.3 received their own instructions on 2026-08-12.
P1b.4 remains separately gated.

## Accepted State And Next Gate

Current state after the separately authorized P1b.3 implementation:

- P0a/H113, R13.10e/H114, P0b/H115, and P1a/H116 remain implemented and
  accepted;
- this P1b document is the accepted binding specification;
- H117 is `executable` with 18 frozen P1b.1 contract/archive groups, 18 frozen
  P1b.2 transaction/recovery groups, 18 frozen P1b.3 two-surface/unpacked-
  security groups, real-Chromium IndexedDB/product evidence, and a pending
  focused-human checklist; it deliberately has no acceptance evidence yet;
- Manifest V2, `local-declarative-package-v1`, 22 schemas, 10 catalogs,
  explicit pack/inspect v2, deterministic `.v7plugin`, prepared candidate
  layout, portable candidate receipts, and strict in-memory inspection exist;
- `core.plugin-package-store` owns immutable inactive generations, exact-
  revision preparations/receipts, settings, migration, rollback, quarantine,
  tombstones, startup recovery, and Restricted Mode;
- `adapter.plugin-package-storage` owns one dedicated atomic IndexedDB database
  with multi-record CAS; package inventory remains outside Server State Sync;
- `adapter.plugin-center-ui` composes exactly Included, Installed, install
  review, and Restricted Mode recovery from immutable owner snapshots and
  explicit commands;
- its browser adapter owns only one explicitly selected archive snapshot and
  retains no native directory handle, mode preference, development generation,
  reload, or pack lifecycle;
- strict unpacked directory/entry inspection remains tooling-only security
  evidence and never watches, evaluates, installs, activates, synchronizes, or
  creates a production descriptor;
- no MCP server, declarative business runtime, external descriptor,
  import/evaluation, or activation path exists;
- P2 registry, P3a Worker, P3b Pine migration, P4 Marketplace, and new business
  plugins remain separately gated.

The exact immediate gate is the focused P1b.3 human review in
`V7_LOCAL_PLUGIN_PACKAGE_P1B3_HUMAN_REVIEW.md`. Acceptance or rejection must be
recorded explicitly. P1b.4 remains a later, separately authorized decision;
until that instruction is given, no MCP adapter or H117 closure may begin.
