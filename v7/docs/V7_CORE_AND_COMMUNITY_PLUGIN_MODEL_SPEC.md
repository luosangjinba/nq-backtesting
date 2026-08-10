# V7 Core And Community Plugin Model — Accepted Specification

Decision id: `ADR-V7-004`

Status: accepted binding product and architecture specification; delivery not
allocated

Decision date: 2026-08-10

Decider: V7 product owner

Related decisions: `ADR-V7-001`, `ADR-V7-002`, `ADR-V7-003`

Partially promotes: `MEMO-V7-001`

## Decision Summary

V7 adopts an Obsidian-like product model for discoverable, independently
managed extensions:

- stable, first-party foundation capabilities appear to users as **Core
  Plugins**;
- optional third-party capabilities appear as **Community Plugins**;
- one host-owned **Plugin Center** eventually exposes discovery, status,
  configuration, dependency, enable/disable, install, update, and removal
  workflows appropriate to each tier;
- other plugins may derive from Core Plugin capabilities through declared,
  versioned dependencies rather than private imports or direct feature-to-
  feature control.

FVG, MA/SMA, BSL/SSL, and Fibonacci are accepted initial Core Plugin
capabilities. This classification is binding even though MA/SMA and Fibonacci
do not yet have production V7 implementations and the installation runtime is
not yet authorized.

“Common and uncontroversial” means V7 should ship a useful, stable, versioned
baseline out of the box. It does not mean every trader agrees on every
formation rule, tolerance, ratio, invalidation rule, or visualization. A Core
Plugin must freeze those choices as named definitions/profiles and must never
silently change the meaning of historical evidence.

## Authorization Boundary

This specification accepts the product taxonomy, dependency direction,
management experience, trust model, and staged delivery sequence. It does not
itself authorize:

- a dynamic loader, package installer, public SDK, arbitrary JavaScript, or
  Worker/WASM execution;
- network access, a remote registry, signing service, update service, account,
  entitlement, payment, or paid Marketplace;
- a general-futures product-scope change;
- implementation of MA/SMA, Fibonacci, a detector, Setup workflow, AI
  capability, or a new R13 delivery slice;
- expansion of R13.10c after its accepted closure;
- replacement or duplication of Session, Replay, Bar Data, Chart, Annotation,
  Workspace Transaction, persistence, or ModuleHost ownership.

Every implementation remains separately specified, authorized, tested, and
committed. The current trusted-build Semantic Package Registry is a compatible
precursor, not evidence that community installation is already safe.

## Three Distinct Layers

The product term **Core Plugin** must not be confused with V7's existing module
descriptor `kind: "core"`.

| Layer | Product meaning | Lifecycle | Authority |
| --- | --- | --- | --- |
| Kernel | indispensable V7 owners and public contract infrastructure | composed by the application; not user-disableable or uninstallable | may own only its declared state surface |
| Core Plugin | first-party, built-in extension with a stable baseline and V7 compatibility commitment | preinstalled; visible and independently enableable/disableable; not ordinarily uninstallable | capability-mediated; no private owner access |
| Community Plugin | optional package supplied outside the V7 release | explicitly installed, reviewed, enabled, updated, disabled, or removed by the user | least privilege, sandbox/resource limits, and fail-closed host mediation |

Kernel examples include Session identity, Replay truth, Bar Data acquisition
and cache, Chart mutation, Workspace transaction, persistence transactions,
and ModuleHost lifecycle. They are not displayed as plugins merely to make the
Plugin Center look complete.

Core Plugins are internally represented with distribution/trust metadata such
as `distributionTier: "built-in"` and `publisherTrust: "first-party"`; they do
not receive module `kind: "core"`. They remain removable optional modules or
policies at the architecture boundary. Disabling one removes its active tools,
calculations, and projections while preserving host-owned historical records.

