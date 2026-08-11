# Session — P0b Trusted-Build Core Plugin Center Specification

Date: 2026-08-11

Status: specification completed; pending review; implementation not authorized;
H115 declared

## Request

After the post-R13.10e stage audit, the product owner directed execution of the
exact next step. The audit had bounded that step to P0b specification rather
than implementation.

## Outcome

`docs/V7_CORE_PLUGIN_CENTER_P0B.md` now freezes the first visible trusted-build
Core Plugin management slice. It adds no runtime code or changed pixel.

The contract chooses:

- one host-rendered **Core Plugins** Settings destination generated only from
  validated built-in manifests present in the current build;
- one non-removable Core profile owner for active/pending enablement and
  package/profile defaults;
- explicit restart-bound changes instead of live hot-plug;
- one immutable definition generation and the existing ModuleHost as sole
  construction/start/stop/disposal owner;
- an exact dependency-impact preparation plus explicit cascade confirmation;
- separate per-package runtime and pending-change dimensions;
- fully settled failed-candidate rollback before last-known-good or
  Kernel-safe fallback, with no concurrent production hosts;
- byte-preserving disable/re-enable for Annotation and other host-owned
  evidence;
- H115 automated, browser, architecture, recovery, accessibility, and focused
  human visual requirements.

The current machine step remains R13.10e. H115 is `declared`, with no Harness,
negative fixture, acceptance evidence, or premature implementation claim.

## Owner Decisions

P0b does not create a `PluginHost`.

```text
core.plugin-contract
  pure manifest/profile/status/impact/boot-selection contracts

core.plugin-profile
  future sole durable active/pending Core profile writer

adapter.plugin-center-ui
  future DOM-only catalog/detail/settings controller

application composition
  future read-only boot selection plus bounded restart/fallback orchestration

core.module-host
  unchanged sole module lifecycle and rollback owner per generation
```

The pre-boot profile read cannot write or repair storage. Candidate promotion,
discard, reset, and failure diagnostics must go through the hosted profile
owner after an application generation reaches ready. UI stages intent and
requests restart through commands; it never controls a package or ModuleHost.

## Status And Transaction Decisions

One status enum could not accurately express restart-bound behavior. The
contract therefore separates:

- runtime: active, disabled, suspended, incompatible, failed, or
  recovery-disabled;
- pending change: clean, pending-enable, pending-disable, pending-settings, or
  pending-dependency-cascade.

Staging a toggle cannot claim the running plugin has stopped. The active
profile remains the last-known-good generation, while one complete pending
candidate carries an exact attempt id and base revision. Successful root-ready
evidence promotes it. Failure rolls it back and starts prior active or
Kernel-safe definitions only after the failed ModuleHost has disposed.

## Settings Decision

P0b persists only trusted-build Core package/profile scopes through validated
P0a parameter schemas. Instance settings, Semantic Artifact overrides,
Evidence, and History retain their existing owners. Every P0b setting applies
after restart; no second live settings pipeline is introduced.

The P0b profile is device-local and excluded from Server State Sync. Otherwise
the existing post-host remote hydration could replace boot selection after a
ModuleHost graph already runs, and later devices may not share installed
package availability. Cross-device plugin-profile behavior remains a separate
future contract.

The real FVG manifest currently has no editable package/profile field, so the
production Center must show an honest empty state. Generic settings rendering
is proven with synthetic H115 packages rather than inert FVG controls.

## External Capability Check

The repository-required external check was repeated on 2026-08-11. Official
Lightweight Charts 5.2 documentation confirms that its plugin types are Custom
Series and Series/Pane Primitives and that Primitive lifecycle exposes direct
Chart/Series handles and Canvas renderers. Official plugin examples are
proof-of-concept rendering scaffolds. The awesome-tradingview list links those
examples and a small community ecosystem but supplies no package-management,
dependency, profile, settings-host, or recovery layer.

P0b therefore adds no upstream runtime dependency and continues to hide vendor
objects behind V7 Chart-owned adapters.

References:

- <https://tradingview.github.io/lightweight-charts/docs/plugins/intro>
- <https://tradingview.github.io/lightweight-charts/docs/plugins/series-primitives>
- <https://github.com/tradingview/lightweight-charts/tree/master/plugin-examples>
- <https://github.com/tradingview/awesome-tradingview>

The Agent Reach Exa route still returned 401 because `EXA_API_KEY` is absent,
and GitHub CLI was not authenticated. Agent Reach's Jina Reader fallback read
the public official pages successfully. This does not block the contract and
requires no user action unless Exa or authenticated GitHub search is desired.

## Source-Growth Constraint

The preceding audit found these canonical effective-line hotspots:

- Annotation interaction port: 450/450 adapter ceiling;
- production manual Annotation workflow: 250/250 composition ceiling;
- Semantic Registry: 398/400 runtime ceiling.

P0b therefore requires focused new modules and a workflow split before any
catalog generalization touches the production manual composition. It may not
append more behavior to the interaction port or Semantic Registry.

## Documentation And Governance Updated

- `docs/V7_CORE_PLUGIN_CENTER_P0B.md`;
- `docs/V7_CORE_AND_COMMUNITY_PLUGIN_MODEL_SPEC.md`;
- `docs/V7_PRODUCT_AND_SCOPE.md`;
- `docs/V7_ARCHITECTURE.md`;
- `docs/V7_EXECUTION_ROADMAP.md`;
- `docs/V7_RESTART_HANDOFF.md`;
- `docs/INDEX.md`;
- `docs/v7-harness-rules.json`;
- `TODO.md`;
- this session record.

## Scope Kept Closed

No production module, Core profile record, settings control, Plugin Center DOM,
reload/fallback behavior, Harness fixture, visual baseline, loader, archive,
Developer Mode, Community registry, SDK, MCP, Worker, Pine translator, detector,
new business plugin, or Marketplace implementation was added.

Implementation requires explicit review acceptance and a separate user
instruction. P1a/P1b and every broader distribution/execution phase remain
later work.

## Verification

The documentation-only change passes:

- architecture hardening with 115 rules and 15 negative controls;
- architecture boundary;
- production architecture with 64 modules, 147 dependency edges, 122
  construction sites, 23 writer sites, zero blocking findings, and 15 negative
  controls;
- production writer closure with 18 surfaces and eight negative controls;
- production module assembly with 64 public entries, 27 lifecycle modules, and
  40 optional-removal cases;
- source quality with 449 production files, 407 public exports, and 22 negative
  controls;
- ModuleHost with nine negative controls, 64 production descriptors, and 40
  optional-removal cases;
- P0a Plugin Contract substrate with 25 negative controls;
- deployed-runtime architecture with seven components, five proxy routes,
  four service units, 11 writer surfaces, and 15 negative controls;
- JSON parsing and `git diff --check`.

Because H115 is future work, no P0b runtime or visual acceptance is claimed in
this session.

Binding contract: `../docs/V7_CORE_PLUGIN_CENTER_P0B.md`.
