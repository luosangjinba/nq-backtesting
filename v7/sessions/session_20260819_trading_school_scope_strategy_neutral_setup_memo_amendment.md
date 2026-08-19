# Session — Trading-School Scope And Strategy-Neutral Setup Memo Amendment

Date: 2026-08-19

Time: 01:46 PDT

Branch: `feature/v7-drawing-semantic-annotation`

Status: MEMO-V7-001 and MEMO-V7-005 amended; discussion only; no binding
product decision, delivery/Harness id, or implementation authorized

## Product-Owner Input

The product owner supplied a broad trading-school overview covering
Brooks-style price action, ICT, non-ICT SMC, Wyckoff, Elliott Wave, Market/
Volume Profile, classic trend following, CAN SLIM, quantitative/statistical
strategies, and order-flow/HFT. It was used as an architecture coverage stress
test, not imported as an authoritative formation or probability specification.

The product owner then clarified and selected two directions:

- a generic Setup must not require 1D/4h Analysis, any separately named
  Analysis stage, or a global rule that Analysis timeframe is higher than Entry
  timeframe; retained strategies may be single-timeframe, arbitrarily multi-
  timeframe, or have no separate Analysis role;
- V7 may abandon first-class support for trading schools assessed as requiring
  medium-high or lower architecture fit. The scope should remain focused rather
  than gaining specialized data, renderer, portfolio, or execution systems for
  those schools.

The product owner explicitly authorized updating the related Memos.

## Selected Memo Interpretation

The subjective architecture-fit rating is not persisted as a runtime/product
field. MEMO-V7-001 translates it into a durable capability boundary:

- SMC/ICT remains the primary product;
- Brooks-style price action, ordinary time-based OHLCV indicators, and bar-
  based discretionary trend research may use the existing extension contracts
  without becoming promised first-party packs;
- no first-class support commitment exists for dedicated Wyckoff phase/point-
  and-figure, Elliott alternative-count hierarchy, Market/Volume Profile,
  fundamental/universe, quantitative/portfolio, tick/depth/order-flow/HFT, or
  automated-execution infrastructure;
- incidental use of already admitted generic capabilities remains best-effort
  and cannot require new Kernel/Profile/data/renderer/business authority.

This cutoff applies to trading-school expansion, not to platform-capability
feasibility labels. Detector and Setup capabilities remain valid because the
retained ICT/SMC and price-action workflows may require them.

## Strategy-Neutral Setup Amendment

MEMO-V7-005 now proposes:

- one Case with definition-owned optional evidence roles rather than separate
  Analysis and Entry datasets;
- `SetupEvidenceRequirementV1` with open role identity, provider contract,
  cardinality, optionality, temporal relations, predicate, and a policy such as
  `any`, `fixed`, `one-of`, `same-as`, or `relative-to` for timeframes;
- no generic `analysisTimeframe`, `entryTimeframe`, Context Pane, Execution
  Pane, two-Pane shape, or global higher-than rule;
- immutable source instrument/timeframe/resolution per Evidence Citation while
  target Pane/timeframe remains reversible Chart-application state;
- source-labelled higher-to-lower projection such as a 1D FVG on 5m/1m, plus
  explicit lossy/Inspector-only/absent handling when lower-to-higher projection
  cannot preserve legibility;
- `SetupVisualGroupV1` as a collapsible application-layer composition over
  exact Case/Collection/element/explanation references, with decision,
  outcome, review, and compare modes and no new truth ownership;
- numbered/role tokens and Inspector linkage across Panes instead of arbitrary
  screen-space connector lines across unlike coordinate systems.

The FVG + SMA Demo's Context/Execution Pane requirements remain confined to
`demo.sma-trend-manual-fvg@1.0.0`. The Demo candidate itself was not edited,
accepted, or expanded.

## Documentation Updated

- `../docs/V7_GENERAL_FUTURES_PLUGIN_PLATFORM_PREDECISION_MEMO.md`;
- `../docs/V7_STUDY_COLLECTION_DASHBOARD_CHART_APPLICATION_VISUAL_GRAMMAR_PREDECISION_MEMO.md`;
- `../docs/V7_NON_DECISION_MEMO_REGISTRY.md`;
- `../docs/INDEX.md`;
- `../TODO.md`;
- `../docs/V7_EXECUTION_ROADMAP.md`;
- `../docs/V7_RESTART_HANDOFF.md`;
- `../docs/V7_TASK_NUMBERING.md`;
- this amendment record.

MEMO-V7-005 now contains seventeen open product decisions. Both Memos remain
non-binding and retain their stable ids/paths and append-only position history.

## Preserved Boundaries

- no binding product-scope document or accepted ADR/specification was changed;
- no production source, SDK, schema, manifest, catalog, runtime, storage,
  state-sync, route, UI, fixture, dependency, or Harness metadata was changed;
- no delivery or Harness id was allocated;
- no plugin or algorithm was added and no unsupported data/renderer capability
  was introduced;
- the pending FVG + SMA candidate's ten decisions remain awaiting their own
  explicit review;
- H117 remains `executable`, human-review-required, unaccepted, with
  `acceptanceEvidence: null`;
- P1b.4, P1c.4/H121, Community/Worker, Dashboard/Collection, Journal,
  Dataset Builder, AI, and all business implementation remain paused.

## Verification

The documentation-only change passed:

- `node v7/tests/architecture-hardening-harness.js` — 120 rules and 15
  negative controls;
- `node v7/tests/architecture-boundary-harness.js`;
- `node v7/tests/production-architecture-harness.js` — 76 modules, 174 edges,
  143 construction sites, 31 writer sites, zero blocking findings, and 15
  negative controls;
- `node v7/tests/production-module-assembly-harness.js` — 76 public entries,
  33 lifecycle modules, and 53 optional-removal cases;
- `node v7/tests/production-writer-closure-harness.js` — 25 surfaces, 31
  observed writer files, and 8 negative controls;
- `node v7/tests/deployed-runtime-architecture-harness.js`;
- `node v7/tests/source-quality-harness.js` — 582 production files, 558 public
  exports, and 22 negative controls;
- `node v7/tests/server-state-sync-harness.js`;
- `node v7/tests/plugin-developer-kit-harness.js` — H116 passes;
- `node v7/tests/local-plugin-package-harness.js` — H117 passes all 54 frozen
  negative controls plus contract, transaction, storage, unpacked-security,
  and real-browser product evidence while remaining unaccepted;
- `node v7/tests/calculated-series-pure-contract-harness.js` — H118 passes and
  reports H117 unchanged;
- `node v7/tests/calculated-series-chart-projection-harness.js` — H119 passes;
- `node v7/tests/core-moving-averages-harness.js` — accepted H120 formula and
  real production-route browser/timeframe/four-Pane evidence pass while
  reporting H117 unchanged;
- `git diff --check`.

No generated Developer Kit, fixture, or source-quality baseline required
refresh.

## Next Decision Boundary

The exact pending product action remains explicit review of decisions 1–10 in
the FVG + SMA Validation Campaign / Study Case Demo candidate. MEMO-V7-001 and
MEMO-V7-005 remain separate non-decision context; their amendment allocates no
implementation and does not enter that review implicitly.
