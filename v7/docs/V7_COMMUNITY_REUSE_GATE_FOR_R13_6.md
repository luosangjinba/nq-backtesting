# V7 Community Reuse Gate For R13.6

Decision id: `ADR-V7-002`

Status: accepted pre-implementation gate (2026-08-08)

Target: `lightweight-charts` `5.2.0`

Machine-readable evidence: `v7-community-reuse-audit.json`

Executable evidence: `tests/community-reuse-audit-harness.js`

## Outcome

The public Lightweight Charts ecosystem contains useful implementation patterns,
installable drawing packages, indicator catalogs, and complete alternative chart
engines. It does not contain one candidate that can become V7's production
drawing owner without violating accepted Chart, interaction, Annotation,
Replay, persistence, or semantic-package boundaries.

R13.6 therefore adopts official Lightweight Charts Series Primitive lifecycle,
renderer/view, coordinate-conversion, and teardown patterns. It keeps Rectangle,
selection, transient edit Preview, and Inspector behavior inside the V7-owned
ports established by R13.2–R13.5. No community package becomes a V7 production
dependency through this gate.

Indicator calculation is a different decision. One community catalog passed an
isolated calculation probe and remains a future adapter candidate, but R13.6
does not activate indicators, indicator UI, community formulas, or an Indicator
runtime.

R13.6 remains separately authorized: this decision constrains its implementation
but does not implement Rectangle, selection, editing, Inspector UI, production
composition, or persistence.

## Why This Gate Exists

ADR-V7-001 already requires an ecosystem check before implementing a chart
capability. Public availability is not sufficient evidence of safe reuse:

- an installable package can still own its own Drawing document and persistence;
- a plugin can receive raw Chart/Series handles and become a second visual writer;
- a drawing manager can install pointer listeners beside the accepted V7
  interaction arbitrator;
- an indicator catalog can mix standard formulas with community ports whose
  formula and source provenance require separate review;
- an alternative chart engine can be mature while still requiring replacement
  of the accepted V7 Chart adapter.

The gate therefore evaluates capability, licensing, compatibility, ownership,
teardown, and Replay/no-future fit separately.

## Method

The audit was performed on 2026-08-08 in America/Los_Angeles and pins each
reviewed repository to one exact commit. Network-fetched sources and packages
were used only in isolated `/tmp` probes; they were not copied into V7.

The executable probes established:

1. V7 and its lockfile both pin Lightweight Charts 5.2.0;
2. `lightweight-charts-drawing@0.1.1` installs beside 5.2.0 and its ESM surface
   imports;
3. `lightweight-charts-indicators@0.5.0` installs and imports, and SMA(3) over
   closes 1–5 yields `null,null,2,3,4`;
4. `@getcandlekit/charts@0.1.0` installs and imports beside 5.2.0, but combining
   it with the current indicator package fails npm peer resolution because the
   published CandleKit release accepts indicator `^0.4.0` while the current
   indicator release is `0.5.0`;
5. the reviewed `line-tools-core` source declares a 5.2 peer but is not
   published to npm under its repository package name;
6. none of the candidate packages entered `v7/package.json` or the lockfile.

Install/import success proves only package-surface compatibility. It does not
prove V7 ownership, formula correctness, Replay behavior, or product acceptance.

## Candidate Decisions

### Official Lightweight Charts Plugin Examples — Adopt Patterns

Pinned commit:
`ef7335a8007236eac38bd50cacddc305c7fcb293`

The official examples include Rectangle Drawing Tool, Trend Line, Vertical
Line, Bands Indicator, Volume Profile, and other Primitive/custom-series
patterns. They are the authoritative source for the current Primitive lifecycle
and Canvas rendering APIs.

V7 may adapt:

- `ISeriesPrimitive` attachment and detachment;
- pane-view and renderer separation;
- time/price coordinate conversion;
- preview/request-update patterns;
- deterministic teardown.

V7 does not adopt example-local toolbar state, drawing arrays, click/crosshair
subscriptions, or persistence as product owners.

Source:
<https://github.com/tradingview/lightweight-charts/tree/ef7335a8007236eac38bd50cacddc305c7fcb293/plugin-examples/src/plugins>

### lightweight-charts-drawing — Block Production Adoption

Pinned commit:
`5f2afc335028d6a188ce0a50361056518c84cf72`

The package exposes a large current-LWC tool surface, and its isolated 5.2.0
install/import probe passes. Its `DrawingManager`, however, simultaneously owns
the Drawing collection, selection, Chart subscriptions, DOM mouse listeners,
hit testing, serialization, and primitive attachment. Its `Drawing` base also
stores mutable anchors/style/options and raw Chart/Series handles. Adopting the
manager would duplicate at least four accepted V7 owners.

The audited source has no unit/browser test directory. Package metadata and the
README declare MIT, but the repository has no standard `LICENSE` file and
GitHub does not identify a repository license. Production adoption is blocked
until licensing is consistent even if its architecture were later wrapped.

Source:
<https://github.com/deepentropy/lightweight-charts-drawing/tree/5f2afc335028d6a188ce0a50361056518c84cf72>

### lightweight-charts-indicators — Future Calculation Adapter Candidate

