# V6 Semantic Drawing And Plugin Spec (Draft For Review)

Date: 2026-07-14

## Status

This document records the recent product and architecture discussion about V6
drawing. It is a **draft for product-owner review**, not an accepted
implementation decision.

Existing normative decisions in `V6_PRODUCT_DIRECTION.md`,
`V6_ARCHITECTURE.md`, and `V6_REPLAY_VALIDATION_PRODUCT_DECISION.md` continue
to take precedence. No drawing implementation is authorized by this draft.

## Review Outcome Requested

The product owner should review whether V6 should adopt all of these directions:

1. semantic marks/observations are the primary chart-marking experience;
2. generic TradingView-style drawings are secondary utilities, not the product
   model;
3. one semantic artifact model is shared by God View, Pseudo-Live, and Live
   Reproduction modes;
4. SMC/ICT concepts and workflows are extensible through constrained plugins;
5. core runtimes own artifact integrity, mode policy, rendering boundaries,
   persistence, and action history;
6. the current traditional drawing-tool contract is revised before drawing
   writes are enabled.

## Product Intent

Traditional chart software asks the user to choose geometry first: line,
rectangle, text, or Fib. The meaning remains implicit in color, position, or a
free-form label.

V6 should instead ask the user to state the market judgment first:

- mark buy-side or sell-side liquidity;
- mark an FVG or order block;
- mark a sweep, displacement, bias, or market leg;
- record how one object approached, respected, swept, confirmed, invalidated,
  or delivered through another object.

V6 then selects and maintains the necessary geometry. The durable asset is the
judgment and its provenance; the line, range, point set, or label is a visual
projection of that asset.

This supports the product loop:

`replay -> pre-result judgment -> semantic chart evidence -> outcome -> statistics -> playbook revision`

## Terminology

The following terms are proposed to avoid using `drawing` for several different
responsibilities:

- **Observation**: a semantic market judgment, such as FVG, liquidity, sweep,
  bias, or displacement.
- **Evidence**: references that preserve the chart/replay-visible context in
  which an observation was created.
- **Geometry projection**: the line, range, points, leg, or label used to render
  an artifact.
- **Relation**: a typed connection between artifacts, such as `swept`,
  `respected`, `invalidated`, or `confirms`.
- **Semantic tool plugin**: a plugin that defines one or more observation types
  and how they are created, validated, inspected, and projected.
- **Workflow/playbook plugin**: a plugin that composes semantic artifacts into
  a higher-level SMC/ICT model without reimplementing their base types.
- **Generic annotation**: a low-priority free line, rectangle, measure, or text
  mark that has no statistical meaning until explicitly promoted or linked to
  a semantic artifact.

The final user-facing name (`Mark`, `Observation`, or another term) remains open
for product-owner review.

## Legacy Implementation Audit

The relevant legacy prototype currently lives under `v4/src`, although it was
discussed as the V5 drawing demo lineage.

### Reusable Product Lessons

The legacy implementation demonstrates several useful ideas:

- `PDA_TYPES` separates semantic types from rendering shapes. BSL/SSL use a
  liquidity line, FVG/OB/Breaker use a range, EQH/EQL use point sets, and Fib
  uses a retracement projection.
- Creation behavior follows meaning. A point, an inferred FVG, a selected
  range, and a two-point Fib do not share one generic creation workflow.
- Objects retain source chart, instrument, timeframe, canonical timestamp,
  context, validation, and display metadata.
- Market legs can link to PDA objects through typed responses such as
  `approached`, `respected`, `swept`, `rejected`, and `delivered-through`.
- Lightweight Charts primitives were successfully used as the rendering
  mechanism rather than as the semantic data model.

These are suitable product lessons and test-case sources. They are not approval
to port the legacy runtime ownership model.

### Legacy Problems Not To Port

- A large chart context menu accumulated PDA, SMT, segments, composite moves,
  orders, live records, chart notes, time overlays, objective gaps, locate, and
  clearing actions.
