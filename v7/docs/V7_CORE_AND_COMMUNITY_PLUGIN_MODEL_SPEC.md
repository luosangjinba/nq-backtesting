# V7 Core And Community Plugin Model — Accepted Specification

Decision id: `ADR-V7-004`

Status: accepted binding product and architecture specification; P0b accepted;
P1a specified pending review; P1–P4 implementation not allocated

Decision date: 2026-08-10

Amended: 2026-08-10 — installation/developer channels, host-rendered parameter
surfaces, one executable authoring language, and platform-first delivery order

Amended: 2026-08-11 — Agent-native developer Harness/MCP and assisted Pine
indicator migration

Amended: 2026-08-11 — P0b trusted-build Core Center generation/profile
contract specified, implemented, and accepted

Amended: 2026-08-11 — P1a Agent-native Developer Kit contract specified;
implementation remains pending review and separate authorization

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
- every plugin uses one host-defined manifest, contribution, settings, and
  lifecycle boundary regardless of whether it is built in, loaded locally, or
  obtained from a Community registry;
- other plugins may derive from Core Plugin capabilities through declared,
  versioned dependencies rather than private imports or direct feature-to-
  feature control;
- executable plugin authors use strict TypeScript through one public SDK;
  packages carry compiled ES modules, while manifests and declarative
  contributions use versioned JSON schemas;
- plugin development must be completely operable by an AI coding agent through
  machine-readable contracts, a deterministic conformance Harness, and a local
  MCP adapter over the same authoring operations;
- a later assisted Pine Script migration path may analyze supported indicator
  source and generate a TypeScript plugin plus evidence, but Pine never becomes
  a V7 runtime language or an equivalence claim without conformance and human
  review.

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
  isolated Worker execution;
- an Agent developer kit, authoring Harness/CLI, MCP server, Pine parser,
  translator, compatibility service, or generated plugin;
- network access, a remote registry, signing service, update service, account,
  entitlement, payment, or paid Marketplace;
- a general-futures product-scope change;
- implementation of MA/SMA, Fibonacci, a detector, Setup workflow, AI
  capability, or a new R13 delivery slice;
- expansion of R13.10c after its accepted closure;
- replacement or duplication of Session, Replay, Bar Data, Chart, Annotation,
  Workspace Transaction, persistence, or ModuleHost ownership.

The original decision did not authorize P0a or R13.10e; each was later
separately specified, implemented, and accepted. The Agent-native amendment
froze future Developer Kit/MCP/Pine contracts and order without authorizing
P0b. P0b was later separately specified in
`V7_CORE_PLUGIN_CENTER_P0B.md`, explicitly authorized, and implemented. H115's
automated and corrected focused human gates are accepted. P1a specification
design was later separately authorized and is proposed in
`V7_AGENT_NATIVE_PLUGIN_DEVELOPER_KIT_P1A.md`; H116 remains declared and no
P1a implementation or P1b–P4 phase is authorized.

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

## Unified Authoring Language And Package Artifact

V7 will expose one executable plugin authoring language, not a different
runtime stack for each plugin category:

1. **Strict TypeScript** is the sole supported executable authoring language
   for the initial public Plugin SDK and for new or migrated Core and Community
   Plugin implementations.
2. V7 never executes TypeScript source directly. The supported build produces
   pinned ES2022 ESM JavaScript artifacts. Trusted Core output may be included
   in the first-party application build; externally installed executable output
   may run only in the separately authorized isolated Worker tier. Neither is a
   Node.js module or receives Node built-ins.
3. `JSON` plus versioned `JSON Schema` is the wire format for manifests,
   declarative definitions, settings, UI hints, migrations, and conformance
   fixtures. JSON is data, not a second executable plugin language.
4. Plugins do not ship executable HTML, arbitrary settings DOM, or unrestricted
   CSS. They declare controls and style tokens; the host renders the surface.
5. Python and Pine Script are not V7 runtime languages. The accepted future
   Pine migration contract below is an ingestion/developer tool which records
   source/provenance and emits a normal TypeScript V7 contribution; it never
   executes Pine inside the workstation.
