# Session — P1a Agent-Native Plugin Developer Kit Specification

Date: 2026-08-11

Status: specification completed; pending review; implementation not authorized;
H116 declared

## Request

After P0b/H115 acceptance, the product owner authorized the next bounded step:
P1a Developer Kit **specification design**.

The accepted earlier amendment requires that a developer can eventually use an
AI coding agent for the complete plugin-authoring workflow and that a later
Pine migration assistant emit an ordinary strict-TypeScript plugin. The current
request did not authorize SDK/tooling code, MCP, installation, production
external-code execution, or Pine translation.

## Outcome

`docs/V7_AGENT_NATIVE_PLUGIN_DEVELOPER_KIT_P1A.md` now proposes one canonical,
headless Developer Kit contract. It freezes:

- one operation engine behind the library and CLI, with a later MCP adapter
  required to reuse it;
- stable machine-readable `discover`, `scaffold`, `validate`, `build`, `test`,
  `preview`, `pack`, and `inspect` operations;
- one initial `trusted-built-in-core-v1` contract profile which reports
  unauthorized Community, sub-Pane, Worker, and future contribution tiers
  honestly;
- a pinned strict-TypeScript-to-ES2022-ESM build profile with no candidate-
  supplied compiler configuration, plugins, scripts, or ambient DOM/Node API;
- an immutable synthetic host and disposable isolated developer test process
  which cannot access production owners, real data, credentials, filesystem,
  shell, network, or application lifecycle;
- structured diagnostics, compatibility reports, source/artifact/toolchain
  provenance, and canonical receipts;
- a deterministic `.v7dk.tar` developer evidence bundle which is explicitly
  not an install archive, trust grant, or activation instruction;
- real FVG plus synthetic host-schema/dependency/negative references without
  adding placeholder product plugins;
- H116's future deterministic, isolation, tamper, no-future, architecture, and
  regression acceptance boundary.

The Harness registry keeps P0b as the current implemented step. P1a is appended
to the ordered program and H116 is `declared`, with no Harness, negative
fixture, or acceptance evidence.

## Key Boundary Decisions

### Authoring is not installation

P1a can produce a complete, inspectable developer artifact and evidence. It
cannot install, enable, reload, publish, sign, or activate that artifact. P1b
must define a separate install archive/candidate transaction, and a P1a receipt
always states:

```text
installable: false
activated: false
productionExecutionAuthorized: false
```

### Developer isolation is not the production Worker

`validate`, `discover`, and `inspect` never execute plugin code. `build` invokes
only the pinned compiler and static analyzers. `test` and `preview` may invoke a
profile-authorized fixture ABI only inside a disposable synthetic test process
with denied ambient authority and fixed limits. If those denials cannot be
enforced, the operation reports `blocked` rather than falling back to the CLI
process.

This permits deterministic developer evidence without creating or claiming
the P3a production Worker. The test host has no real Bars requester, Replay,
Chart, Workspace, Annotation repository, persistence, ModuleHost, or activation
path.

### Profiles disclose what is actually available

P0a's manifest lists several contribution kinds, but metadata does not imply
that a public execution ABI exists. The Developer Kit therefore publishes a
separate contribution-contract catalog with `static`, `fixture`,
`trusted-build`, and `unavailable` classifications. P1a initially proves the
current FVG evidence-construction path. It does not fabricate an inert
sub-Pane/Community example or silently define a Worker contract.

### One canonical machine protocol

CLI output for humans may be formatted, but the JSON operation result is
authoritative. Stable codes, logical paths, JSON pointers/source spans, exact
versions, content hashes, compatibility findings, and receipts let a human,
CI, or AI Agent reach the same conclusion without parsing prose or using an
undocumented GUI step.

## External Pattern Check

The repository-required check used the `agent-reach` skill. `agent-reach
doctor --json` reported Exa as available through `mcporter`, but actual Exa
calls returned HTTP 401 because the environment did not provide
`EXA_API_KEY`. Per the skill fallback, the public official pages were read
through the Jina Reader route. This mismatch does not block P1a and requires no
user action unless direct Exa search is desired.

