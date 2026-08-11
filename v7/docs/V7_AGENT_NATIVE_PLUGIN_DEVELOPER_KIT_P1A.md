# V7 Agent-Native Plugin Developer Kit — P1a

Status: specification accepted 2026-08-11; implementation not authorized; H116
declared

Date: 2026-08-11

Depends on: accepted ADR-V7-004, P0a/H113, R13.10e/H114, P0b/H115, and the
accepted Agent-native/Pine authoring amendment

Harness: H116, declared only

Plain-language design rationale:
`V7_AGENT_NATIVE_PLUGIN_DEVELOPER_KIT_P1A_RATIONALE.zh-CN.md`

## Outcome

P1a specifies one deterministic, headless Plugin Developer Kit through which a
human, CI job, or AI coding agent can discover the currently authorized plugin
contract, scaffold a workspace, validate and compile strict TypeScript, run the
applicable isolated conformance tests, generate a host-shaped preview, create a
non-installable developer evidence bundle, inspect that bundle, and receive the
same machine-readable result.

P1a is an **authoring and evidence boundary**, not a package lifecycle or
production execution boundary. It does not install, load, enable, publish, or
run a candidate inside the V7 workstation. P0b continues to show only real
trusted-build manifests already included in the application. P1b must later
define installation archives and the bounded MCP adapter; P3a must later
define production Worker execution.

The immediate value is a stable thin waist for human and Agent development:
plugin contracts stop being discoverable only by reading scattered source,
and every claim made by a candidate is tied to reproducible diagnostics,
fixtures, toolchain identity, and hashes.

## Upstream Capability And Pattern Check

The repository-required external check was repeated before this specification.

Lightweight Charts 5.2 exposes Custom Series, Series Primitives, and Pane
Primitives, and its official `create-lwc-plugin` path demonstrates focused
plugin scaffolding. Its Primitive interfaces also expose Chart/Series handles
and Canvas rendering callbacks. V7 may reuse its renderer and lifecycle
patterns behind the Chart adapter, but the public V7 SDK must not pass those
vendor handles to plugin code:

- <https://tradingview.github.io/lightweight-charts/docs/plugins/intro>
- <https://tradingview.github.io/lightweight-charts/plugin-examples/>

Visual Studio Code provides useful developer-tool patterns: a root extension
manifest, declarative contribution points, generated test scaffolds, a
dedicated test host, and one packaging CLI. V7 adopts the explicit manifest,
contribution, test, and pack concepts, not VS Code's extension privileges or
runtime model:

- <https://code.visualstudio.com/api/references/extension-manifest>
- <https://code.visualstudio.com/api/references/contribution-points>
- <https://code.visualstudio.com/api/working-with-extensions/testing-extension>
- <https://code.visualstudio.com/api/working-with-extensions/publishing-extension>

TypeScript's `strict` family and project references support a pinned, bounded
build graph. Because future compiler versions may add stricter checks, P1a
records the exact compiler version and configuration in the toolchain catalog
rather than treating `strict: true` alone as a reproducible toolchain:

- <https://www.typescriptlang.org/tsconfig/strict.html>
- <https://www.typescriptlang.org/docs/handbook/project-references.html>

JSON Schema Draft 2020-12 remains the wire-schema basis. Every public schema
has a stable `$id`; supported vocabularies and output/diagnostic formats are
part of the versioned Developer Kit contract:

- <https://json-schema.org/draft/2020-12/json-schema-core>

These checks add no upstream production dependency. Dependency selection and
license/integrity review occur only if P1a implementation is later authorized.

## Authorization Boundary

P1a specification includes only:

- versioned SDK value types and JSON Schemas;
- versioned capability, contribution-contract, permission, UI-control, and
  compatibility catalogs;
- one canonical operation engine plus local library and CLI adapters;
- deterministic scaffold, validate, build, test, preview, pack, inspect, and
  discover operations;