Community Plugins use the same public capability contracts wherever possible,
but same contract does not imply same execution trust. First-party code may be
compiled into the trusted build while community calculation code later runs in
an isolated execution tier.

## Core Plugin Classification Rule

A capability belongs in the Core Plugin catalog only when all of the following
are true:

1. a minimal definition can be specified deterministically and versioned;
2. the capability is broadly expected in the target discretionary trading
   workstation rather than being one author's strategy edge;
3. multiple higher-level plugins can reuse its output or contracts;
4. V7 is willing to maintain compatibility, migration, conformance fixtures,
   accessibility, and failure behavior across releases;
5. it can operate through existing host owners without gaining direct Chart,
   Replay, Bar Data, Workspace, Annotation-store, DOM, or persistence access;
6. disabling it does not make the application or stored Sessions unreadable.

Popularity alone is insufficient. A strategy opinion, proprietary signal,
unstable detector, broker integration, or resource-intensive analysis does not
become Core merely because many users request it. Conversely, a derived plugin
may itself later become Core after a separate review if its baseline and
maintenance obligations satisfy this rule.

Promotion of a Community Plugin to Core requires an explicit trust/ownership
decision, compatibility and migration evidence, conformance fixtures, and a
review of its dependencies and permissions. V7 must not silently relabel
unreviewed third-party code as first-party Core.

## Initial Core Plugin Catalog

The following classifications are accepted now. Detailed implementations not
already present still require focused specifications.

| User-facing Core Plugin | Stable baseline | Deliberately outside the baseline |
| --- | --- | --- |
| Fair Value Gap | existing `imbalance.fvg.strict-three-bar-wick-gap@1.0.0`, exact evidence/provenance, rectangle/midpoint/label projection | body-gap, displacement, mitigation/fill, ranking, confluence, and automatic detection policies |
| Liquidity Levels | manual BSL/SSL role, exact anchor, provenance, and generic projection through the existing first-party package | automatic swing selection, liquidity sweep detection, inducement, ranking, and setup logic |
| Moving Averages | the MA indicator family with a canonical, versioned SMA algorithm and declarative overlay output | crossover signals, ribbons, trend regimes, strategy decisions, optimizers, and private formula code |
| Fibonacci | manual anchors, canonical ratio-set definitions, deterministic level calculation, labels, and declarative projections | automatic swing choice, OTE interpretation, premium/discount strategy policy, targets, and trade decisions |

MA is a capability family and SMA is one algorithm definition inside the Core
Moving Averages Plugin; both are Core at the product level without requiring
two artificial package lifecycles. Additional algorithms such as EMA or WMA
must be added through explicit versioned definitions and conformance fixtures,
not through an ambiguous `maType` branch in Chart or Workspace code.

The FVG baseline remains the accepted R13.10c strict three-Bar wick-gap
definition. A different valid school of FVG interpretation is a separate
definition/profile or derived plugin. It does not mutate version `1.0.0`.

The BSL/SSL baseline identifies a human-accepted liquidity role and anchor. A
detector that decides which swing is significant or whether liquidity was
swept is a provenance-distinct derivative, even if V7 later publishes it as a
first-party plugin.

The Fibonacci baseline calculates and projects levels from explicit anchors
and an identified ratio-set version. OTE, automatic swing selection, trade
entry logic, and outcome claims are separate contributions.

Future Core candidates must pass the classification rule; “and so on” is not
a wildcard authorizing every familiar indicator or semantic concept.

## Package, Contribution, And Pack

These terms name different things:

- a `PluginPackage` is the installation, update, integrity, compatibility, and
  lifecycle unit;
- a **contribution** is one capability published by a package, such as a
  semantic type, indicator algorithm, drawing tool, detector, host-rendered
  setting schema, workflow definition, or declarative Chart output;
- a **pack** is a curated product collection or dependency preset. It may make
  several plugins easy to enable together but must not collapse their durable
  identities or bypass their independent lifecycle and compatibility checks.

