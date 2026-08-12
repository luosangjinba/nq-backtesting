# Session — P0a Built-In Plugin Contract Substrate

Date: 2026-08-10

Branch: `feature/v7-drawing-semantic-annotation`

## Outcome

Implemented the separately authorized P0a thin waist and accepted H113 by
automated evidence. P0a adds `core.plugin-contract`, a pure contract module for
portable built-in manifests, host-rendered parameter schemas, scoped effective
settings, capability/dependency plans, and read-only plugin status projected
from a public ModuleHost snapshot. It does not add a second lifecycle host.

The existing `first-party.fair-value-gap` package is the first conformance
package. Its outer manifest binds the existing semantic type and construction
tool, maps the already accepted Semantic/Evidence/History Inspector groups,
and deliberately declares no Style or Visibility controls that lack production
behavior. The inner R13.10c/R13.10d package, durable records, projection, and
override semantics remain unchanged.

## Contract Boundary

- `core.plugin-contract` accepts only Core/built-in/first-party manifests with
  empty permissions in P0a and retains no host, DOM, Chart, storage, filesystem,
  network, or package bytes.
- `core.module-host` remains the sole construction/start/stop/disposal owner.
- Manifest and parameter wires are exact JSON-compatible records with matching
  Draft 2020-12 JSON Schemas.
- Dependency planning rejects missing/incompatible/colliding capabilities,
  invalid extension targets, descriptor mismatches, manifest/required-port
  divergence, and cycles before startup.
- Parameter resolution is pure and records exact precedence:
  `instance > profile > package > definition-default`.
- Executable plugin authoring remains standardized on the ADR-V7-004 strict
  TypeScript SDK direction with pinned ES2022 ESM output. P0a only adapts the
  existing trusted-build JavaScript package and does not prematurely create SDK
  or external-code execution tooling.

## Upstream Audit

The official Lightweight Charts 5.2 plugin documentation and the
awesome-tradingview catalog were rechecked. Their Custom Series/Primitive and
`create-lwc-plugin` patterns remain useful only behind V7's Chart adapter; they
do not provide the package, permission, settings, evidence, or lifecycle
substrate needed here. P0a therefore introduces no third-party dependency and
exposes no raw Chart/Series/Canvas handle.

## Verification

- H113 passes 25 declarative negative controls, settings precedence, portable
  round trips, FVG outer/inner identity, and real ModuleHost start/stop/status
  plus derived-port injection/reverse-disposal proofs.
- H111 and H112 remain green, including their 18 and 16 negative controls.
- The complete sequential sweep invokes all 113 top-level Harnesses. One
  hundred ten pass directly; the only three non-zero exits are the exact
  pre-existing H091 mixed-Pane, Replay Workspace, and Session date-picker pixel
  gates. The production regression matrix passes while reproducing its declared
  known failures, and no visual fixture was re-recorded.
- After the final dependency/required-port parity hardening, a repeat sweep
  reproduced those same three gates plus one Chromium temporary-profile cleanup
  race in the otherwise-passing Annotation Chart Projection Harness; its
  immediate isolated rerun passed all 30 negative controls. There is no new
  product, contract, or rendering assertion failure.
- Production assembly contains 63 public entries, 26 lifecycle modules, and 29
  optional-removal cases; the new contract is non-removable and the FVG package
  consumes it as a required public port.
- Current source evidence is 467 files, 39,300 effective lines, 4,115 functions, and 434 public exports with no accepted size or function exception.
- Current architecture evidence is 63 modules, 136 actual dependency edges,
  115 construction sites, 18 declared writer surfaces, 23 writer sites, and no
  new writer authority.
- P0a changes no DOM, route, control, renderer, or pixel, so H113 correctly has
  no human visual gate.
- The acceptance DuckDB was served temporarily through the V7-owned read-only
  API for browser regression; afterward the original legacy 8766 API was
  restored under transient user unit `v4-api-restored.service`, and its
  `/v4/health` endpoint returned version 4.0 `ok`.

## Scope Left Closed

R13.10e remains the next planned but unauthorized production FVG workflow
slice. P0b Plugin Center, P1 file/unpacked installation and SDK tooling, P2
Community registry, P3 Worker execution, MA/SMA, Fibonacci, detector, and
Marketplace remain outside P0a.

Binding contract: `docs/V7_BUILT_IN_PLUGIN_CONTRACT_SUBSTRATE_P0A.md`.