- an immutable synthetic-host simulator and isolated developer test runner;
- real FVG plus bounded synthetic reference workspaces;
- stable diagnostics, compatibility reports, provenance, and receipts;
- H116's future automated acceptance boundary.

P1a explicitly excludes:

- install from file, load unpacked, reload, update, uninstall, enable/disable,
  signing, publishing, registry access, or Plugin Center changes;
- a final Community manifest/archive or any claim that a P1a bundle is
  installable;
- a local MCP server or a second implementation of any Developer Kit command;
- production execution of candidate code, a Worker runtime, WASM, Python, or
  Pine execution;
- arbitrary package HTML, DOM, CSS, Chart/Series/Canvas handles, gestures, or
  owner references;
- real market-data, Replay, Session, Workspace, Annotation repository,
  database, credential, filesystem, shell, or network access from a candidate;
- a new Core business plugin, MA/SMA, Fibonacci, Liquidity expansion,
  detector, R13.11–R13.13, or product-visible pixels.

This document authorizes no source implementation. Review acceptance and a
separate implementation instruction are required before creating the SDK,
tooling, reference workspaces, H116 executable Harness, or dependencies.

## One Authoritative Operation Engine

P1a must not create separate human, CI, Agent, Plugin Center, and future MCP
toolchains.

```text
human / CI / AI agent
          |
          v
  CLI adapter or library adapter
          |
          v
 canonical Developer Kit operation engine
    |          |          |          |
 contract   workspace   compiler   isolated synthetic
 catalog    adapter     adapter    host/test adapter
          |
          v
 normalized result + compatibility report + receipt
```

The operation engine owns normalization, planning, validation order,
diagnostic codes, digests, result envelopes, and receipt construction. Adapters
may read/write the selected workspace, invoke the pinned compiler, create a
temporary test process, or encode a bundle, but may not reinterpret validity.

The CLI must call the same public library operation as CI and a future MCP
adapter. Human-readable terminal text is optional decoration. The JSON result
is authoritative and must be byte-equivalent after canonical serialization for
the same request and inputs.

The Developer Kit is not a ModuleHost. It never composes application module
definitions, reads or writes Core profiles, promotes a generation, or controls
package lifecycle.

## Contract Profiles And Honest Availability

P1a does not pretend that every future plugin tier already exists. A versioned
**contract profile** declares exactly which distribution claims, contribution
contracts, operations, test modes, and output forms are available.

The first profile is:

```text
trusted-built-in-core-v1
  manifest: P0a Built-In Plugin Manifest V1
  distribution: core / built-in / first-party
  permissions: []
  executable production target: none supplied by the Developer Kit
  trusted reference: existing Fair Value Gap package
```

The profile exposes current P0a contribution metadata and host-rendered
parameter schemas. A contribution kind is not evidence that a public runtime
ABI exists. The contribution-contract catalog separately classifies each kind
as one of:

- `static` — manifest/schema/dependency/UI validation only;
- `fixture` — deterministic pure invocation in the synthetic test host is
  defined;
- `trusted-build` — an existing first-party package has an adapter and real
  Harness evidence;
- `unavailable` — the requested behavior needs a later authorized contract.

P1a's initial executable conformance profile is limited to the existing
evidence-constrained semantic construction path proven by FVG. Indicator
calculation, sub-Pane rendering, Community execution, arbitrary drawing
gestures, and Worker lifecycle remain `unavailable` until separately specified.
The SDK and result must report that limitation explicitly; they must not emit a
plausible but non-runnable package.

Later phases add profiles rather than silently broadening
`trusted-built-in-core-v1`. P1b may add a local declarative package profile;
P3a may add an isolated calculation profile. Each addition requires its own
schema version, compatibility decision, Harness growth, and authorization.

## Public Developer Workspace V1

One selected plugin workspace is rooted by `v7-plugin-kit.json`. Paths in the
document are forward-slash, workspace-relative, normalized, and may not be
absolute, empty, duplicated, contain `..`, escape through a symlink, or name a
device/special file.

