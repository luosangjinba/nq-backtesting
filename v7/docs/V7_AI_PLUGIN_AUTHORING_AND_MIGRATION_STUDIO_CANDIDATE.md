# V7 Standalone AI Plugin Authoring And Multi-Source Migration Studio — ADR-V7-008 Candidate

Status: candidate product/architecture decision; the strict TypeScript target
and Python/Pine-as-input constraint are product-owner accepted; decisions 2–10
await later reconciliation with MEMO-V7-006 and explicit review and authorize
no new software repository, dependency, agent provider, Pine/Python runtime,
P1b.4, P3a/P3b, or V7 production change

Drafted: 2026-08-20 PDT

Depends on: accepted ADR-V7-004, implemented P1a Developer Kit/H116, accepted
P1b contract, and the existing strict TypeScript to ES2022 ESM toolchain

Subsequent discovery boundary: the product owner paused candidate review and
implementation later on 2026-08-20. MEMO-V7-006 distinguishes atomic Plugin
authoring from customizable business Model authoring and makes the developing
software portrait the immediate work. This candidate remains useful input but
is not the immediate approval action.

## Decided Language Boundary

Executable V7 plugins continue to have one canonical publish and runtime path:

```text
strict TypeScript source -> pinned Developer Kit build -> ES2022 ESM artifact
```

The product owner accepted that natural language, Pine Script, and Python may
all be authoring/migration inputs. Python's large indicator ecosystem should be
used as source material and a differential oracle, but Python is not added to
the browser/plugin runtime. This preserves one ABI, one permission model, one
build system, and one conformance path while letting AI exploit Python and Pine
training/data advantages.

## Standalone Product Boundary

The recommended product is independent from the V7 workstation runtime. A
small monorepo may ship two independently runnable applications or commands:

- **Plugin Author** — natural-language or existing-code assisted creation of a
  new V7 plugin workspace;
- **Migration Studio** — Pine/Python ingestion, compatibility analysis,
  TypeScript generation, and differential evidence.

They may share a `developer-kit-client`, compatibility schemas, UI shell, and
agent-backend interface. They must not import V7 browser owners, mutate a live
Session, install/activate a plugin, or invent a second validator. The existing
P1a operation engine remains canonical for discover, scaffold, validate,
build, test, preview, pack, and inspect.

## Proposed Architecture

```text
desktop/CLI UI
  -> bounded project workspace
  -> AgentBackend port
  -> source analyzers
       |-- Pine parser / compatibility inventory
       `-- Python AST / dependency and callable inventory
  -> normalized Migration Plan + user decisions
  -> V7 Developer Kit operations
  -> strict TypeScript project + fixtures
  -> differential/conformance/preview gates
  -> compatibility and provenance report
  -> explicit human export; never automatic activation
