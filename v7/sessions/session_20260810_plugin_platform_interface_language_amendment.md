# Session — Plugin Platform Interface And Language Amendment

Date: 2026-08-10

Status: accepted documentation amendment; no plugin-platform implementation
authorized

Decision: amendment to `ADR-V7-004`

## Product-Owner Direction

After accepting R13.10d/H112, the product owner supplied interaction references
for:

- Chrome extension management and Developer Mode load-unpacked/package flows;
- Obsidian Core and Community Plugin catalogs, installation, updates, settings,
  enable/disable, and Restricted Mode;
- TradingView's consistent Inputs/Style/Visibility parameter shell with
  plugin-specific controls.

The product owner asked whether V7 needs one interface capable of carrying
plugins, whether visual plugins should receive a common parameter panel,
whether the platform should precede plugin implementation, and which language
all plugins should use.

## Accepted Decisions

V7 builds a thin platform boundary before it scales plugin families, but does
not build an empty full Marketplace first. P0a freezes the manifest,
contribution, dependency/status, host-rendered settings, and ModuleHost bridge;
the existing FVG package is its first conformance consumer. R13.10e then closes
the production FVG workflow through that boundary. P0b adds the Core Center,
followed by local/developer packages, the signed free registry, isolated
calculation Workers, and only later a separately decided paid Marketplace.

All package sources use one candidate pipeline. Built-in metadata, registry
artifacts, local archives, and Developer Mode unpacked directories differ in
source/trust policy, not plugin API. Candidate discovery and validation never
execute code. The package surface stages a generation; the existing ModuleHost
remains the sole activation/disposal owner.

The host owns parameter UI. Contributions declare versioned schemas and
host-supported UI hints for applicable Inputs, Style, Visibility, and
Evidence/History tabs. Package, profile/default, and instance settings are
separate scopes. Accepted semantic evidence and validated overrides do not
become ordinary mutable settings.

The one executable authoring language is strict TypeScript. The supported SDK
build emits pinned ES2022 ESM. Trusted Core output may enter the application
build; external executable output may run only in a separately authorized
isolated Worker tier. Manifests and declarative contributions use JSON/JSON
Schema. Python and Pine are not runtime languages; custom plugin DOM is
forbidden; WASM is deferred beyond the initial SDK rather than becoming a
parallel language. Existing trusted-build JavaScript packages can be adapted
incrementally without a host-wide TypeScript migration.

## R13 Consequence

R13.10d remains accepted and unchanged. P0a and R13.10e remain unauthorized.
The next binding delivery specification must keep P0a minimal, use FVG as the
reference vertical slice, and exclude the visual Core Center, file/unpacked
loader, Community registry, public SDK, Worker runtime, detector, MA/SMA,
Fibonacci, and Marketplace implementation.

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

## Verification Result

- focused architecture boundary, hardening, source-quality, production-
  architecture, deployed-runtime, and ModuleHost Harnesses pass;
- the broad suite was attempted, and every Harness executed before the
  environment-dependent stops passed;
  `calendar-timeframe-browser-harness.js` repeatedly times out waiting for its
  external date-availability state, while `production-regression-matrix-
  harness.js` and `projected-history-real-api-browser-harness.js` stop because
  the required acceptance market-data health/API is unavailable (404/unknown
  endpoint); these are recorded environment prerequisites and no production
  source changed in this documentation amendment;
- `git diff --check` passes;
- form one documentation-only commit after the accepted R13.10d commit.