6. Rust/WASM is not part of the initial public SDK. A later measured compute
   tier may reconsider WASM behind the same immutable capability API, but it
   must not force ordinary plugin authors or the host to support two public
   programming models.

The existing trusted-build JavaScript semantic packages are compatible
predecessors. V7 need not migrate the whole host to TypeScript before P0a; each
package can be adapted or ported when it crosses the common plugin boundary.
Core and Community packages nevertheless target the same SDK types and wire
contracts. Distribution tier changes trust and execution policy, not the
programming model.

## Agent-Native Plugin Developer Contract

“An AI agent can write a complete plugin” is a product requirement, not a claim
that generated code is automatically correct. For every contribution tier that
V7 authorizes, an agent must be able to discover the contract, scaffold a
package, edit it, validate it, execute its applicable tests, inspect precise
diagnostics, produce an install candidate, and obtain a machine-readable
receipt without an undocumented GUI-only step.

The future Plugin Developer Kit therefore has one canonical headless domain
surface with all of the following:

1. versioned TypeScript SDK types, JSON Schemas, capability/dependency and
   permission catalogs, supported UI-control metadata, compatibility ranges,
   examples, and stable diagnostic codes;
2. deterministic scaffold, validate, build, test, preview, pack, and candidate-
   inspection operations, exposed first through a local CLI/library;
3. a conformance Harness that owns fixtures, negative controls, golden vectors,
   test isolation, reproducible seeds/time, and structured pass/fail receipts;
4. a headless host simulator which supplies immutable canonical Bars, Session
   Hours/timezone, timeframe, Replay cutoff, Pane, settings, and lifecycle
   inputs through the same public shapes, without becoming another runtime
   owner;
5. reference Core and Community packages small enough for an agent to inspect,
   including at least one overlay, one sub-Pane indicator, one semantic tool,
   and one derived dependency when those tiers are authorized;
6. a compatibility report that distinguishes errors, unsupported capabilities,
   permission increases, human-review requirements, and safe automated fixes;
7. a package provenance record containing SDK/build versions, source and
   artifact hashes, requested capabilities, executed Harness identities, and
   the exact generated receipt.

The same command must produce the same normalized result whether called by a
human, CI, an AI agent, the Plugin Center, or MCP. Human-readable text may be
added, but it cannot replace the stable JSON result. The CLI/library and
Harness are authoritative; the MCP server is a thin local adapter over those
operations, not a second validator, package format, build system, or lifecycle
owner.

P1a realizes the authoring/evidence subset of this final workflow. Before P1b
defines an install archive and candidate transaction, `pack` emits only a
non-installable developer evidence bundle and every receipt denies activation.
The Developer Kit must report install-candidate creation unavailable rather
than treating P1a evidence as user consent or installed-package trust.

The MCP surface must provide machine-readable SDK/schema/capability discovery
and the bounded authoring operations above. It must be local-first, restricted
to an explicitly selected plugin workspace, and deny arbitrary shell,
filesystem, credential, database, Chart, Replay, Bar Data, Annotation-store,
DOM, and network access. Plugin source, README text, diagnostics, and migration
input are untrusted data and can never grant the agent or MCP new authority.
Install, enable, update, publish, permission expansion, signing, and removal are
separate state-changing operations routed through the common candidate
transaction and explicit user approval; MCP cannot silently activate or
publish a package.

The conformance Harness grows with the contribution tier. Applicable gates
include:

- manifest, schema, contribution, dependency, compatibility, permission, and
  package-integrity validation;
- pinned TypeScript compilation and forbidden-import/runtime-capability checks;
- deterministic calculation vectors, `na`/missing-data behavior, warm-up,
  incremental versus full recomputation, and stable output identity;
- no-future/lookahead, confirmed-Bar, Replay cutoff, stale generation, race,
  cancellation, rollback, and repaint classification;
- activation/disposal, dependency suspension, upgrade/downgrade migration,
  uninstall/data-survival, and leak checks through ModuleHost;
- CPU, memory, output, task, storage, and timeout budgets for an authorized
  Worker tier;
- host-rendered Inputs/Style/Visibility accessibility and visual fixtures,
  native Chart behavior, multi-Pane mapping, and zero direct owner writes;