An eventual first-party “ICT/SMC Foundation Pack” may include FVG, Liquidity
Levels, Fibonacci, and later structure plugins as a curated preset. The
underlying package/type/definition ids remain independently versioned. The
current one-package-per-semantic-capability modules remain valid reference
boundaries.

Plugin-produced accepted Artifacts, indicator evidence, settings, and workflow
records are stored through host owners. A package owns meaning/policies, not
the only readable copy of user data.

## Derived Plugin Contract

Core Plugins are reusable foundations, not feature controllers. A derived
plugin declares relationships conceptually equivalent to:

```text
provides: capability ids and versions
requires: capability ids and compatible ranges
extends: optional contribution ids and compatible ranges
permissions: explicit host capabilities
```

The exact manifest wire schema requires a later implementation contract. The
following dependency rules are binding now:

1. dependencies target public, versioned capabilities or contribution ids;
2. a plugin never imports another plugin's private files, mutates its state, or
   calls its UI controller;
3. ModuleHost resolves the dependency graph before activation and injects only
   declared read-only, evidence, calculation, or command ports;
4. cycles, missing requirements, incompatible versions, and undeclared
   capability use fail closed before partial activation;
5. disabling or upgrading a dependency atomically suspends affected dependents
   or requires an explicit user-approved cascade;
6. derived output records its own package/definition identity and the exact
   upstream evidence revisions it consumed;
7. no-future and replay-visible provenance remain transitive across the graph;
8. disposal runs in reverse dependency order and leaves no listeners, tasks,
   workers, projections, drafts, or leases behind.

Examples include:

| Foundation | Possible derivatives |
| --- | --- |
| FVG | mitigation tracker, fill statistics, displacement filter, OB/FVG confluence, detector suggestions |
| MA/SMA | crossover detector, ribbon, trend regime, slope statistics |
| BSL/SSL | swing selector, sweep detector, liquidity map, Setup evidence |
| Fibonacci | automatic swing Fib, OTE interpretation, confluence map, target planner |

A derivative may be first-party Core, first-party optional, or Community. Its
trust/distribution tier is independent of the tier of its dependencies.

## Plugin Center Product Contract

The eventual Plugin Center is a host-rendered V7 surface. Plugins do not supply
arbitrary settings DOM or control the Center. The information architecture
should contain:

- **Core** — built-in first-party plugins, their purpose, versions,
  dependencies, status, settings, and enable/disable controls;
- **Community** — searchable registry entries with install action, publisher,
  trust, permissions, compatibility, evidence, and update information;
- **Installed** — active, disabled, suspended, incompatible, quarantined, and
  errored packages from all non-Kernel tiers;
- **Updates** — explicit compatible updates, release notes, permission deltas,
  dependency impact, and rollback state;
- **Install from file** — a later local/offline package path using the same
  manifest, validation, transaction, and lifecycle as registry installation.

Each detail view must disclose at least package id/version, publisher, source,
integrity/signature state, distribution/trust tier, host API range, supplied
and required capabilities, permissions, resource budgets, settings, data
retention, dependents, diagnostics, and compatibility status.

Core Plugins are preinstalled and ordinarily enabled by the product profile.
They can be disabled when the dependency graph permits it but cannot normally
be uninstalled. Community Plugins require explicit installation and enablement.
Updates are user-visible and manual by default until V7 separately accepts a
safe update policy. An update that adds permissions or breaks a dependency is
never silently activated.

Disable and uninstall are distinct:

- disable stops execution and removes live contributions while preserving
  package bytes, settings, and host-owned historical records;
- uninstall removes executable/package bytes after dependency review while
  retaining or explicitly exporting/quarantining durable user evidence;
- reinstalling a compatible package may resolve historical records without
  rewriting their accepted revisions.

One safe/restricted-mode action must start V7 while ignoring Community Plugin
execution and retaining diagnostic access and user data. Core Plugins may be
individually disabled; Kernel remains active.

