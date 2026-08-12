# Session — P1a Agent-Native Plugin Developer Kit Implementation

Date: 2026-08-11

Status: implemented and accepted; H116 automated gate passed; no visual gate
required

## Authorization And Boundary

After accepting the P1a specification and its four material boundaries, the
product owner separately instructed: `授权按已验收的 P1a 规格开始实现。` The
implementation therefore delivers only the P1a authoring/evidence boundary.
It does not add P1b installation, Developer Mode, MCP, registry access,
Community execution, a production Worker, Pine migration, a new Core business
plugin, or product-visible UI.

## Delivered

- Added `sdk/plugin` with strict portable TypeScript types, a narrow immutable
  definition helper, 13 Draft 2020-12/public P0a Schemas, versioned capability,
  contribution, permission, UI-control, operation, diagnostic, profile, schema,
  and toolchain catalogs, plus deterministic reference examples.
- Pinned TypeScript `7.0.2`. The top-level compiler package and all 20 locked
  platform-optional compiler packages are Apache-2.0; every exact npm integrity
  value is frozen in `catalogs/toolchain.json` and checked against the lockfile
  before an operation runs.
- Added one canonical operation engine for `discover`, `scaffold`, `validate`,
  `build`, `test`, `preview`, `pack`, and `inspect`. The public Library and CLI
  are transport adapters over that engine and return the same canonical result,
  diagnostics, compatibility report, content hashes, and receipts.
- Added a closed developer workspace reader: normalized relative regular-file
  paths only, no symlinks/special files/undeclared files, exact P0a manifest
  reuse, static import/API controls, finite immutable fixtures, Replay cutoff
  enforcement, and deterministic capability resolution.
- Added fixed strict compilation in a disposable mirror. Candidate tsconfig,
  compiler plugins, lifecycle scripts, undeclared dependencies, DOM/Node/Worker
  ambient types, dynamic code/imports, remote imports, and unresolved emitted
  ESM are rejected; candidate configuration cannot weaken the profile.
- Added a disposable Linux test process with bubblewrap network/user/PID/IPC/
  UTS namespaces, a read-only build/fixture mount, empty environment, Node
  filesystem/child/worker denial, bounded time/memory/output, and a context-local
  VM module linker exposing only the synthetic SDK. Host-realm objects/functions
  are not passed to candidate code. If enforcement is unavailable, executable
  operations return `blocked` rather than running in the CLI process.
- Added exact bullish and bearish real-FVG construction/projection vectors,
  generic host-rendered control coverage, and a derived capability graph
  reference. The production FVG implementation and manifest were not rewritten.
- Added normalized deterministic ustar packaging and read-only inspection.
  Index, content, workspace/build/test/preview receipt bindings, ordering,
  padding, path, count/size, link/device, stale-toolchain, and authorization
  denials are verified without importing candidate modules. `.v7dk.tar` and
  every receipt explicitly deny install, activation, publisher trust, and
  production execution.

## H116 Evidence

`tests/plugin-developer-kit-harness.js` proves two clean root-independent
end-to-end flows are byte-identical, CLI/Library canonical output is identical,
all eight operations work offline after the toolchain is present, FVG vectors
run only in the isolated host, host parameters round-trip through P0a, derived
dependencies resolve stably, and every receipt preserves the P1a denials.

Its 20 cataloged negative groups each establish the valid baseline first and
then activate one violation. Together they cover request/version closure,
unsupported tiers, forged trust, manifest/permission closure, all dependency
graph failures, custom UI/owner handles, forbidden imports/APIs/dynamic code,
compiler weakening, path/symlink/special files, scaffold overwrite, ambient
inputs, Replay future reads/repaint claims, fixture mismatch, isolation/timeout/
child denial, stale output, bundle/index/receipt tamper, malicious tar entries,
and all install/activate/publish/registry/ModuleHost operation attempts.

The H116 release identity includes its Harness and negative fixture hashes.
H116 also reruns the public P0a Plugin Contract and real FVG semantic package
Harnesses. No human pixel review is required because P1a adds no visible
behavior.

## Architecture

All implementation lives under `sdk/plugin`, `tools/plugin-developer-kit`, and
`tests`. No production module, descriptor, constructor/writer inventory,
Plugin Center surface, Core profile, deployment component, or product pixel
changed. Tools import the read-only public P0a/FVG contract through one adapter;
production code never imports the SDK tools, fixtures, compiler, or Node APIs.
ModuleHost remains the only application lifecycle owner.

## Verification

- `node v7/tests/plugin-developer-kit-harness.js` passes H116 with 20 negative
  groups, both trusted reference Harnesses, exact TypeScript dependency
  license/integrity evidence, network namespace isolation, deterministic
  archive bytes, and no visual-review requirement.
- Production architecture, module assembly, writer closure, deployed-runtime,
  source-quality, P0a, P0b, ModuleHost, JSON/Schema parsing, and repository-wide
  regression gates pass with the unchanged production graph.
- The 117-Harness sweep closes with 114 direct passes after isolated reruns of
  resource/data-dependent gates. The only non-zero Harnesses are the three
  preserved H091 visual fixtures: Session date picker, mixed-Pane layout, and
  Replay Workspace. A test-only network namespace served the existing DuckDB
  read-only without disturbing the legacy V4 listener on host port 8766; the
  nine-scenario production regression matrix passed and reproduced its two
  inventoried visual findings exactly.
- `git diff --check` passes. No visual baseline was recorded.

## Next Gate

P1a and H116 are closed. P1b local installation/Developer Mode/MCP is only the
next separately gated program phase; it is not authorized by this session.
P2 registry, P3a Worker, P3b Pine migration, new business plugins, and
Marketplace remain separately gated.
