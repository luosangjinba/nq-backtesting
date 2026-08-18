# Session — R13.10d FVG Evidence Inspector And Validated Override

Date: 2026-08-10

Status: accepted and closed 2026-08-10

## Outcome

R13.10d adds the first editable host-rendered Semantic Inspector without
adding a production toolbar or a Plugin Center. The generic Interaction owner
renders no HTML itself and contains no FVG field branch: it consumes a bounded
Registry-validated schema, owns only one local exact-revision draft and
transient Preview, and submits one branded candidate to Annotation Runtime.

The Core FVG Plugin now exposes Semantic, Evidence, and History groups. It
keeps the strict three-Bar lower/midpoint/upper baseline immutable while
allowing lower and upper effective bounds to narrow inside that baseline. The
midpoint is recomputed, all three parameters share append-only override events,
and exact baseline bounds form an audited reset rather than deleting history.

## Binding Decisions

- An override is editable only at the Artifact's original observation Replay
  cutoff. Before that cutoff the Inspector exposes no semantic values; after
  it the Artifact is visible but read-only.
- Registry revision drafts are opaque, Registry-local, package-generation-
  bound, and tied to one exact source Artifact revision.
- Annotation Runtime remains the sole document writer and reuses existing
  history plus Repository prepare/apply/finalize/rollback.
- Preview and durable rollback are proven independently; the production
  mounted-surface composition remains R13.10e scope.
- A dirty Preview keeps accepted document bytes intact but suppresses the same
  accepted Chart projections, so the user sees one FVG rather than overlapping
  accepted/Preview labels. Cancel restores accepted projections and Apply
  settles to the new single accepted layer.
- Package disable/absence preserves raw Artifact attributes and construction
  identity in the existing unresolved read-only Inspector.
- No Plugin Center, installer, Community registry, SDK, detector, MA/SMA,
  Fibonacci, production toolbar, or new state owner enters this step.

## Upstream Review

Lightweight Charts 5.2 Series Primitive `attached`/`detached`,
`requestUpdate`, and `updateAllViews` remain sufficient for Chart-owned
Preview refresh. The official Rectangle Drawing Tool demonstrates mutable
options plus `requestUpdate`, but combines toolbar DOM, Chart subscriptions,
drawing state, and primitive attachment, so only its primitive-update pattern
fits V7 ownership. The current awesome-tradingview catalog supplies no mature
host-rendered semantic Inspector satisfying V7 evidence, exact revision,
no-future, disposal, and sole-owner rules. No dependency was added.

## Automated Evidence

- `node v7/tests/fvg-evidence-inspector-override-harness.js` passes H112 with
  16 negative controls.
- The gate covers bounded schema failures, inner-zone validation, immutable
  baselines, append-only audit identity, reset, stale/foreign/disabled-
  generation drafts, no-future states, undo/redo, durable reload/export/import,
  Repository rollback, Preview rollback/cancel/dispose, unresolved survival,
  and package re-enable.
- Focused real Chromium proves host-rendered controls, Preview/save/reset,
  recoverable visible rejection of crossing bounds without an accepted
  document mutation, single-layer Preview/Cancel/Apply settlement, unchanged
  candle bytes, and native wheel/drag behavior against Lightweight Charts 5.2.
- Existing R13.10c/H111 and R13.9/H107 semantic paths remain regression gates.
- Production assembly remains 62 modules and now executes 29 declared
  optional-removal cases, including omission of the Inspector's optional
  Semantic Registry capability.
- The complete sequential sweep invokes all 112 top-level Harnesses. One
  hundred nine pass directly; the only three non-zero exits are the exact
  pre-existing H091 Session date-picker, mixed-Pane, and Replay Workspace
  candle-body visual gates. The production regression matrix itself passes all
  eight scenarios across eleven axes while reproducing its two declared known
  failures exactly. No visual baseline was re-recorded.
- The sweep used the configured acceptance DuckDB through the V7-owned
  read-only market-data service. Its temporary loopback process was stopped
  afterward, and the pre-existing `v4-api.service` was restored active with a
  passing `/v4/health` response.
- Current production source evidence is 582 files, 52,593 effective lines, 5,470 functions, and 558 public exports, with no source-size/function
  exception and no validation finding.

## Human Gate — Accepted 2026-08-10

The focused local gate was:

`http://127.0.0.1:8002/v7/tests/fixtures/fvg-evidence-inspector-override/`

The first review found that the unchanged accepted FVG projections and the
dirty Preview projections were simultaneously visible. Persistence semantics
were correct, but duplicate zones and labels were not accepted visual
behavior. The fixture composition now suppresses only the accepted Chart layer
while retaining accepted document bytes, shows one Preview FVG, restores the
accepted layer on Cancel, and settles to one accepted layer on Apply. H112 was
extended to assert `accepted visible 0 · preview 2` during a dirty Preview and
`accepted visible 2 · preview 0` after Cancel/Apply.

After that correction and automated rerun, the user accepted the full
Semantic/Evidence/History Inspector, effective/baseline presentation, validated
edit/reset flow, before/at/after observation states, Core Plugin disable/
re-enable behavior, single-layer Preview settlement, and unchanged Chart
navigation. H112 is accepted. The temporary acceptance server was stopped.

R13.10d closes as one independent commit after the final post-acceptance gate
rerun. R13.10e production manual workflow and the general Plugin Center remain
separately unauthorized.
