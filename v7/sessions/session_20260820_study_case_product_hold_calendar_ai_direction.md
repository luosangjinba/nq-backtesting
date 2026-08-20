# Session — Study Case Product Hold, Calendar Direction, And Standalone AI Tooling Candidates

Date: 2026-08-20 PDT

Branch: `feature/v7-drawing-semantic-annotation`

Starting commit: `a52a9ca2`

Status: reversible product withdrawal implemented and affected automated gates
closed; two documentation candidates await product-owner review; no Calendar,
geometry migration, order workflow, AI tool repository, or upstream dependency
implemented

## Product-Owner Direction

The product owner clarified that the retained Study Case concept is an
execution-free price-action/model-occurrence study, rejected the current
form-first capture experience, and required it to be removed temporarily.
Later observation/research operations should happen on the Chart and become
visible there.

Before redesigning Study Case or review orders, the product owner requested:

- a floating Chart Calendar showing which dates contain research, review, or
  other future activity and allowing immediate location;
- consistent background parameters for geometrically anchored elements;
- standalone AI-assisted plugin authoring and Pine migration software, with a
  GitHub reuse search before custom implementation; and
- explicit consideration of Python indicator source as easy migration input.

The product owner accepted the recommendation that V7 keep strict TypeScript
to ES2022 ESM as its sole executable plugin path while standalone tooling may
accept natural language, Pine, and Python and use Python as a differential
oracle. No Python browser/plugin runtime is added.

## Local Ownership Audit

The existing production catalog already encoded the exact removable Campaign
closure. Omitting only `adapter.validation-campaign-ui` cascades to all eight
modules while Session, Replay, FVG, SMA, and stored bytes remain independent.
The prior production-host browser Harness already proved this optional-removal
shape.

The current `calendar-surface` owns only a pure date-picker/month-grid model. It
has no Study Case, order, Journal, Replay, or business truth and is suitable for
reuse beneath a separate Activity Calendar surface.

The existing exact-Go-To path dispatches through application composition into
Workspace/Replay owners. A Calendar must use that path rather than write Chart
or Replay directly. Workspace already has a DOM overlay layer suitable for an
accessible floating Calendar; Canvas/Series Primitives remain Chart-owned
projection mechanisms.

Drawing appearance is currently duplicated: Annotation Runtime and Annotation
projection normalize `fillColor`/`fillOpacity`, while FVG projection/package
code has separate bullish/bearish fill/stroke defaults. The candidate therefore
proposes a host-owned stroke/fill appearance contract and pixel-preserving
migration, not a geometry-type rewrite.

The existing P1a Developer Kit is already the canonical library/CLI engine for
discover, scaffold, validate, build, test, preview, pack, and inspect. A future
AI product should wrap it rather than reimplement its validators or builds.

## Implemented Product Hold

Added `app/production-product-policy.js` as the explicit application-
composition owner of build-time product omissions. The default Session product
omits `adapter.validation-campaign-ui`; `core-plugin-boot-supervisor` unions the
product hold with every Core Plugin profile's own omissions for each boot
attempt.

Default product results:

- the complete eight-module Campaign closure is not instantiated;
- Campaign public code and stylesheet are not loaded;
- Validation navigation, route UI, and Replay Pane capture actions are absent;
- a direct `#/campaigns` URL renders the Session list rather than Campaign UI;
- existing `v7.validation-campaign:*` bytes remain exactly untouched;
- no Campaign source, descriptor, persistence key, state-sync allowlist, or
  historical screenshot was deleted.

The H121 browser Harness now boots the complete retained prototype through
`tests/fixtures/validation-campaign/` instead of the default product route. The
H121 Node/domain/transaction evidence remains available. H121 is still
`executable`, human-review-required, and unaccepted; its former focused product
review is explicitly superseded.

Session Browser navigation now derives Validation-link availability from the
optional Campaign surface instead of rendering a dead link unconditionally.

## Successor Architecture Candidates

`docs/V7_CHART_ACTIVITY_CALENDAR_AND_WORKFLOW_LENSES_CANDIDATE.md` proposes:

- one shared Chart/Replay/Session/Calendar foundation;
- distinct native truth owners for Research observation, Replay practice,
  retrospective/counterfactual review, and imported execution;
- one explicit active authoring context controlling writes/time policy, plus
  independently visible read-only lenses;
- a bounded `ChartActivitySummary` provider and rebuildable Activity Index;
- an accessible DOM Calendar overlay using metadata rather than Bars;
- location only through Session/Replay/Workspace and exact-Go-To owners;
- one host-owned stroke/fill appearance contract; and
- a later Chart-native `Add sample` workflow after those foundations.

Only the product hold is binding/implemented. Decisions 2–10 await review.

`docs/V7_AI_PLUGIN_AUTHORING_AND_MIGRATION_STUDIO_CANDIDATE.md` proposes two
independently runnable standalone workflows sharing a small Studio substrate:
AI Plugin Author and Pine/Python Migration Studio. Both target ordinary P1a
strict-TypeScript workspaces and require deterministic/differential evidence
plus explicit human export. Decisions 2–10 await review.

## Official And GitHub Reuse Audit

Before proposing Chart work, the review checked official Lightweight Charts
plugin/marker/examples documentation and the official awesome-tradingview
inventory. Upstream provides rendering mechanisms and examples but no Activity
truth/index, authoring-context, Calendar, or exact V7 location owner.

Agent Reach diagnostics found the GitHub CLI unauthenticated and the preferred
Exa backend unavailable without an API key. Tavily and direct official GitHub
sources were used as the read-only fallback. `agent-reach check-update` later
could not resolve its update host after three DNS retries; this affected no
research result or V7 dependency.

The strongest repositories were shallow-cloned only into a temporary `/tmp`
audit directory for license/API/test/source inspection:

- OpenHands Software Agent SDK: MIT Python/REST agent engine with typed custom
  tools, structured output, security hooks, and local/ephemeral workspaces;
- goose: Apache-2.0 local desktop/CLI/API agent with ACP/MCP integration;
- Opus Aether `pine-transpiler`: MIT, TypeScript-first lexer/parser/AST and
  exported compiler stages with extensive contract/corpus tests; strong Pine
  front-end candidate, but its PineJS target is not V7's runtime;
- PineTS/OpenPineScript: broad semantic references with AGPL/GPL integration
  consequences;
- `lightweight-charts-indicators`: MIT and formula-rich but coupled to
  `oakscriptjs`, with community-port provenance requiring per-indicator audit;
- TA-Lib Python and pandas-ta-classic: strong permissive Python numerical
  oracles and fixture sources, not production V7 runtimes.

No source was copied into V7 and no package, license obligation, network
runtime, agent provider, or dependency was selected.

## Verification

Passed after the final product-policy, fixture, documentation, generated-
evidence, and Developer Kit release-identity refresh:

- `V7_H121_SKIP_BROWSER=1 node v7/tests/validation-campaign-harness.js` — 19
  negative controls, exact eight-module product omission, H117/H121 state
  unchanged;
- `node v7/tests/study-case-product-hold-browser-harness.js` — actual default
  product loads no Campaign code, style, navigation, or route, preserves a
  sentinel Campaign record byte-for-byte, and reports no browser error;
- `node v7/tests/production-application-host-browser-harness.js` — default
  product closure omission, no Validation navigation/code/style, preserved
  Campaign sentinel bytes, Session/Replay survival, lifecycle rollback and two
  existing negative controls;
- `node v7/tests/production-module-assembly-harness.js` — 84 public entries, 35
  lifecycle modules, and 75 optional-removal cases;
- `node v7/tests/session-browser-ui-independent-browser-harness.js` — public
  Session Browser boot, state-sync retry/conflict, and disposal;
- `node v7/tests/production-writer-closure-harness.js` — 28 surfaces, 34
  observed writer files, and eight negative controls;
- `node v7/tests/deployed-runtime-architecture-harness.js` — eight deployed
  components, 13 writer surfaces, and 15 negative controls;
- `node v7/tests/server-state-sync-harness.js` — exact hydration, rejected
  upload, retry, ordering, and conflict coverage;
- `node v7/tests/architecture-hardening-harness.js` — 121 rules and 15 negative
  controls;
- `node v7/tests/architecture-boundary-harness.js` — production boundary and
  independent-Harness ownership checks;
- `node v7/tests/production-architecture-harness.js` — 84 modules, 183 edges,
  155 construction sites, 34 writers, zero findings, and 15 negative controls;
- `node v7/tests/source-quality-harness.js` — 643 production files, 60,137
  effective lines, 6,157 functions, 650 public exports, and 22 negative
  controls;
- `node v7/tests/plugin-developer-kit-harness.js` (H116) — all eight canonical
  operations, trusted package Harnesses, and 20 negative controls; and
- `node v7/tests/local-plugin-package-harness.js` (H117) — contract/archive,
  transaction/recovery, production browser, unpacked-candidate security, and
  all registered negative groups.

The canonical plugin release identity was regenerated because the new
production policy legitimately changed the pinned Developer Kit source digest;
H116 and H117 both pass against the refreshed identity. `git diff --check`
also passes.

The complete legacy H121 browser journey successfully boots the isolated
Campaign fixture, creates and reloads its Campaign, and reaches the real Session
dialog. It cannot finish in this workspace because the date-availability call
depends on port 8766, currently owned by an unrelated V4 service whose market
dataset does not satisfy this fixture. The test times out waiting for
`dateAvailabilityState === 'ready'`. No process was stopped or replaced. This
external-service limitation does not weaken the new default-product hold,
which has its own self-contained passing browser Harness; H121 remains
unaccepted and its Node/domain evidence remains passing.

## Exact Next Boundary

Obtain product-owner review of ADR-V7-007 decisions 2–10 and ADR-V7-008
decisions 2–10. Do not infer Calendar, geometry migration, order,
Research/Review/Journal, another repository, upstream dependency, P1b.4,
P3a/P3b, or H121 acceptance authority from this session.

## Later Product-Owner Update — 2026-08-20 06:55 PDT

The exact-next-boundary paragraph above is retained as this implementation
session's original close, but it is no longer the immediate product action.
The product owner paused candidate review and successor implementation to
develop the software portrait, Plugin/business architecture, and three-minute/
three-step interaction standard. The Notion/Obsidian/Excel origin, read-only
workbook evidence, hindsight-versus-pseudo-live provenance, and atomic Plugin
versus customizable Model versus semantic Setup correction are durably
captured in
`../docs/V7_CHART_NATIVE_RESEARCH_MODEL_SETUP_PLUGIN_BOUNDARY_PREDECISION_MEMO.md`
as MEMO-V7-006. Resume with that non-binding memo and continue discovery before
reconciling ADR-V7-007 or ADR-V7-008.