```text
DeveloperWorkspaceV1 {
  schemaVersion: 1
  developerKitRange
  sdkRange
  contractProfile
  manifestPath
  sourceRoot
  entrypoints[]
  fixtureSuites[]
  expectedOutputs[]
}
```

The referenced plugin manifest remains a portable JSON document validated by
the selected profile. P1a does not add executable functions or an entrypoint to
P0a's production manifest. Authoring entrypoints live only in the Developer
Workspace document and compiled developer artifact.

The generated workspace contains at minimum:

```text
v7-plugin-kit.json
plugin.manifest.json
src/index.ts
fixtures/
expected/
README.md
```

Generated files contain no machine-specific absolute paths, current dates,
random identifiers, network-derived content, credentials, or undeclared
dependencies. Scaffold refuses a non-empty target and never overwrites a file.
An explicit future migration operation, not `scaffold`, must own upgrades of an
existing workspace.

The workspace document is a developer-tool contract, not an installation
manifest. P1b may reuse its verified content but cannot infer install consent,
permissions, publisher trust, or activation from it.

## SDK And TypeScript Build Profile

Strict TypeScript is the sole executable authoring language. The implementation
must publish one content-addressed SDK/toolchain release containing:

- portable manifest, capability, dependency, parameter, fixture, simulator
  input/output, diagnostic, compatibility, provenance, and receipt types;
- type-safe definition helpers for contribution contracts enabled by the
  selected profile;
- the matching JSON Schemas and catalogs;
- compiler version, all compiler options, SDK artifact hashes, schema hashes,
  and supported profile versions;
- small compilable examples which are also H116 fixtures.

The conformance build profile is generated by the Developer Kit and cannot be
weakened by the candidate. Its minimum invariants are:

- an exact pinned TypeScript compiler version and integrity digest;
- `strict`, `noEmitOnError`, `exactOptionalPropertyTypes`,
  `noUncheckedIndexedAccess`, `useUnknownInCatchVariables`,
  `isolatedModules`, and `verbatimModuleSyntax` enabled;
- `target` and emitted `module` fixed to ES2022 ESM;
- no DOM, WebWorker, or Node ambient libraries/types unless a later contract
  profile explicitly supplies narrower branded types;
- only the versioned V7 SDK specifier and workspace-relative static imports;
- no undeclared bare dependency, Node built-in, dynamic import, `eval`,
  `Function`, WebAssembly, lifecycle script, or remote import;
- declarations and deterministic source maps may be emitted for inspection,
  but source paths are workspace-relative and no host path enters output.

Build performs compilation and static artifact inspection. Successful build
does not authorize the emitted module to run in the workstation. A package
cannot supply or override compiler plugins, transformers, loaders, bundler
configuration, lifecycle scripts, or TypeScript configuration.

Exact compiler/dependency versions are frozen in the implementation's
machine-readable toolchain catalog rather than guessed in this specification.
Version changes require a new toolchain identity and compatibility evidence;
they never rewrite an old receipt.

## Immutable Synthetic Host

The headless simulator presents only immutable, portable snapshots through SDK
types. It is a test adapter, not another runtime owner.

Canonical fixture inputs may include:

- Bars with exact symbol, timeframe, timestamp, OHLC, source revision, and
  visible cutoff identity;
- Session Hours, timezone, calendar, and gap/alignment policy;
- Pane identity and registered source-to-target timeframe mapping;
- Replay observation cutoff and confirmed-Bar state;
- validated package/profile/instance settings applicable to the contract;
- evidence bundles and host-owned Artifact snapshots;
- activation, cancellation, stale-generation, and disposal event sequences
  when the selected contract profile defines them.

The simulator returns portable domain results: calculated series samples,
geometry/projection descriptions, semantic drafts, host-rendered control view
models, diagnostics, and deterministic lifecycle traces as applicable. It
never returns a Chart, Series, Canvas, DOM node, data requester/cache, mutable
store, persistence adapter, Annotation writer, Workspace writer, ModuleHost, or
owner command port.