## Trust, Permissions, And Execution Tiers

V7 adopts the discoverability and management clarity of Obsidian's Core/
Community model, not Obsidian's application-level privilege model. Trading
plugins process replay-sensitive market data and can corrupt evidence or leak
private records even without changing candles. Community code therefore never
inherits unrestricted application filesystem, network, DOM, or native-runtime
access merely because the user clicked Install.

The staged execution tiers are:

1. **host-rendered declarative contributions** — schemas, definitions,
   expressions in an accepted bounded language, projection descriptions, and
   settings; the safest default for Community Plugins;
2. **isolated calculation workers** — separately authorized JavaScript/WASM
   workers with immutable inputs, cancellation, CPU/memory/output budgets,
   deterministic fixtures where applicable, and no owner handles;
3. **privileged adapters** — data connectors, native renderers, file/network
   integrations, or other elevated capabilities; first-party or separately
   reviewed only and never the default community tier.

Ordinary plugins receive no raw Chart/Series/Canvas/DOM object, Bar Data
requester/cache, Replay writer, Workspace writer, Annotation repository,
database handle, arbitrary filesystem path, credential store, or network
client. The host mediates every declared capability, scopes it to the active
Session/Pane/cutoff, and attributes errors/resource use to the package.

Permissions are explicit, minimal, versioned, user-visible, and deny-by-
default. A permission increase is an installation decision, not a routine
patch update.

## Manifest Evolution Requirements

The future package manifest must evolve beyond the current trusted-build
semantic manifest. Without freezing field spellings prematurely, it must
represent:

- stable package id/version, publisher, license, integrity, and signature;
- host API compatibility and package-format version;
- distribution/trust tier and update source;
- `provides`, `requires`, and `extends` capability relationships;
- contribution descriptors and host-rendered settings schema;
- explicit permissions and execution tier;
- CPU, memory, output, task, and storage budgets;
- durable schema versions, migrations, downgrade/quarantine behavior, and data
  retention policy;
- independent conformance Harness identity and applicable no-future guarantees.

Install and upgrade are atomic host transactions: validate package and
integrity, resolve compatibility/dependencies/permissions, stage migrations,
start the candidate generation, then publish it. Failure rolls back to the
previous compatible generation or leaves the package disabled/quarantined with
diagnostics. Half-installed capabilities are forbidden.

## R13 And Delivery-Plan Consequences

### R13.10c

R13.10c remains accepted and closed. `optional.semantic-fair-value-gap` is now
classified product-wise as the first Core FVG Plugin implementation slice. Its
existing module `kind: "optional"`, trusted-build composition, strict
definition, durable unresolved behavior, and host-owned projection path are
consistent with this specification. No retrofit enters the accepted commit.

### R13.10d — Evidence Inspector And Validated Overrides

R13.10d remains a separately bounded slice requiring explicit authorization.
Its future specification must:

- render package/type/definition identity, exact Bar evidence, baseline values,
  effective values, and value sources through the host-owned Inspector;
- validate overrides through the active Core FVG Plugin policy and preserve
  baseline plus override provenance rather than editing derived truth in place;
- use host-rendered schemas and commands rather than FVG-owned DOM or store
  writes;
- avoid Plugin Center, installation, detector, and production-workflow scope.

### R13.10e — Production Manual FVG Workflow Closure

R13.10e remains the separately bounded production composition of accepted Bar
selection, Evidence resolution, FVG construction, Inspector behavior, and
Chart projection. Its future specification must treat FVG as a discoverable
built-in first-party plugin contribution and avoid product-route branches by
semantic id. It may add only the package metadata/control surface needed for
that closed workflow. It must not absorb a general Plugin Center, dynamic
loader, Community registry, or SDK.

### R13.11–R13.13

- R13.11 EQL/EQH and R13.12 OB/Breaker remain first-party Core Plugin
  candidates because they extend the flagship SMC/ICT baseline through the
  same public package boundary;
