# Session — Core And Community Plugin Model Specification

Date: 2026-08-10

Status: accepted documentation decision; no plugin-platform implementation
authorized

Decision: `ADR-V7-004`

## Authorization And Scope

After explicitly accepting R13.10c, the product owner directed V7 to preserve
the preceding Core/Community plugin discussion as a specification and adjust
R13.10 or later planning around it. The product owner classified common,
foundational capabilities including FVG, MA/SMA, BSL, and Fibonacci as Core
Plugins and stated that other plugins may derive from them.

R13.10c was first closed in its independent implementation commit
`5088fc99`. This session changes documentation and planning only. It does not
alter that accepted code, add a loader/installer/Plugin Center, implement a new
indicator or semantic capability, or authorize R13.10d/e.

## Accepted Result

`ADR-V7-004` binds three distinct layers:

- Kernel owners remain non-plugin infrastructure and keep descriptor
  `kind: "core"` only for the existing architecture meaning;
- product-facing Core Plugins are built-in, first-party, independently
  enableable/disableable optional capabilities with versioned baselines;
- Community Plugins are explicit installations governed by least privilege,
  sandbox/resource tiers, transactional lifecycle, and safe/restricted mode.

The initial Core capability catalog contains strict versioned FVG, manual
BSL/SSL liquidity levels, MA/SMA indicators, and manually anchored Fibonacci.
Automatic formation/swing selection, mitigation, sweep detection, OTE,
crossover, trend-regime, confluence, and strategy interpretation remain
derived contributions rather than silent changes to the Core definitions.

Derived plugins must declare public compatible capabilities. They may not
import another plugin's internals, control its UI/state, or acquire Chart,
Replay, Bar Data, Workspace, Annotation-store, persistence, DOM, filesystem, or
network authority through dependency.

## Planning Consequences

- R13.10d remains the separately specified host-rendered Evidence Inspector and
  validated-override slice.
- R13.10e remains the separately specified production manual FVG workflow
  closure and must expose FVG through generic built-in package metadata rather
  than a route-level semantic branch.
- Neither step absorbs a general Plugin Center or Community loader.
- R13.11/R13.12 remain first-party Core semantic candidates; R13.13 becomes the
  first explicit derived-detector dependency proof.
- The later plugin platform is staged as P0 trusted-build Core catalog/Center,
  P1 local declarative installation, P2 signed free Community registry, P3
  isolated Worker/WASM calculation extensions, and only then a separately
  decided P4 commercial Marketplace.

No P-phase has a delivery id or implementation authorization.

## Memo Promotion And Remaining Questions

`MEMO-V7-001` is partially promoted only for the plugin taxonomy, initial Core
classification, declared dependency direction, Plugin Center experience,
strict trust posture, and phased delivery sequence. It remains open for:

- general-futures product expansion;
- complete Setup workflow and AI capability ownership;
- exact loader, SDK, sandbox, registry, and operational implementation;
- remote distribution, commercialization, entitlements, payments, and paid
  Marketplace economics.

## External Product Evidence

Official Obsidian documentation was used only as product-management evidence:
its Community Plugins surface documents browse/install/enable/update/uninstall
workflows, and Restricted Mode documents third-party disable behavior. V7
explicitly rejects inheriting unrestricted application privileges and requires
trading-specific capability, no-future, privacy, and resource boundaries.

## Documentation Closure

The decision is discoverable through:

- `docs/V7_CORE_AND_COMMUNITY_PLUGIN_MODEL_SPEC.md`;
- `docs/V7_PRODUCT_AND_SCOPE.md`;
- `docs/V7_NON_DECISION_MEMO_REGISTRY.md`;
- `docs/V7_GENERAL_FUTURES_PLUGIN_PLATFORM_PREDECISION_MEMO.md`;
- `docs/V7_DRAWING_AND_SEMANTIC_ANNOTATION_FOUNDATION_R13_1.md`;
- `docs/V7_ARCHITECTURE.md`;
- `docs/V7_EXECUTION_ROADMAP.md`;
- `docs/INDEX.md`;
- `TODO.md`;
- `docs/V7_RESTART_HANDOFF.md`.

## Verification Intent

- parse the updated architecture manifest;
- run documentation/architecture governance Harnesses;
- confirm production source and architecture baselines remain unchanged;
- run `git diff --check`;
- create one documentation-only commit after the accepted R13.10c commit.