Time, timezone, locale, seed, ordering, and Replay cutoff are explicit fixture
inputs. Ambient wall clock, randomness, environment variables, host locale,
Git state, open application state, and network responses are forbidden inputs.
Missing context fails closed rather than substituting today's date, the latest
Bar, or a default live cursor.

Applicable calculation contracts must compare full and incremental execution,
warm-up/missing-data behavior, output identity, confirmed versus open Bars, and
Replay no-future behavior. A contract with intentional repaint/realtime
semantics must declare that classification; an undeclared future read fails.

## Developer Test Isolation

`validate`, `discover`, and `inspect` never execute candidate code. `build`
invokes only the pinned compiler and static artifact analyzers.

`test` and `preview` may invoke compiled candidate logic only when the selected
contract profile defines a fixture ABI. Invocation occurs in a disposable
developer test process with:

- only the requested immutable fixture and SDK runtime available;
- an empty credential/environment allowlist;
- no network, arbitrary filesystem, shell, child-process, database, browser,
  application owner, or production service access;
- bounded wall time, CPU, memory, output bytes, and task count;
- forced termination and complete temporary-directory disposal on failure;
- a deterministic seed/clock and canonical serialized input/output.

If the implementation cannot enforce those denials on the current platform,
the executable portion returns `blocked`; it must not fall back to running in
the CLI process. This test process is not the P3a Worker runtime: it has no
production data, lifecycle, permissions, persistence, or activation path and
cannot be reused as evidence that Community execution is safe.

Trusted-build FVG may additionally run its existing repository Harness through
an exact first-party adapter. The adapter is registered by path and source
digest in the Developer Kit release; a candidate cannot self-assert first-party
trust or select an arbitrary command.

## Canonical Operations

Every operation accepts a versioned JSON request and returns the common result
envelope. Unknown fields fail closed.

| Operation | Required behavior | Writes | Candidate execution |
| --- | --- | --- | --- |
| `discover` | return exact SDK, schemas, catalogs, profiles, examples, operation versions, and limits | none | never |
| `scaffold` | create a deterministic new workspace for one supported profile/template | new empty target only | never |
| `validate` | validate workspace, manifest, schemas, graph, settings, permissions, paths, imports, fixtures, and compatibility | none | never |
| `build` | run the pinned TypeScript build and static ESM/import/integrity checks | explicit workspace output only | compiler only |
| `test` | run static controls and applicable isolated fixture/first-party Harness adapters | explicit result/temp output only | isolated and profile-gated |
| `preview` | emit host-shaped parameter/projection preview models from exact fixtures | explicit result output only | isolated and profile-gated |
| `pack` | create a deterministic developer evidence bundle after required gates pass | explicit output only | never |
| `inspect` | verify and describe a workspace or P1a evidence bundle | none | never |

There is no generic command passthrough. Operation names, options, schemas,
exit meanings, and output files come from `discover`; callers do not scrape
help text. An operation cannot silently run a later operation. In particular,
`pack` does not install, `inspect` does not validate by executing code, and
`preview` does not open or mutate the production application.

## Request And Result Protocol

The canonical request identifies:

```text
DeveloperKitRequestV1 {
  schemaVersion: 1
  operation
  operationVersion
  workspaceRoot?
  outputRoot?
  contractProfile?
  sdkVersion?
  fixtureSelection[]?
  options: exact operation-specific record
}
```

Roots are adapter inputs, not provenance identity. Normalized results and
digests contain workspace-relative logical paths only. A caller correlation id
may be transported outside the canonical result but cannot alter output.

Every operation returns:

```text
DeveloperKitResultV1 {
  schemaVersion: 1
  operation
  operationVersion
  status: passed | failed | blocked
  exitCode
  contractProfile
  sdkVersion
  toolchainDigest
  inputDigest
  diagnostics[]
  artifacts[]
  compatibilityReport?
  receipt?
}
```