- provenance and differential/golden evidence sufficient for a reviewer to
  reproduce the claimed behavior.

Automation may make a package conformant, but it does not waive required human
review for visible behavior, disputed market semantics, permissions, or a Pine
migration's semantic equivalence.

## Assisted Pine Script Indicator Migration Contract

Pine Script is an ingestion source, not a second supported plugin language.
The supported outcome is a normal strict-TypeScript V7 package, compiled by the
pinned SDK build and carrying the same manifest, settings, permissions,
Harnesses, provenance, and runtime restrictions as a hand-authored plugin.

Migration is a staged, inspectable workflow rather than an opaque LLM rewrite:

1. accept only source the user is entitled to inspect and migrate; record the
   exact source hash, declared Pine version, author/license assertion, and
   migration-tool/model versions;
2. parse and statically inventory the script before generation, classifying
   script kind, inputs, series/history state, built-ins, imported libraries,
   timeframes/symbols, Session/timezone and gaps/alignment rules, `request.*()`
   calls, plots/drawings and offsets, alerts, strategies, realtime behavior,
   lookahead, and known repaint risks;
3. compare that inventory to a versioned Pine compatibility matrix and emit
   `supported`, `requires-human-choice`, `semantically-risky`, or `unsupported`
   findings with source locations; unsupported constructs never disappear
   silently;
4. generate TypeScript source, manifest/contribution metadata, JSON-schema
   Inputs/Style/Visibility controls, required permissions, fixtures, golden or
   differential tests, and a human-readable migration report;
5. run the ordinary build and conformance Harness, then require explicit human
   review of every unresolved mapping and of visible/semantic equivalence;
6. package or install only through the same candidate pipeline used by native
   V7 plugins.

The first supported profile targets indicators, not strategies or broker
emulation. Straightforward mappings may include Pine `input.*()` to host-
rendered Inputs, OHLCV/time/history series and a documented `ta.*()` subset to
SDK calculations, and supported plots/styles to declarative Chart outputs.
Persistent `var` state, `na` propagation, local-scope history, realtime
rollback, drawings, tables, alerts, imported libraries, dynamic requests, and
other-timeframe or other-symbol data require explicit compatibility rules.

The following fail closed unless a later contract supplies an exact equivalent:

- `strategy()` orders, fills, broker-emulator state, Deep Backtesting, or other
  execution/simulation behavior outside V7's accepted product boundary;
- future-leaking lookahead, evidence-displacing plot/series offsets, or repaint-
  dependent logic that violates V7 Replay/no-future truth;
- `request.*()` or multi-context semantics without an authorized host-mediated
  dataset capability, exact cutoff alignment, and provenance;
- realtime tick/rollback or intrabar assumptions that minute-sourced historical
  Replay cannot reproduce;
- platform-only drawing/table/UI behavior, alerts, external data, protected
  libraries, or resource behavior for which the SDK has no bounded contract.

V7 does not claim to embed or reproduce TradingView's proprietary Pine runtime.
Differential evidence comes from user-authorized bars plus expected series,
events, screenshots, or other exported vectors. Absence of such evidence is
reported as an equivalence gap, never converted into a success claim. Generated
code retains a traceable source-to-target mapping so an agent and human can
review every approximation.

The compatibility model is grounded in Pine's documented bar-by-bar and
realtime rollback execution, repainting behavior, other-timeframe/data request
semantics, strategy broker model, and resource limits:

- <https://www.tradingview.com/pine-script-docs/language/execution-model/>
- <https://www.tradingview.com/pine-script-docs/concepts/repainting/>
- <https://www.tradingview.com/pine-script-docs/concepts/other-timeframes-and-data/>
- <https://www.tradingview.com/pine-script-docs/concepts/strategies/>
- <https://www.tradingview.com/pine-script-docs/writing/limitations/>

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

Developer Mode additionally provides Chrome-like **Load unpacked**, **Reload**,
and **Validate/Pack** actions for an explicit local package directory. An
unpacked package is a development generation, is visibly marked, never
auto-updates, cannot masquerade as a signed registry release, and is disabled
outside Developer Mode. “Pack” here means producing a validated installable
archive; it is distinct from the curated product **pack** defined earlier.