Official evidence reviewed:

- Lightweight Charts plugin overview and examples: Custom Series, Series
  Primitives, Pane Primitives, scaffolding, and direct vendor-handle patterns;
- VS Code extension manifest, contribution-point, test-host, and packaging
  patterns;
- TypeScript strict mode and project-reference build behavior;
- JSON Schema Draft 2020-12 core.

References are recorded directly in the P1a specification. No production
dependency was added.

## Architecture Placement

The proposed implementation is outside the production runtime graph:

```text
v7/sdk/plugin/                         public values/schemas/catalogs/examples
v7/tools/plugin-developer-kit/domain/ pure plans/diagnostics/receipts
v7/tools/plugin-developer-kit/adapters/ workspace/compiler/test/tar adapters
v7/tools/plugin-developer-kit/cli/    transport/formatting only
v7/tests/plugin-developer-kit-harness.js future H116 orchestration
```

No production module may import developer tooling, compiler/test adapters, or
fixtures. ModuleHost remains the only application lifecycle owner. Chart,
Replay, Bar Data, Workspace, Annotation, persistence, Core profile, and Plugin
Center ownership are unchanged.

## Documentation And Governance Updated

- `docs/V7_AGENT_NATIVE_PLUGIN_DEVELOPER_KIT_P1A.md`;
- `docs/V7_CORE_AND_COMMUNITY_PLUGIN_MODEL_SPEC.md`;
- `docs/V7_PRODUCT_AND_SCOPE.md`;
- `docs/V7_ARCHITECTURE.md`;
- `docs/V7_EXECUTION_ROADMAP.md`;
- `docs/V7_RESTART_HANDOFF.md`;
- `docs/INDEX.md`;
- `docs/v7-harness-rules.json`;
- `TODO.md`;
- this session record.

The production architecture manifest, source-quality baseline, production
writer policy, deployed-runtime manifest, application source, tests, fixtures,
dependencies, and visual baselines are intentionally unchanged. A specification
does not enter the production owner graph.

## Scope Kept Closed

No SDK or CLI source, compiler/schema dependency, test subprocess, H116
Harness/fixture, developer workspace, archive, install/load-unpacked path, MCP
server, Community manifest, signature/registry operation, Worker, Pine parser,
new Core business plugin, or product-visible behavior was added.

Implementation requires explicit review acceptance and a separate user
instruction. P1b–P4 and R13.11–R13.13 remain later separately gated work.

## Verification

The documentation-only change passes:

- architecture hardening with 116 registered rules and 15 negative controls;
- architecture boundary;
- production architecture with 66 modules, 148 dependency edges, 128
  construction sites, 25 writer sites, zero blocking findings, and 15 negative
  controls;
- production writer closure with 20 surfaces, 25 observed writer files, and
  eight negative controls;
- production module assembly with 66 public entries, 28 lifecycle modules, and
  41 optional-removal cases;
- source quality with 465 production files, 428 public exports, and 22 negative
  controls;
- ModuleHost with nine negative controls, 66 production descriptors, and 41
  optional-removal cases;
- P0a Plugin Contract substrate with 25 negative controls;
- P0b Core Plugin Center with eight negative controls plus its real Settings,
  restart, fallback, retained-evidence, and narrow-layout cases;
- deployed-runtime architecture with seven components, five proxy routes, four
  service units, 11 writer surfaces, and 15 negative controls;
- JSON parsing and `git diff --check`.

The production regression matrix was also invoked but correctly stopped at its
environment prerequisite: the intentionally stopped local market-data service
returned no healthy `/v7/market-data/health` response and no
`V7_MARKET_DATA_DB` was supplied. No source/runtime code changed in this step,
so the service was not restarted merely to review a documentation contract.

Because H116 is future work, this session cannot claim an executable H116
Harness, negative fixture, production behavior, or visual acceptance.

Binding proposed contract:
`../docs/V7_AGENT_NATIVE_PLUGIN_DEVELOPER_KIT_P1A.md`.
