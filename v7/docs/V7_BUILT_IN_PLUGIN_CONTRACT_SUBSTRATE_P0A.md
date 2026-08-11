# V7 Built-In Plugin Contract Substrate — P0a

Status: implemented and automatically accepted 2026-08-10

Date: 2026-08-10

Depends on: accepted ADR-V7-004 amendment, R13.10c–R13.10d, ModuleHost, and
H111–H112

Harness: H113 / `tests/plugin-contract-substrate-harness.js`

## Outcome

P0a creates the smallest common plugin boundary required before R13.10e or a
second plugin family. It adds one pure Kernel contract for built-in plugin
manifests, versioned contributions, capability planning, host-rendered
parameter schemas, scoped effective settings, and read-only status projection
from the existing ModuleHost snapshot. The existing Core FVG package is the
first conformance package.

P0a does not add a Plugin Center, product toolbar, dynamic enable command,
installer, local file access, Community registry, public SDK, TypeScript build,
Worker, network, persistence namespace, or new visual behavior. R13.10e remains
a separate production vertical slice.

## Upstream Reuse Decision

Lightweight Charts 5.2 officially supports Custom Series, Series Primitives,
and Pane Primitives. Its Primitive interface deliberately supplies Chart/
Series handles, Canvas renderers, `attached`/`detached`, and update callbacks:

- <https://tradingview.github.io/lightweight-charts/docs/plugins/intro>
- <https://tradingview.github.io/lightweight-charts/docs/plugins/series-primitives>

The official plugin examples and awesome-tradingview catalog confirm that
`create-lwc-plugin` and the example packages are rendering scaffolds rather
than a package-management, permission, evidence, or host-settings substrate:

- <https://github.com/tradingview/lightweight-charts/tree/master/plugin-examples>
- <https://github.com/tradingview/awesome-tradingview>

P0a therefore adds no dependency and exposes no vendor object. Existing
Chart-owned adapters may continue to adapt official Primitive lifecycle
patterns behind V7 projection contracts.

## Owner Boundary

```text
core.plugin-contract
  owns: pure manifest/schema/plan/status/settings validation
  receives: portable records, module descriptors, ModuleHost snapshots
  never owns: activation, package bytes, settings persistence, UI, Chart

core.module-host
  remains: sole module construction/start/stop/disposal owner

domain contribution registries
  remain: validators/resolvers for semantic, drawing, indicator, or later
          contribution generations

optional.semantic-fair-value-gap
  owns: FVG package metadata plus existing FVG policies
  depends on: core.plugin-contract through its public entry only
```

There is no `PluginHost`. The P0a contract has no `enable`, `disable`, `start`,
`stop`, `dispose`, install, or update method. A later composition generation
may choose which built-in module definitions enter ModuleHost; P0a only proves
the candidate metadata and reads resulting host status.

## Built-In Manifest V1

The trusted-build manifest is portable and contains no function or entrypoint:

```text
PluginManifestV1 {
  manifestVersion: 1
  packageId
  packageVersion
  module: { id, version }
  display: { name, description }
  distribution: {
    tier: core
    source: built-in
    publisherId
    trust: first-party
  }
  hostApiRange
  capabilities: {
    provides: [{ id, version }]
    requires: [{ id, range }]
    extends: [{ id, range }]
  }
  contributions: [{ id, kind, version, displayName, parameters? }]
  permissions: []
  conformance: { harness }
}
```

P0a accepts exact semantic versions and caret-compatible ranges. Package,
module, capability, and contribution ids are bounded. Package/contribution ids,
provided capabilities, and module bindings are unique. Every contribution must
have a matching provided capability. `requires` may resolve against an explicit
host capability or another built-in package; `extends` must resolve to another
package contribution. Missing, incompatible, colliding, self-requiring, or
cyclic graphs fail before ModuleHost starts.

Only `tier: core`, `source: built-in`, `trust: first-party`, and an empty
permission list are accepted. P0a has no executable entrypoint or arbitrary
permission field. These restrictions are a phase boundary, not the future
Community manifest's final limits.

The manifest's module id/version must equal one normalized optional/removable
V7 descriptor which declares `core.plugin-contract` as a required port. This
binds product plugin identity to the existing ModuleHost graph without changing
descriptor `kind` semantics. Every manifest dependency on another built-in
package must also appear as that package module's `requiredPorts` entry, and no
plugin-module required port may exist without the matching manifest dependency.
This makes ModuleHost's injection/start/disposal graph identical to the public
capability graph.