Built-in Core metadata, a registry artifact, a local archive, and an unpacked
directory are different sources for one candidate pipeline, not four plugin
APIs. The host must:

1. resolve a candidate without executing it;
2. validate package format, manifest, compatibility, integrity/source, and
   contribution schemas;
3. resolve dependencies, permissions, migrations, and resource policy;
4. stage the candidate generation and request activation through the existing
   ModuleHost lifecycle owner;
5. publish atomically, or leave it disabled/quarantined and retain the previous
   compatible generation.

The package/catalog surface never becomes a second lifecycle owner. It stages
and reports candidates; ModuleHost remains the sole activation/disposal owner,
and domain contribution registries remain the validators for their public
contracts.

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

## Host-Rendered Parameters And Settings

V7 adopts the consistency of TradingView-style indicator dialogs without
allowing plugins to own dialog DOM. A contribution supplies a versioned
parameter schema and optional host-supported UI hints. The host supplies one
shell and renders only applicable tabs:

- **Inputs** — calculation, definition, or behavior parameters;
- **Style** — host-supported projection/series appearance and design tokens;
- **Visibility** — timeframe, Session, Pane, and other bounded visibility
  rules;
- **Evidence / History** — host-owned provenance, immutable baseline, validated
  semantic override, and accepted-revision history when the contribution
  creates evidence-grade Artifacts.

Empty tabs are omitted, but tab meaning, controls, keyboard behavior,
validation presentation, accessibility, Apply/Cancel/Reset semantics, and
dirty-state handling are host-owned and consistent. A plugin may expose a pure
validator through a declared capability; it may not mutate a store, Chart, or
DOM from validation.

Settings have three explicit scopes:

1. **package scope** — package-wide user configuration; host-owned trust,
   permission, update, and data-retention policy remains management metadata,
   not a plugin-mutated setting;
2. **profile/default scope** — defaults for future contribution instances in a
   workstation or named profile;
3. **instance scope** — settings for one indicator, drawing, semantic Artifact,
   or workflow instance.

Where a field supports all scopes, instance overrides profile/default, which
overrides the definition default. The host computes and discloses the effective
value and its source. Package upgrades migrate each scope transactionally.
Definition baselines and accepted evidence are not ordinary settings: changing
an FVG price in the Inspector remains an append-only validated Artifact
override with provenance, not a hidden package-setting mutation.

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
2. **isolated calculation workers** — separately authorized SDK-built
   TypeScript-to-ESM workers with immutable inputs, cancellation,
   CPU/memory/output budgets, deterministic fixtures where applicable, and no
   owner handles;
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
- an optional ESM worker entrypoint produced by the pinned TypeScript SDK build
  profile, with no source-language or module-system negotiation;
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

R13.10d is accepted and closed under H112. Its accepted contract and
implementation do the following:

- render package/type/definition identity, exact Bar evidence, baseline values,
  effective values, and value sources through the host-owned Inspector;
- validate overrides through the active Core FVG Plugin policy and preserve
  baseline plus override provenance rather than editing derived truth in place;
- use host-rendered schemas and commands rather than FVG-owned DOM or store
  writes;
- avoid Plugin Center, installation, detector, and production-workflow scope.

The accepted preview behavior is one effective Preview FVG while editing,
followed by one accepted projection after Apply or the original accepted
projection after Cancel. Retaining two simultaneously visible FVG rectangles
would not be accepted behavior.

### R13.10e — Production Manual FVG Workflow Closure

R13.10e is accepted as the separately bounded production composition of Bar
selection, Evidence resolution, FVG construction, Inspector behavior, and
Chart projection. It treats FVG as a discoverable built-in first-party plugin
contribution and avoids product-route branches by semantic id. It is the first
production vertical slice through the minimum P0a manifest/contribution/
settings bridge and added only the generic substrate and package metadata/
control surface needed for that closed workflow. It did not absorb the visual
Core Center, dynamic loader, Community registry, or public SDK.

### R13.11–R13.13

- R13.11 EQL/EQH and R13.12 OB/Breaker remain first-party Core Plugin
  candidates because they extend the flagship SMC/ICT baseline through the
  same public package boundary;