Canonical JSON uses UTF-8, lexicographically ordered object keys, preserved
array order where semantic and sorted order where set-like, finite JSON
numbers, and no insignificant whitespace. The library and CLI return the same
normalized value; terminal formatting does not enter the result.

Exit meanings are stable:

- `0`: operation passed;
- `1`: candidate/workspace conformance failure;
- `2`: invalid Developer Kit request or unsupported contract/profile;
- `3`: operation blocked because the required isolated capability is not
  enforceable or not authorized;
- `4`: Developer Kit internal/toolchain integrity failure.

An internal failure must not be misreported as a bad plugin, and an unsupported
future tier must not be misreported as passing.

## Diagnostics And Compatibility Report

Every diagnostic has a stable code and machine location:

```text
DeveloperDiagnosticV1 {
  code
  severity: error | warning | info
  phase
  message
  logicalPath?
  jsonPointer?
  sourceSpan?
  related[]
  suggestedFix?: { kind, description, safeToAutomate }
}
```

Messages help humans but are not program identifiers. Agents branch on codes,
severity, and structured fields. Codes are append-only within a major
operation version and use the `V7DK_` prefix. At minimum the catalog must
distinguish malformed input, unsupported SDK/profile/contribution, schema
failure, capability collision/missing/incompatibility/cycle, permission
increase, forbidden import/API, non-determinism, fixture mismatch, future read,
isolation unavailable, resource breach, stale output, integrity mismatch, path
escape, unsafe overwrite, and internal toolchain failure.

`CompatibilityReportV1` separately states:

- requested and resolved SDK/profile/toolchain versions;
- supported, unavailable, and deprecated contributions/capabilities;
- new or increased permissions;
- deterministic safe fixes versus choices requiring a human;
- conformance gates applicable, passed, failed, blocked, and not applicable;
- whether visible/semantic/permission review is required;
- whether the output is only a developer bundle or eligible for a later
  candidate transaction.

No automated fix may change market semantics, dependency requirements,
permissions, visible defaults, or source provenance without explicit review.

## Provenance And Reproducible Receipt

Every successful `build`, `test`, `preview`, and `pack` can emit a content-
addressed receipt. P1a hashes provide reproducibility and tamper evidence; they
are not a publisher signature or trust grant.

`DeveloperKitReceiptV1` records:

- receipt/schema/operation versions;
- package id/version and contract profile;
- SDK, compiler, schema, catalog, simulator, and operation versions/digests;
- canonical source, manifest, fixture, expected-output, build-artifact, and
  bundle hashes;
- requested capabilities/permissions and resolved dependency graph;
- exact Harness/fixture/negative-control identities and outcomes;
- deterministic seed, clock/timezone, limits, and execution classification;
- diagnostic codes and compatibility-review requirements;
- explicit `installable: false`, `activated: false`, and
  `productionExecutionAuthorized: false` in P1a.

Receipts are immutable. A changed source byte, fixture, expected result,
compiler, schema, catalog, limit, or operation version produces a new digest.
Re-running the same supported request against identical bytes produces the
same canonical receipt.

## P1a Developer Evidence Bundle

`pack` produces a **P1a Developer Evidence Bundle V1**, not a plugin installer
archive. The recommended filename suffix is `.v7dk.tar` so it cannot be
mistaken for a future install candidate whose format and suffix P1b must own.

The uncompressed deterministic tar contains only validated workspace-relative
files plus:

- canonical workspace and plugin manifests;
- compiled ES2022 ESM/declarations permitted by the profile;
- fixtures and expected outputs;
- compatibility report;
- receipts and a content index with SHA-256 hashes;
- source/license/provenance disclosure supplied by the author.

Entries are lexicographically ordered; uid/gid, user/group names, timestamps,
and non-semantic mode bits are normalized; links, devices, sparse entries,
absolute paths, traversal, duplicate paths, and undeclared files fail. The
bundle has explicit file/count/unpacked-size limits and contains no credentials
or generated host paths.