Pinned commit:
`31756c8615aff4cefe9cf97350e78bd427f663cd`

This package is materially different from the drawing runtimes: its exported
definitions expose `calculate`, metadata, input configuration, and plot
configuration. The isolated SMA probe demonstrates a usable pure-result shape,
and the repository contains CI plus unit and regression suites.

It is not adopted wholesale. The catalog combines standard indicators with
hundreds of community Pine ports and drawing-result types. Each activated
formula still requires:

- definition-level source/license provenance;
- deterministic fixture comparison against a named reference;
- warmup/null, timestamp, session, and timeframe policy;
- Replay/no-future and invalidation tests;
- a V7-owned calculation port and Chart-owned projection adapter.

This candidate belongs to a later Indicator decision, not Annotation R13.6.

Source:
<https://github.com/deepentropy/lightweight-charts-indicators/tree/31756c8615aff4cefe9cf97350e78bd427f663cd>

### lightweight-charts-line-tools-core — Reference Only

Pinned commit:
`db2695c628f7ff2b163f2f465003d52e959bb8cd`

The maintained successor to the older 3.8 fork declares a Lightweight Charts
`^5.2.0` peer and provides extensive geometry/rendering helpers. It is modular
at the tool-registration level, but its Core still owns raw Chart/Series
handles, interaction, selection, import/export, crosshair control, and
primitive lifecycle. The package is not published to npm under the reviewed
name, its test script deliberately fails, and no automated test suite is
present. MPL-2.0 also requires file-level compliance review before copying or
modifying covered code.

It remains reference-only. R13.6 may compare algorithms or behavior but cannot
depend on the Core or import its owner runtime.

Source:
<https://github.com/difurious/lightweight-charts-line-tools-core/tree/db2695c628f7ff2b163f2f465003d52e959bb8cd>

### CandleKit — Architecture Comparison Only

Pinned commit:
`d37ff6767c96a66ee5489387fa0628f51f03b23d`

CandleKit has a coherent plugin interface, tests, drawing tools, indicators,
and Replay. Its package imports beside Lightweight Charts 5.2.0, but the
published package is behind the repository version and its optional indicator
peer conflicts with the current indicator release.

More importantly, its `ChartController` owns Chart construction and Series
data, while plugin context deliberately exposes raw Chart/Series handles. Its
Drawing Controller owns pointer listeners, native-pan mutation, its own Drawing
engine, and optional local persistence. Those are reasonable choices for an
all-in-one toolkit but conflict with V7's existing owners. The project README
also labels the project early-stage.

It remains an interface/test comparison source, not a V7 dependency.

Source:
<https://github.com/rohanbeingsocial/candlekit-charts/tree/d37ff6767c96a66ee5489387fa0628f51f03b23d>

### KLineChart — Alternative-Engine Benchmark Only

Pinned commit:
`612c2cb535d8f5aaef4dd78a0fd51b5fc30abc8b`

KLineChart is an active Apache-2.0 chart engine with its own overlay and
indicator extension model. It is evidence that a more integrated open-source
surface exists, not a drop-in Lightweight Charts plugin. Adopting it would
replace the chart engine and reopen the accepted V7 Chart, Pane, Replay,
viewport, interaction, and browser acceptance surface.

It remains a product/extension benchmark. Chart-engine migration is outside
R13 and requires its own decision.

Source:
<https://github.com/klinecharts/KLineChart/tree/612c2cb535d8f5aaef4dd78a0fd51b5fc30abc8b>

## Binding R13.6 Constraints

The future Rectangle And Minimal Inspector implementation must:

1. retain `optional.annotation-geometry-domain` as the vendor-neutral Geometry
   definition owner;
2. retain `optional.annotation-runtime` as the sole accepted Drawing document
   writer;
3. retain `optional.annotation-interaction` as the only drawing/edit gesture
   state owner;
4. retain `optional.annotation-chart-projection` under the existing sole Chart
   visual owner;
5. use a V7-owned, adapter-local Rectangle Primitive and hit-test helper;
6. treat selection and edit Preview as transient state, never a second Drawing
   document;
7. let the host Inspector dispatch typed commands and subscribe to state rather
   than receiving Chart/Series/primitive handles;
8. add no third-party drawing, Chart controller, Replay, persistence, or
   semantic runtime dependency;
9. keep Indicator adoption outside the step;
10. preserve exact teardown, native gesture restoration, Replay/no-future
    prerequisites, and zero-semantic-package boot.

If later evidence favors a community implementation, it must be admitted only
behind the same ports through a new decision and must pass the current owner,
teardown, performance, and visual gates. Installability or tool count alone is
not sufficient.

## Closure

ADR-V7-002 closes when:

- the candidate matrix is pinned and machine-readable;
- the audit validator rejects unpinned, unlicensed, ownership-breaking, or
  dependency-promoting decisions;
- the current V7 package and lockfile remain on Lightweight Charts 5.2.0 with
  zero candidate dependency additions;
- focused and existing architecture/source-quality checks pass;
- R13.6 remains unimplemented and separately gated.

No manual visual gate is required because this decision changes no production
or fixture pixels.