- any detailed definition still requires versioned semantics and focused
  evidence; Core status does not waive disagreement or no-future review;
- R13.13 detector suggestions become the first explicit proof that a derived
  plugin can require Core semantic capabilities while preserving distinct
  `suggested` provenance and zero direct owner authority.

These R13 steps remain independently authorized. This decision neither
renumbers them nor starts them.

### Plugin Platform Program — Specified, Unscheduled

After the manual semantic chain is complete and multiple packages have proven
the public boundaries, later delivery proceeds in separate phases:

1. **P0 Core Plugin Catalog/Center** — host-rendered catalog, status,
   dependencies, settings, diagnostics, and enable/disable over trusted-build
   packages only; no external installation or arbitrary code;
2. **P1 Local Declarative Packages** — common manifest/archive, transactional
   install-from-file, integrity checks, migrations, uninstall/data survival,
   and developer conformance tooling, initially without arbitrary JavaScript;
3. **P2 Signed Free Community Registry** — discovery, review metadata,
   signatures, explicit updates, restricted mode, incident response, and the
   same package lifecycle as local installation;
4. **P3 Isolated Calculation Extensions** — separately authorized Worker/WASM
   tier with permissions and measured resource/failure boundaries;
5. **P4 Commercial Marketplace** — a distinct product/business decision only
   after the free ecosystem, security operations, developer demand, support
   load, licensing, and sustainable economics are evidenced.

No P-phase receives an R delivery id until separately specified and accepted.
Local installation and a free registry must work before any paid Marketplace
decision; payment is not an architectural prerequisite for plugins.

## Chosen And Rejected Alternatives

Chosen:

- Core/Community as a product management and trust taxonomy;
- Kernel separate from both plugin tiers;
- built-in first-party foundations with versioned definitions;
- host-mediated derivation and declarative contributions;
- Plugin Center before arbitrary community code;
- local/declarative and free-registry capability before paid distribution.

Rejected:

- hard-coding FVG, BSL, MA, SMA, or Fib branches into Chart, Replay, Bar Data,
  Workspace, or generic Annotation owners;
- treating every familiar trading concept as consensus Core without a frozen
  definition and maintenance commitment;
- direct plugin-to-plugin imports/control;
- equating install consent with unrestricted application privileges;
- shipping a Marketplace as the first plugin milestone;
- deleting historical user evidence when a package is disabled or removed.

## Acceptance Record

On 2026-08-10, after accepting R13.10c, the product owner directed V7 to record
the prior Core/Community discussion as a specification and adjust R13.10 or
later planning around it. The product owner explicitly classified common
foundations including FVG, MA/SMA, BSL, and Fibonacci as Core Plugins and
accepted that other plugins may derive from them.

This closes the classification/product-direction decision. Delivery remains
bounded by the authorization boundary above.

## Reference Product Evidence

Obsidian is a product-interaction reference, not a security contract:

- Community Plugins document Browse, Install, Enable/Disable, Update,
  Uninstall, settings, and manual update behavior:
  <https://github.com/obsidianmd/obsidian-help/blob/master/en/Extending%20Obsidian/Community%20plugins.md>
- Plugin Security documents Restricted Mode and the broad application
  privileges inherited by installed plugins, which V7 deliberately does not
  copy:
  <https://github.com/obsidianmd/obsidian-help/blob/master/en/Extending%20Obsidian/Plugin%20security.md>
- Obsidian's manifest reference and public release directory demonstrate
  stable package metadata and a discoverable registry:
  <https://docs.obsidian.md/Reference/Manifest>
  and <https://github.com/obsidianmd/obsidian-releases>.

The broader rendering, plugin-platform, lifecycle, permission, performance,
distribution, and commercialization evidence remains preserved in
`V7_GENERAL_FUTURES_PLUGIN_PLATFORM_PREDECISION_MEMO.md`.