`inspect` verifies the index and reports contents without importing modules or
executing scripts. P1b may later define how a verified developer bundle feeds a
separate installation candidate transaction, but P1a's receipt grants no
installation or trust.

## Reference Workspaces

H116 must use references to prove generic contracts without inventing product
catalog entries:

1. **Real FVG trusted-build reference** — adapts the existing manifest,
   parameter/evidence contracts, strict three-Bar construction vectors,
   projection descriptions, no-future behavior, and current Harness. It does
   not replace or silently rewrite production FVG JavaScript.
2. **Synthetic host-schema reference** — exercises all supported Inputs/Style/
   Visibility control kinds and default/scoped settings without appearing in
   Plugin Center.
3. **Synthetic dependency reference** — proves provides/requires/extends
   compatibility, stable order, missing/incompatible/cycle diagnostics, and a
   derived contribution relationship without creating a business plugin.
4. **Negative workspaces** — each contains one intentional violation and a
   stable expected diagnostic.

An overlay is represented by FVG's portable rectangle/segment projection
description. A separate sub-Pane indicator and Community reference remain
explicitly unavailable because their runtime profiles are not yet authorized.
They become mandatory reference packages when the corresponding contract tier
is added; P1a must not fake them with inert manifests.

## Ownership And Module Placement

Future P1a implementation must stay outside the production owner graph except
for importing read-only public schemas/types through an explicit adapter.

```text
v7/sdk/plugin/
  owns: public TypeScript types, JSON Schemas, catalogs, examples

v7/tools/plugin-developer-kit/domain/
  owns: pure requests, plans, diagnostics, compatibility, receipts

v7/tools/plugin-developer-kit/adapters/
  owns: workspace IO, pinned compiler, isolated test process, tar encoding

v7/tools/plugin-developer-kit/cli/
  owns: argument/request transport and human-readable formatting only

v7/tests/plugin-developer-kit-harness.js
  owns: H116 orchestration and negative-control evidence
```

No production module imports `v7/tools`, test fixtures, Node APIs, compiler
adapters, or developer workspaces. The SDK contains values and narrow helper
implementations only; it cannot import application composition, Chart adapter,
Replay/Bar Data/Workspace/Annotation owners, persistence, Plugin Center, or
ModuleHost internals.

The operation engine is split by responsibility before implementation. The CLI
cannot accumulate validation, filesystem, compiler, simulator, archive, and
receipt logic in one entry file. Workspace IO uses an explicit root capability;
receipt and compatibility construction remain pure and testable.

## H116 Acceptance Gate

H116 is declared now and remains non-executable until P1a implementation is
separately authorized. Acceptance requires all of the following.

### Contract And Determinism

- `discover` returns complete versioned schemas/catalogs/examples and every
  other operation consumes those same identities;
- library and CLI produce identical canonical JSON, diagnostic order, hashes,
  compatibility report, and receipt for identical input;
- two clean scaffold/build/test/preview/pack runs are byte-identical;
- changing one source, fixture, expected-output, schema, compiler, or catalog
  byte changes the correct downstream digest and never an unrelated identity;
- workspace roots, hostnames, locale, timezone, wall clock, Git state, and
  environment variables do not leak into canonical output;
- all operations work offline after the pinned toolchain is present.

### Real Reference And Simulator

- the real FVG reference validates, builds, passes exact construction and
  projection vectors, proves full/incremental equivalence where applicable,
  and fails on a Replay future read;
- manifest/settings/preview models round-trip through the same P0a schemas and
  generic host-rendered control model without an FVG branch;
- synthetic dependencies resolve deterministically and produce exact missing,
  incompatible, collision, self/cycle, and unavailable-tier diagnostics;
- test/preview run only through the isolated synthetic host, receive no owner
  handles, and leave no process, file, listener, task, or temporary state after
  success, failure, timeout, or cancellation.

### Build, Pack, And Inspect

- the exact pinned TypeScript profile accepts valid strict source and rejects
  attempts to weaken compiler options or add compiler plugins/scripts;
