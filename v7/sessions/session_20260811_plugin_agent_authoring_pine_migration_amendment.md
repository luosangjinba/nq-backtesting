# Session — Plugin Agent Authoring And Pine Migration Amendment

Date: 2026-08-11

Status: accepted documentation amendment; no Developer Kit, Harness, MCP, or
Pine migration implementation authorized

Decision: second amendment to `ADR-V7-004`

## Product-Owner Direction

After accepting R13.10e/H114, the product owner required two future plugin-
platform outcomes:

1. a developer can use an AI coding agent for the complete plugin-authoring
   workflow, supported by a V7-provided conformance Harness and MCP surface;
2. an AI agent can assist in migrating Pine Script indicator programs into V7
   plugins.

The existing language decision remains unchanged: executable V7 plugins use
strict TypeScript and the pinned SDK build emits ES2022 ESM. Pine is migration
input, not a runtime language.

## Accepted Contract

The future Plugin Developer Kit is headless and machine-readable. It exposes
versioned SDK types, JSON Schemas, capability/permission catalogs, examples,
stable diagnostics, deterministic scaffold/validate/build/test/preview/pack
operations, an immutable headless market/Replay/Pane host simulator, reference
packages, and reproducible conformance receipts. An AI agent must be able to
finish the ordinary authoring path without an undocumented GUI-only step.

The deterministic CLI/library and Harness are canonical. A local MCP server is
a thin adapter over those same operations. It is restricted to an explicitly
selected plugin workspace, treats package content as untrusted data, grants no
raw owner or arbitrary shell/filesystem/network access, and cannot directly
activate, install, publish, update, or expand package permissions. Those state
changes retain explicit user approval and the common candidate transaction;
ModuleHost remains the sole activation/disposal owner.

The Harness expands with the authorized contribution tier and covers package/
schema/dependency/permission conformance, pinned TypeScript compilation,
deterministic vectors, missing data and warm-up, no-future/repaint/cutoff,
staleness/races/cancellation/rollback, lifecycle/disposal/migration/data
survival, resource budgets, host-rendered UI/accessibility/visual behavior,
multi-Pane/native Chart behavior, provenance, and zero direct owner writes as
applicable. An automated pass never waives required human review.

Pine migration is an inspectable pipeline: record authorized source and its
hash/version/license assertion; parse and inventory the script; compare it to
a versioned compatibility matrix; generate strict-TypeScript source, manifest,
settings schemas, permissions, fixtures/tests, and a migration report; run the
ordinary Harness; and require human review of semantic/visual equivalence.

The first supported profile is indicators, not `strategy()` or broker
simulation. Unsupported constructs, future-leaking lookahead, repaint-dependent
logic incompatible with no-future Replay, unmediated `request.*()`/multi-context
data, realtime/intrabar assumptions V7 cannot reproduce, protected libraries,
and platform-only drawings/UI fail closed or require an explicit human choice.
V7 does not embed TradingView's Pine runtime or claim equivalence without user-
authorized expected outputs or other differential evidence.

## Official Compatibility Basis

TradingView's official documentation confirms the migration-sensitive model:
Pine executes sequentially per historical Bar, can recalculate and roll back on
realtime updates, exposes behavior that can repaint, supports other-context
`request.*()` data with alignment/lookahead concerns, gives strategies a broker
emulator/order model, and enforces platform resource limits. These contracts
cannot be reproduced safely by text substitution alone:

- <https://www.tradingview.com/pine-script-docs/language/execution-model/>
- <https://www.tradingview.com/pine-script-docs/concepts/repainting/>
- <https://www.tradingview.com/pine-script-docs/concepts/other-timeframes-and-data/>
- <https://www.tradingview.com/pine-script-docs/concepts/strategies/>
- <https://www.tradingview.com/pine-script-docs/writing/limitations/>

The preferred Agent Reach Exa backend returned 401 because this environment has
no `EXA_API_KEY`; the official pages were read directly through Agent Reach's
Jina Reader fallback. This did not block the decision and requires no project
or user action unless Exa search itself is desired later.

## Delivery Order

The amendment refines but does not skip the accepted platform sequence:

1. P0b Core Plugin Center over trusted-build packages;
2. P1a Agent-native Developer Kit, deterministic Harness, reference packages,
   diagnostics, and receipts;
3. P1b local archive/load-unpacked lifecycle plus the bounded authoring MCP;
4. P2 signed free Community registry;
5. P3a isolated TypeScript-to-ESM calculation Workers;
6. P3b supported Pine indicator migration after the target SDK/runtime exists;
7. P4 Marketplace only after a separate product/business decision.

Analysis-only Pine prototypes could occur earlier under a separately accepted
step, but supported end-to-end migration cannot be accepted before the target
contribution and execution tiers exist. No phase receives a delivery id here.

## Scope Kept Closed

This amendment adds no runtime code, package loader, UI, installer, public SDK,
MCP process, Pine parser/translator, Worker, registry, network permission,
strategy execution, broker simulation, detector, new Core plugin, Marketplace,
payment, or product-scope expansion. It does not reopen accepted R13.10e.

## Documentation Updated

- `docs/V7_CORE_AND_COMMUNITY_PLUGIN_MODEL_SPEC.md`;
- `docs/V7_PRODUCT_AND_SCOPE.md`;
- `docs/V7_ARCHITECTURE.md`;
- `docs/V7_EXECUTION_ROADMAP.md`;
- `docs/V7_NON_DECISION_MEMO_REGISTRY.md`;
- `docs/V7_GENERAL_FUTURES_PLUGIN_PLATFORM_PREDECISION_MEMO.md`;
- `docs/INDEX.md`;
- `TODO.md`;
- `docs/V7_RESTART_HANDOFF.md`.

## Verification

This is a documentation-only amendment after the separate R13.10e acceptance
commit. Architecture boundary and hardening, production architecture, source
quality, ModuleHost, and deployed-runtime architecture Harnesses pass. They
retain 114 registered rules, 64 production modules, 147 dependency edges, 122
construction sites, 23 observed writer sites, zero blocking architecture
findings, 449 production files, 407 public exports, 40 optional-removal cases,
and the existing cross-runtime/deployment ownership model. `git diff --check`
passes, and no production source or runtime behavior changed.

Binding contract: `docs/V7_CORE_AND_COMMUNITY_PLUGIN_MODEL_SPEC.md`.