## Contribution And Parameter Contract

P0a reserves contribution kinds for semantic types, tools, indicators,
drawings, and workflows. A contribution may declare one portable parameter
schema. The host owns the five tab meanings and order:

```text
inputs -> style -> visibility -> evidence -> history
```

Each tab has exactly one source:

- `settings` supplies bounded declarative fields for Inputs, Style, or
  Visibility;
- `inspector-groups` maps host-validated domain Inspector group ids into an
  applicable tab. Evidence and History may only use this read-only/domain-
  validated source in P0a.

Settings fields declare id, label, control, default value, and allowed scopes.
P0a supports boolean, finite bounded number, color, bounded text, and finite
select controls. Values remain portable. Field and tab ids are unique and
bounded; unknown keys, functions, DOM/vendor objects, cycles, invalid defaults,
or invalid controls fail closed.

The pure resolver accepts independent package, profile/default, and instance
maps. It rejects unknown fields, disallowed scopes, and invalid values, then
returns each effective value plus exact source with precedence:

```text
instance > profile > package > definition-default
```

It persists nothing. Semantic evidence and R13.10d Artifact overrides are not
settings and never enter this resolver.

## FVG Conformance Manifest

`first-party.fair-value-gap@1.0.0` binds to
`optional.semantic-fair-value-gap@1.0.0` and publishes:

- `semantic.imbalance.fvg@1.0.0`;
- `construct.imbalance.fvg@1.0.0` with contribution kind `tool`.

It requires the existing evidence-bundle and Rectangle/Segment geometry host
capabilities. Its Semantic contribution maps the existing `semantic`,
`evidence`, and `history` Inspector groups to Inputs, Evidence, and History.
Style and Visibility stay absent until a later step connects real settings;
P0a must not advertise controls which do not affect production behavior.

The outer plugin manifest and inner Semantic package must retain identical
package/type/tool versions. Existing construction, projection, Inspector,
override, durable bytes, and no-future behavior remain byte-compatible.

## ModuleHost Status Bridge

The built-in plan is immutable. A status projection consumes only its branded
plan and a public ModuleHost snapshot:

| ModuleHost | Plugin status |
| --- | --- |
| `idle` / `stopped` | `disabled` |
| `starting` | `activating` |
| `running` | `active` |
| `stopping` | `deactivating` |
| `failed` | `failed` |

A snapshot whose module ids do not contain every planned package module fails
as foreign/mismatched. The contract cannot invoke or retain the host.

## H113 Automated Gate — Accepted

H113 must prove:

- exact branded manifest and parameter schemas plus portable JSON round trip;
- Core/built-in/first-party/empty-permission phase restrictions;
- package, module, contribution, capability, version, host-API, dependency,
  extension, descriptor-port parity, and cycle failures;
- settings tab/source/control/scope bounds and deterministic precedence;
- FVG outer-to-inner package/type/tool identity and Inspector-group mapping;
- the real FVG descriptor declares the plugin contract port and survives
  optional removal;
- actual ModuleHost start/stop owns FVG lifecycle and a synthetic derived
  package receives only its declared upstream public port before reverse-order
  disposal, while the contract exposes only read-only status projection;
- no raw Chart/Series/Canvas/DOM, Bar Data, Replay, Workspace, persistence,
  filesystem, network, loader, Worker, or lifecycle command enters the module;
- H111/H112 behavior remains unchanged and all architecture, source-quality,
  writer, deployment, JSON, optional-removal, and diff gates remain green.

H113 requires no human visual review because P0a adds no DOM, route, control,
Chart primitive, or changed pixel.

H113 passes 25 negative controls. The complete 113-Harness sequential sweep
has 110 direct passes; its only non-zero exits are the exact three pre-existing
H091 visual gates. No visual baseline was re-recorded.

## Explicit Exclusions

- R13.10e production Picker → Evidence → FVG workflow;
- P0b Core Plugin Center and user-facing enable/disable;
- P1 archive/unpacked loading, packaging, migrations, settings persistence, or
  TypeScript SDK tooling;
- P2 Community discovery/signing/update/restricted-mode operations;
- P3 executable Worker/WASM runtime;
- MA/SMA, Fibonacci, detector, Setup, AI, Marketplace, or product-scope change.