- AST/static analysis rejects DOM/Node/network/filesystem/shell/dynamic import,
  undeclared bare imports, `eval`, `Function`, and WebAssembly;
- deterministic tar ordering/metadata/hashes and byte-preserving inspection are
  proven on the real and synthetic references;
- `inspect` detects a changed byte, forged receipt, duplicate/path-traversal
  entry, undeclared file, oversize expansion, link/device entry, and stale
  artifact without executing candidate code;
- every P1a receipt explicitly denies install, activation, publisher trust,
  and production execution.

### Negative Controls

H116 must include at least these independently failing controls:

1. unknown Developer Kit request field/version;
2. unsupported SDK or contract profile;
3. Community/Worker/sub-Pane execution claim before authorization;
4. forged first-party distribution claim;
5. unknown manifest field or unsupported permission;
6. missing, incompatible, duplicate, self, or cyclic capability graph;
7. custom HTML/DOM/CSS or raw Lightweight Charts handle request;
8. Node built-in, network, filesystem, shell, dynamic, or remote import;
9. `eval`, `Function`, WebAssembly, compiler plugin, or lifecycle script;
10. weakened TypeScript strict/ES2022 configuration;
11. absolute/traversal/duplicate/symlink-escape/special-file workspace path;
12. scaffold over a non-empty target;
13. ambient time/random/locale/environment-dependent output;
14. Replay future-Bar access or undeclared repaint behavior;
15. full/incremental or expected-output mismatch;
16. isolation unavailable, timeout, resource breach, or leaked child process;
17. stale build after a source/fixture/toolchain change;
18. tampered bundle index/artifact or forged receipt;
19. bundle traversal/link/device/oversize/undeclared entry;
20. attempt to install, activate, publish, contact a registry, or control
    ModuleHost through a P1a operation.

Every negative control must first be shown capable of passing when disabled,
then fail for its intended reason when enabled.

### Architecture And Regression

- no production module, descriptor, writer, constructor site, Plugin Center
  surface, Core profile, or deployment component changes merely to host P1a;
- no `PluginHost`, second validator, second lifecycle owner, or direct owner
  write appears;
- production architecture, writer closure, module assembly, source quality,
  P0a, P0b, ModuleHost, deployed-runtime, and regression gates remain green;
- `git diff --check` and JSON/schema parsing pass;
- H116 evidence records exact toolchain dependency licenses and integrity if
  implementation adds any dependency.

P1a adds no product-visible UI, so H116 requires no pixel baseline or focused
visual gate. Human review of this specification is complete; review remains
mandatory for any later visible behavior, disputed semantics, permission
increase, install/activation action, or Pine equivalence claim.

## Acceptance And Next Gate

The product owner authorized P1a **specification design** on 2026-08-11 and,
after reviewing a detailed plain-language explanation, explicitly accepted all
four material boundary choices:

1. P1a owns development/evidence; P1b owns installation.
2. The initial profile contains only real FVG and
   `trusted-built-in-core-v1`.
3. The developer test process is separate from the future production Worker.
4. `.v7dk.tar` never conveys installation or execution authorization.

This document is therefore the accepted P1a contract. The explanatory record
is `V7_AGENT_NATIVE_PLUGIN_DEVELOPER_KIT_P1A_RATIONALE.zh-CN.md`, and the
acceptance evidence is
`../sessions/session_20260811_p1a_agent_native_developer_kit_specification_acceptance.md`.
Until the product owner separately directs implementation:

- H116 stays `declared` with no Harness or acceptance evidence;
- `v7-harness-rules.json` keeps P0b as the current implemented step;
- no Developer Kit source, SDK package, compiler dependency, fixture, archive,
  MCP server, installer, or production behavior is authorized.

The next decision is whether to authorize the bounded P1a implementation
exactly as specified. P1b local packages/MCP, P2
registry, P3a Worker execution, P3b Pine migration, new business plugins, and
Marketplace remain separately gated.