- Creation depended on hidden interaction state and combinations such as
  Shift + right-click.
- Feature dispatch, menu construction, hit testing, selection, domain actions,
  chart context, and status messaging became intertwined.
- PDA rendering and manual annotation entry files grew into large mixed-purpose
  modules.
- Semantic data, display preferences, selection/isolation state, and relation
  state were frequently stored close together.
- Adding new ICT concepts encouraged more hard-coded branches and submenu
  entries rather than extension through a stable registry.

The V6 goal is therefore not to migrate the legacy feature. It is to retain its
semantic-first insight while replacing its interaction and ownership model.

## Proposed User Experience

V6 should not make a permanent traditional drawing rail the primary entry
surface. Three complementary entry surfaces are proposed.

### Contextual Marking

Right-clicking or otherwise invoking context at a bar, price, or selected range
shows only actions valid for that context. It must not become another complete
application menu.

Examples:

- `Mark liquidity` on a high or low;
- `Mark FVG` on a qualifying candle context;
- `Mark sweep` around a liquidity object;
- `Start/finish market leg` on swing points;
- `Add observation` for an uncatalogued judgment.

### Intent Palette

A searchable palette exposes semantic commands such as `fvg`, `sweep`, `ob`,
`bias`, and `displacement`. Recent and favorite commands may be prioritized.
This avoids permanently exposing the full ontology in the chart chrome.

### Direct Shortcuts

High-frequency shortcuts should invoke semantic intent (`Mark FVG`) rather than
generic geometry (`Draw rectangle`). Generic annotation tools may remain
available through a secondary surface.

## Shared Assets Across Three Modes

God View, Pseudo-Live, and Live Reproduction should use the same artifact IDs,
schemas, relations, persistence, and projections. They must not create three
independent drawing systems.

Mode differences belong to a **Mode Policy**, not to separate artifact types.

### God View

- permits full-history inspection;
- supports retrospective research and review marks;
- may show later outcomes and relations;
- must still identify retrospective provenance.

### Pseudo-Live

- records the replay cursor and no-future boundary at creation;
- protects pre-result observations from silent hindsight edits;
- distinguishes later review additions from the original judgment;
- may reveal or evaluate outcomes only through replay-owned progression.

### Live Reproduction

- records real observation time and the market-visible boundary;
- retains the same semantic types and relation protocol;
- may attach live-session facts without changing the semantic object model.

Moving an artifact between views changes presentation and permissions, not its
identity or historical provenance.

## Proposed Artifact Envelope

Every plugin-defined artifact should use a core-owned envelope. Exact field
names remain subject to implementation design.

```js
{
  id: 'obs_123',
  semanticType: 'ict.fvg',
  semanticVersion: 1,

  instrument: 'NQ',
  sourceTimeframe: '15m',
  targetPane: 'main',
  anchors: [],

  provenance: {
    mode: 'pseudo-live',
    phase: 'prospective',
    createdAt: 0,
    replayCursor: 0,
    visibleThrough: 0
  },

  lifecycle: {
    status: 'active',
    revision: 1
  },

  relations: [],
  payload: {}
}
```

Core fields must remain queryable and stable. Plugin-specific data belongs in a
versioned `payload`; plugins must not turn an unstructured `metadata` bag into
the effective database schema.

Prospective edits, retrospective edits, invalidation, deletion, and relation
changes need auditable action history. Whether this is implemented as immutable
revisions, append-only actions, or another mechanism remains open.

## Geometry And Semantic Separation

The first geometry vocabulary should remain small:

- Point/Event;
- Level;
- Range/Zone;
- Leg/Move;
- Point Set;
- Relation/Link;
- Label projection.

A semantic plugin maps its object to one or more geometry projections. The
plugin does not receive direct Lightweight Charts ownership.

For example:

```text
ict.fvg observation
  -> range projection
  -> optional CE level projection
  -> semantic label projection
```

Changing how FVG is drawn must not rewrite what the observation means.

## Plugin Architecture