- any detailed definition still requires versioned semantics and focused
  evidence; Core status does not waive disagreement or no-future review;
- R13.13 detector suggestions become the first explicit proof that a derived
  plugin can require Core semantic capabilities while preserving distinct
  `suggested` provenance and zero direct owner authority.

These R13 steps require independent authorization. This decision neither
renumbers them nor starts them.

### Plugin Platform Program — P1a Specified, Pending Review

V7 does not finish a speculative Marketplace before writing plugins, and it no
longer scales plugin families before a common platform boundary exists. The
order is a thin platform first, validated by real reference plugins, followed
by progressively broader distribution:

1. **P0a Plugin Contract Substrate** — versioned manifest and contribution
   descriptors, built-in-package adapter, dependency/status model, the common
   host-rendered parameter schema, and activation/disposal through ModuleHost.
   Existing FVG is the first conformance package; no external installation,
   visual Plugin Center, or arbitrary code enters this slice.
2. **R13.10e Reference Vertical Slice — accepted** — the production manual FVG
   workflow closes through P0a rather than a route-specific FVG branch. This
   validates the thin waist before MA/SMA, Fibonacci, or another plugin family
   scales it.
3. **P0b Core Plugin Center — accepted** —
   host-rendered Core catalog, two-dimensional runtime/pending status,
   dependencies, package/default settings, diagnostics, and restart-bound
   enable/disable over trusted-build packages only. One durable active/pending
   Core profile selects one immutable ModuleHost generation; failed candidates
   fully roll back before last-known-good or Kernel-safe fallback. Binding
   contract: `V7_CORE_PLUGIN_CENTER_P0B.md`.
4. **P1a Agent-Native Plugin Developer Kit — specified, pending review** — one
   versioned strict-TypeScript SDK and machine-readable contract bundle, one
   deterministic CLI/library operation engine and conformance Harness,
   immutable synthetic-host fixtures, reference workspaces, structured
   diagnostics/receipts, and a non-installable developer evidence bundle. It
   supports only contribution profiles authorized at that point and does not
   authorize production external-code execution. Binding proposed contract:
   `V7_AGENT_NATIVE_PLUGIN_DEVELOPER_KIT_P1A.md`.
5. **P1b Local Packages And Authoring MCP** — common manifest/archive,
   transactional install-from-file, Developer Mode load-unpacked/reload/
   validate-pack, integrity/source disclosure, migrations, uninstall/data
   survival, restricted-mode startup, and a workspace-bounded local MCP adapter
   over the P1a operations. Executable workers remain disabled.
6. **P2 Signed Free Community Registry** — discovery, review metadata,
   signatures, explicit updates, restricted mode, incident response, and the
   same package lifecycle as local installation.
7. **P3a Isolated Calculation Extensions** — separately authorized
   TypeScript-to-ESM Worker tier with permissions and measured
   CPU/memory/output/failure boundaries. WASM remains a later separate
   reconsideration rather than a second initial SDK language.
8. **P3b Pine Indicator Migration Assistant** — source/version inventory,
   compatibility analysis, TypeScript/package/test generation, differential
   evidence, ordinary conformance, and explicit human review. Analysis-only
   prototypes may occur earlier, but supported end-to-end migration cannot be
   accepted before the target SDK contribution and execution tiers exist.
9. **P4 Commercial Marketplace** — a distinct product/business decision only
   after the free ecosystem, security operations, developer demand, support
   load, licensing, and sustainable economics are evidenced.

P0a and R13.10e were separately authorized and accepted. P0b was separately
specified, implemented, corrected after focused visual feedback, and accepted
under H115. P1a specification design was separately authorized; its proposed
contract declares H116 but adds no implementation, install path, MCP, or
production execution.
No P1–P4 implementation is authorized until its contract is accepted and the
product owner gives a separate implementation instruction.
R13.10e retains its existing identity as the first reference consumer after
P0a. Local installation and a free registry must work before any paid
Marketplace decision; payment is not an architectural prerequisite for
plugins.

## Chosen And Rejected Alternatives

Chosen:

- Core/Community as a product management and trust taxonomy;
- Kernel separate from both plugin tiers;
- built-in first-party foundations with versioned definitions;
- host-mediated derivation and declarative contributions;
- Plugin Center before arbitrary community code;
- one strict TypeScript SDK and host-rendered JSON-schema UI rather than
  per-plugin languages or DOM;
- a deterministic, machine-readable Agent authoring Harness first, with MCP as
  a thin adapter over the same operations rather than an alternate toolchain;
- Pine indicator migration into ordinary TypeScript packages after the target
  SDK/runtime contract exists, with explicit compatibility gaps and human
  equivalence review;
- thin contract substrate before additional plugin families, validated by FVG
  before the catalog/distribution surface expands;
- local/declarative and free-registry capability before paid distribution.

Rejected:

- hard-coding FVG, BSL, MA, SMA, or Fib branches into Chart, Replay, Bar Data,
  Workspace, or generic Annotation owners;
- treating every familiar trading concept as consensus Core without a frozen
  definition and maintenance commitment;
- direct plugin-to-plugin imports/control;
- equating install consent with unrestricted application privileges;
- supporting Python, Pine, JavaScript, Rust/WASM, and custom web UIs as parallel
  initial plugin programming models;
- using LLM text generation as the validator, silently approximating unsupported
  Pine behavior, or embedding Pine as another workstation runtime;
- finishing a registry/Marketplace in isolation before a reference plugin
  proves the manifest, settings, lifecycle, and contribution boundaries;
- shipping a Marketplace as the first plugin milestone;
- deleting historical user evidence when a package is disabled or removed.

## Acceptance Record

On 2026-08-10, after accepting R13.10c, the product owner directed V7 to record
the prior Core/Community discussion as a specification and adjust R13.10 or
later planning around it. The product owner explicitly classified common
foundations including FVG, MA/SMA, BSL, and Fibonacci as Core Plugins and
accepted that other plugins may derive from them.

Later on 2026-08-10, the product owner supplied Chrome extension, Obsidian Core/
Community Plugin, and TradingView parameter-panel references and directed the
specification to settle installation channels, the plugin-bearing interface,
delivery order, and a unified language. The accepted amendment binds one
host-rendered management/settings surface, registry/file/unpacked sources over
one candidate pipeline, strict TypeScript as the executable authoring language,
and a P0a-thin-platform/FVG-reference sequence before further plugin families.

On 2026-08-11, after accepting R13.10e/H114, the product owner required future
plugin development to be completely operable by AI coding agents through a V7-
provided Harness and MCP, and required an AI-assisted path for migrating Pine
indicator source into plugins. This amendment accepts those outcomes and their
ordering: one deterministic Agent-native Developer Kit is canonical; MCP is a
bounded adapter over it; and Pine migration emits the same strict-TypeScript
package and evidence as native authoring after the target runtime exists.

Later on 2026-08-11, the product owner authorized the exact next planning step.
P0b was separately specified, reviewed, explicitly authorized, and implemented.
It uses restart-bound single-ModuleHost generations, one active/pending durable
Core profile, explicit dependency-impact confirmation, host-rendered Core-only
management/settings, settled rollback before fallback, and byte-preserving
disable/re-enable. H115 passes its automated evidence. Focused human review
then found and closed the Settings footer containment defect, and the corrected
P0b surface was accepted on 2026-08-11.

After P0b acceptance, the product owner authorized P1a Developer Kit
**specification design**. `V7_AGENT_NATIVE_PLUGIN_DEVELOPER_KIT_P1A.md` now
proposes one canonical Agent-native strict-TypeScript operation engine,
immutable synthetic-host testing, a non-installable developer evidence bundle,
structured diagnostics/provenance, and H116. It remains pending review and
does not authorize implementation, P1b MCP/install, or external production
execution.

This closes the classification/product-direction decision. Delivery remains
bounded by the authorization boundary above.

Amendment evidence:
`../sessions/session_20260811_plugin_agent_authoring_pine_migration_amendment.md`,
`../sessions/session_20260811_p0b_core_plugin_center_specification.md`,
`../sessions/session_20260811_p0b_core_plugin_center_implementation.md`, and
`../sessions/session_20260811_p1a_agent_native_developer_kit_specification.md`.

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