```

The LLM proposes code and fixes. Deterministic tools own parsing, schemas,
builds, numerical comparisons, diagnostics, and receipts.

## Required Migration Pipeline

1. record user authorization, source hash/version, claimed license, and
   external dependencies;
2. parse source without executing it and inventory inputs, outputs, state,
   drawings, other-context data, time/session use, and unsupported constructs;
3. produce a versioned compatibility report and require explicit user choices
   for approximations or dropped presentation;
4. scaffold an ordinary strict-TypeScript V7 workspace through P1a;
5. generate implementation, manifest, settings schema, fixtures, expected
   outputs, tests, and migration provenance;
6. run the same validate/build/test/preview/pack operations used by a human;
7. compare source and generated behavior on frozen OHLCV vectors;
8. fail closed on unresolved semantic differences;
9. require human review of numerical, visual, no-future, and license results;
10. export a workspace/report only; installation and activation remain separate
    V7 user-approved transactions.

## Differential Evidence

Exact source equivalence is often impossible without defining semantics. Every
migration must test at least:

- warm-up length and `NaN`/missing-value propagation;
- rolling-window alignment, offsets, and output timestamps;
- recursive seeds and batch-versus-incremental behavior;
- numeric tolerance, rounding, and divide-by-zero behavior;
- multi-output order, plot kinds, colors, fills, and visibility;
- timezone, session, resampling, and higher-timeframe alignment;
- no-future/lookahead and repaint behavior at every Replay cutoff;
- missing volume/data and bounded resource behavior;
- user-defined state and drawing lifecycle when supported.

Python source may be run only after inspection inside a disposable, network-
disabled migration sandbox to generate expected vectors. Its packages are
test-time inputs/oracles, not runtime dependencies of the generated plugin.

## Open-Source Reuse Audit

The audit checked official repositories and shallow-cloned the strongest
candidates into `/tmp`; nothing was vendored or added as a dependency.

| Candidate | Useful wheel | Decision boundary |
| --- | --- | --- |
| [OpenHands Software Agent SDK](https://github.com/OpenHands/software-agent-sdk) (MIT) | Python/REST agent SDK, typed custom tools, isolated workspaces, structured output, security hooks | promising first `AgentBackend`; expose bounded Studio/DK tools rather than unrestricted machine authority |
| [goose](https://github.com/aaif-goose/goose) (Apache-2.0) | mature local CLI/desktop/API, provider-agnostic ACP/MCP integration | strong alternative backend or user-facing shell; do not couple domain validation to its agent loop |
| [Opus Aether pine-transpiler](https://github.com/Opus-Aether-AI/pine-transpiler) (MIT) | zero-dependency TypeScript lexer/parser/AST, exported pipeline stages, capability registry, extensive contract/corpus tests | strongest permissive Pine front-end candidate; reuse parser/IR/tests, not its PineJS output/runtime as a V7 plugin |
| [PineTS](https://github.com/LuxAlgo/PineTS) (AGPL-3.0) | broad Pine transpiler/runtime and semantic reference | license and runtime coupling make direct embedding unsuitable without a deliberate AGPL/commercial decision |
| [OpenPineScript](https://github.com/be-thomas/OpenPineScript) (GPL-3.0) | grammar/parser/runtime/conformance reference | useful comparison source; GPL integration needs a separate license decision |
| [lightweight-charts-indicators](https://github.com/deepentropy/lightweight-charts-indicators) (MIT) | large TypeScript indicator catalog, calculate functions, registry, tests | mine standard formulas/fixtures only after per-indicator provenance review; never adopt its direct Chart ownership examples or bulk community ports blindly |
| [TA-Lib Python](https://github.com/TA-Lib/ta-lib-python) (BSD-2-Clause) | mature 150+ indicator oracle, explicit lookback/NaN behavior, batch and streaming APIs | excellent differential oracle; wrapper/C implementation is not a source-to-TypeScript converter |
| [pandas-ta-classic](https://github.com/xgboosted/pandas-ta-classic) (MIT) | native Python formulas, broad catalog, tests and explicit TA-Lib parity matrix | useful Python-source fixtures/oracle after dependency and per-indicator provenance checks |

The preferred first spike is OpenHands SDK behind a replaceable backend port,
the existing V7 Developer Kit as the only domain engine, Opus Aether's Pine
front-end as an evaluated parser dependency/fork candidate, and TA-Lib plus a
small user-owned Python corpus as numerical oracles. No repository is adopted
solely from README claims; license, release pin, source provenance, API surface,
and fail-closed behavior require a separate dependency review.

Official Lightweight Charts and awesome-tradingview remain implementation
references for generated visual previews, not authoring engines:

- <https://tradingview.github.io/lightweight-charts/docs/plugins/intro>
- <https://github.com/tradingview/awesome-tradingview>

## Why TypeScript Remains AI-Friendly

AI effectiveness depends more on a small typed SDK, stable diagnostics,
examples, deterministic fixtures, and fast correction loops than on raw
language-frequency counts. TypeScript gives the generated plugin a compile-
time contract at every host boundary. Python remains valuable where it is
strongest: parsing user algorithms, numerical reference execution, test-vector
generation, orchestration, and AI-agent implementation.

A dual Python/TypeScript production runtime would instead double lifecycle,
sandbox, dependency, packaging, debugging, performance, and conformance
surfaces. That cost is not justified for the first product.

## Security And Rights

- Source is user-supplied or explicitly authorized; protected/invite-only Pine
  and scraped proprietary code are rejected.
- Network is disabled by default during source analysis and differential runs.
- Python dependencies are allowlisted/pinned in disposable environments and
  never inherit user credentials.
- Agent prompts receive only the selected workspace/source/evidence; telemetry
  and remote providers require explicit opt-in.
- Generated code cannot install, activate, publish, request new permissions, or
  weaken strict TypeScript/build settings.
- Every approximation, unsupported feature, model/provider version, prompt,
  tool receipt, source hash, and human decision is recorded in the report.

## Proposed First Spikes

1. **Author spike:** one standalone CLI/UI invokes P1a to scaffold, edit,
   validate, build, test, and preview a simple calculated-series plugin through
   a replaceable Agent backend.
2. **Python migration spike:** accept one pure SMA/RSI-style Python function,
   inventory it with `ast`, generate TypeScript, and prove differential vectors
   including warm-up/NaN/cutoff behavior.
3. **Pine migration spike:** parse one indicator-only Pine script, emit a
   compatibility report and normalized plan, then generate V7 TypeScript rather
   than PineJS.
4. Only after these three pass should a supported product matrix or broader
   indicator catalog be proposed.

## Ten Material Decisions

1. **Binding:** strict TypeScript to pinned ES2022 ESM is the sole executable
   V7 plugin path; natural language, Pine, and Python are inputs/oracles only.
2. Build authoring/migration as standalone software outside the V7 workstation
   runtime.
3. Provide two independently runnable workflows sharing only a small Studio
   substrate and Developer Kit client.
4. Keep the implemented P1a operation engine canonical; no agent-specific
   validator/build/pack path.
5. Put AI behind a replaceable `AgentBackend`; begin by evaluating OpenHands
   SDK and retain goose/ACP-compatible alternatives.
6. Evaluate Opus Aether's MIT Pine parser/AST as the first permissive front-end
   substrate, but target V7 TypeScript and reject PineJS runtime coupling.
7. Treat Python code/libraries as inspected source and disposable differential
   oracles, never browser/plugin runtime dependencies.
8. Require deterministic numerical/no-future/visual evidence plus an explicit
   compatibility report before any equivalence claim.
9. Fail closed on rights, unsupported semantics, unsafe dependencies, hidden
   network access, repaint/lookahead, and permission expansion.
10. Allocate no external repository, P1b.4/P3a/P3b, dependency, delivery id,
    Harness id, or implementation from candidate acceptance alone.

Explicit product-owner review is required for decisions 2–10.