The proposed shape is a microkernel with constrained, versioned semantic
plugins.

```text
God View / Pseudo-Live / Live Reproduction
                    |
               Mode Policy
                    |
      Semantic Artifact Runtime
                    |
            Plugin Registry
                    |
       Geometry / Overlay Runtime
                    |
      Lightweight Charts primitives
```

### Core-Owned Responsibilities

The V6 core should own:

- artifact identity and the core envelope;
- provenance and no-future evidence capture;
- mode-specific visibility and edit policy;
- selection, hit-test orchestration, move/delete lifecycle, and action history;
- relation storage and referential integrity;
- cross-timeframe and cross-pane projection policy;
- persistence, indexes, transactions, and schema migration orchestration;
- plugin registration, capability checks, and lifecycle;
- overlay requests to the chart owner;
- read-only projections for Journal and Analytics;
- unknown/disabled plugin fallback behavior.

### Plugin Registration Surface

A semantic tool plugin may declare:

- namespaced semantic type and schema version;
- label, category, icon, and default presentation recipe;
- creation interaction descriptor;
- pure anchor/range calculations from explicitly supplied visible data;
- payload validation and migrations;
- inspector fields and allowed edits;
- allowed relation types;
- mode capabilities, subject to stricter core policy;
- read-only analytics facts/events;
- optional detector capability behind a separate permission and data boundary.

Illustrative API only:

```js
registerSemanticTool({
  type: 'ict.fvg',
  version: 1,
  category: 'imbalance',
  creation: { interaction: 'single-bar', command: 'mark-fvg' },
  projection: { kind: 'range' },
  relations: ['approached', 'respected', 'filled', 'inverted', 'invalidated']
});
```

This example is not an accepted API signature.

### Plugin Prohibitions

Plugins must not:

- write Lightweight Charts series or attach primitives directly;
- request or cache market bars directly;
- read hidden future bars or relax the no-future boundary;
- advance, rewind, or mutate replay state;
- directly mutate another plugin, Orders, Journal, Analytics, or Settings;
- create private persistence stores for core artifacts;
- insert arbitrary DOM into global menus or chart chrome;
- bypass commands/events/contracts to control feature runtimes;
- silently reinterpret old artifacts under a newer taxonomy version.

Plugins submit semantic intents and projection descriptions. Core owners
validate and route them.

### Two Plugin Levels

1. **Semantic Tool Plugin** defines reusable concepts such as liquidity, FVG,
   sweep, displacement, OB, and SMT.
2. **Workflow/Playbook Plugin** composes existing concepts into a model such as
   `liquidity sweep -> displacement -> FVG retracement -> entry`, without
   reimplementing those concepts.

This separation allows community methods to share the same semantic bricks and
statistical vocabulary.

### Trust Model

The initial implementation should support repository-owned, trusted plugins.
Loading arbitrary third-party JavaScript, sandboxing, signing, remote plugin
installation, and a public marketplace are explicitly deferred.

Plugin-friendly architecture does not require an immediate public executable
plugin system.

## Proposed Initial Vertical Slice

Do not begin with the complete ICT ontology. A useful first semantic slice is:

- Liquidity: BSL and SSL;
- Imbalance: FVG;
- Event: Sweep;
- Move: Displacement or Market Leg;
- relations: `approached`, `swept`, `respected`, and `invalidated`;
- provenance: prospective/retrospective plus replay cursor and visible boundary.

The first product proof should be:

`mark liquidity -> mark sweep/displacement -> relate artifacts -> reveal outcome -> aggregate and drill back to evidence`

Candidate concepts deferred until the slice proves useful include:

- full OB and Breaker variants;
- SMT;
- complex Fib workflows;
- composite moves;
- automatic recognition of the complete ICT ontology;
- end-user-defined ontology builders.

The existing product decision's generic observation/trade-plan validation slice
still controls delivery order. This semantic drawing slice must be reconciled
with that gate before implementation begins.

## Generic Drawings

