# V6 Three-Mode Shared Foundation Decision — Step 461

Status: accepted product/architecture constraint (2026-07-15)

## Decision

God View, Pseudo-Live, and Live Reproduction are three operating policies over
one Backtesting/Journal workstation. They are not three products, routes,
charts, replay runtimes, bar caches, drawing systems, or databases.

The names remain working product labels. A later UX Step may rename them
without changing the boundary in this decision.

## Mode Semantics

### God View

- full-history retrospective research and review;
- later outcomes may be visible;
- new judgments are permanently marked retrospective;
- it may inspect prospective artifacts, but cannot rewrite their provenance.

### Pseudo-Live

- historical Replay owns progression and the no-future boundary;
- observations and plans created before reveal are prospective evidence;
- later edits/reviews remain distinguishable from the original commitment;
- reveal and outcome evaluation only follow Replay-owned commands/events.

### Live Reproduction

- reconstructs a real trading session from timestamped user decisions and the
  market context that was visible at those times;
- preserves observation time, source, and visible-through provenance;
- reuses the same evidence, plan, execution, outcome, and review artifacts;
- does not authorize live market ingestion, broker connectivity, order
  routing, or a tick-accurate execution claim.

Until a separate data-source decision exists, Live Reproduction is an
import/review workflow, not a live-trading runtime.

## Shared Bricks

All three policies reuse these durable concepts:

- workspace/profile and instrument identity;
- session, sample/trial, playbook version, and campaign references;
- canonical time-price anchors, pane id, timeframe, and visible-state evidence;
- observation, trade plan, execution fact, outcome, review, and relations;
- prospective/retrospective provenance and auditable revisions;
- attachment/screenshot references and result-to-chart drillback;
- Settings/time presentation and user-facing validation errors.

The concepts remain distinct artifacts where the product decision requires it.
“Shared” does not mean collapsing them into one annotation or journal record.

## Shared Skeleton

- one App Shell and command/event buses;
- one Replay owner for cursor/reveal/no-future state;
- one Bar Data owner and target-timeframe projection path;
- one Chart Data/Viewport/Layout/Adapter ownership chain;
- one validation workflow coordinator that orchestrates but does not absorb
  feature owners;
- one persistence/migration boundary for product artifacts;
- one evidence/provenance capture boundary;
- one semantic-artifact registry and one chart-owned geometry/overlay
  projection boundary when those owners are approved;
- read-only projections for Journal and Analytics.

Mode policy may change visibility, required fields, edit permissions, and
available commands. It must not switch to a different state owner.

## Reuse Sources

### Lightweight Charts And Awesome Ecosystem

Use documented primitives, plugin examples, coordinate conversion, hit-test,
and rendering patterns where they fit. Treat them as rendering mechanisms,
not product-domain or persistence owners. Test a suitable existing primitive
before building a custom chart renderer.

### Legacy V4/V5 Lineage

Reuse product lessons and acceptance cases from PDA semantic types, typed
relations, context-specific creation, and primitive-based projections. Do not
port the large context menu, hidden interaction state, mixed ownership, or
feature-to-feature control.

### FXReplay And TradingView

Reuse proven ergonomics selectively. Their visible control taxonomy and
generic geometry model are references, not V6's domain model or a parity list.

## Semantic Drawing Review Outcome

`V6_SEMANTIC_DRAWING_PLUGIN_SPEC_DRAFT.md` is accepted with these changes:

1. Semantic observations are the primary future chart-marking direction;
   generic drawings remain secondary and are deferred from the first product
   slice.
2. The three policies share artifact identity, provenance, persistence,
   relations, and projections.
3. Core owners keep integrity, policy, action history, persistence, registry,
   and chart-overlay routing; trusted repository-owned plugins may describe
   semantics and pure projections.
4. Plugin-friendly boundaries are required now, but executable third-party
   loading and a marketplace remain deferred.
5. The first implementation still follows the generic observation/trade-plan
   validation slice. It must not begin with the draft's larger ICT ontology.

Still unresolved before a Semantic Drawing UI or write path is enabled:

- final user-facing vocabulary and interaction surface;
- the exact artifact envelope, revision policy, and missing-plugin fallback;
- cross-pane/timeframe projection and selection/hit-test contracts;
- the initial semantic type/relation set after the generic slice is exercised;
- detector permissions and machine-generated provenance.

## Explicit Rejections

- separate runtimes, stores, routes, or drawing databases per mode;
- a mode enum branching throughout chart/replay/data modules;
- a second validation chart;
- a full traditional drawing rail as the primary semantic entry;
- a plugin receiving chart-engine, hidden-future, Replay, or Bar Data access;
- calling Live Reproduction “live trading” without a later explicit decision.

## Gate

No mode shell or Semantic Drawing implementation is authorized by this
decision. The next product slice may introduce only shared domain contracts and
one thin validation workflow through existing owners. Any mode-specific UI must
wait until its policy and acceptance behavior are specified independently.