Free lines, horizontal lines, rectangles, measures, and text may exist as a
secondary `generic-annotation` capability. They should not be the primary V6
product model.

Generic annotations:

- may be useful for visual explanation;
- carry no semantic statistical meaning by default;
- must not be silently counted as observations;
- may later be linked to, or explicitly promoted into, a semantic artifact;
- should use the same core selection, geometry, persistence, and action-history
  infrastructure where practical.

## Impact On Current V6 Drawing Contract

The current read-only drawing/action-history contract lists `trend-line`,
`horizontal-line`, `rectangle`, `measure`, and `text` as built-in tool IDs. It
was intentionally created without enabling writes, overlays, persistence, or
runtime wiring.

Before any drawing implementation is enabled, review whether to:

1. rename or narrow that contract to generic geometry/annotation intent;
2. create a distinct semantic artifact owner and plugin registry;
3. keep action history core-owned across semantic and generic geometry changes;
4. replace the reserved traditional left drawing rail with contextual marking,
   an intent palette, and optional shortcuts.

Do not extend the current contract into a full traditional drawing subsystem
before this decision is resolved.

## Ownership Constraints

This draft reinforces existing V6 ownership rules:

- only bar-data runtime requests and caches bars;
- only replay runtime owns cursor, reveal state, and no-future state;
- only chart runtime/adapter writes chart series and engine surfaces;
- observation/evidence ownership stores semantic meaning and provenance;
- geometry/drawing ownership renders and edits projections without owning
  semantic meaning;
- persistence owns durable storage mechanics;
- Journal references artifacts without mutating them;
- Analytics reads projections without rewriting source records;
- a workflow coordinator may orchestrate owners through commands/events.

## Acceptance Gates Before Implementation

Implementation should not begin until review resolves:

- user-facing name for the feature;
- the boundary between Observation, Evidence, Geometry, and Relation;
- whether generic drawings remain in the initial scope;
- core artifact envelope and provenance invariants;
- mode policy for create/edit/delete/review operations;
- plugin descriptor and capability model;
- initial semantic types and relations;
- action-history semantics for prospective artifacts;
- cross-timeframe and cross-pane identity/projection rules;
- persistence behavior when a plugin is missing or upgraded;
- reconciliation with the first post-foundation validation vertical slice.

Each accepted invariant should receive a focused contract test before a chart UI
is enabled.

## Explicit Non-Goals For The First Implementation

- cloning the TradingView drawing rail;
- porting the legacy PDA context-menu system;
- implementing every ICT concept;
- automatic trading signals or claims of objective truth;
- allowing plugins to access hidden future data;
- arbitrary third-party JavaScript execution;
- a plugin marketplace;
- storing all semantics in an unversioned metadata bag;
- separate drawing databases or runtimes for the three modes;
- allowing Analytics to mutate observations based on later outcomes.

## Open Review Questions

1. Should the user-facing primary verb be `Mark`, `Observe`, or another term?
2. Should free generic drawings ship with the first semantic slice or remain
   deferred?
3. Are the five initial semantic concepts and four initial relations the right
   minimum?
4. Which prospective edits should be prohibited, versioned, or merely flagged
   after additional candles are revealed?
5. Should an artifact created in God View ever be convertible to prospective
   evidence, or must provenance remain permanently retrospective?
6. Should first-party plugins live inside the V6 repository or in separately
   versioned packages once the API stabilizes?
7. Should workflow/playbook plugins be allowed to require specific semantic
   plugin versions?
8. How should V6 display an artifact whose defining plugin is unavailable?
9. Should relation vocabulary be core-defined, plugin-defined, or a hybrid of
   core relations plus namespaced extensions?
10. At what point should automatic detectors be permitted, and how must their
    machine-generated provenance differ from manual observations?

## Review Decision Record

Complete this section after product-owner review:

- Status: Draft / Accepted / Accepted with changes / Rejected
- Reviewed by:
- Review date:
- Accepted constraints:
- Required changes:
- Deferred questions:
- Authorized next step:

