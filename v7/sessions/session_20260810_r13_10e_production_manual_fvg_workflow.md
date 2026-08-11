# Session — R13.10e Production Manual FVG Workflow

Date: 2026-08-10

Branch: `feature/v7-drawing-semantic-annotation`

Status: implemented; H114 executable; focused human acceptance pending

## Outcome

Implemented the first production Semantic Plugin vertical slice through the
accepted P0a thin waist. A generic built-in FVG contribution now drives one
production path from exact active-Pane candle selection through accepted
Workspace evidence, Core FVG construction, the sole Annotation Runtime durable
commit, multi-Pane/no-future projection, and the host-rendered
Inputs/Evidence/History Inspector.

The product route and UI do not branch on the FVG semantic id. The removable
`optional.annotation-manual-workflow` composition receives only public owner
ports. ModuleHost, Replay, Bar Data, Annotation Runtime, persistence, and Chart
retain their existing sole-owner authority.

## Implementation Boundary

- P0a outer manifest/contribution identity is matched exactly to the active
  inner Semantic package, construction tool, type, versions, and evidence
  requirement before the toolbar can arm.
- The Chart adapter exposes bounded accepted/Preview/interaction Annotation
  ports without leaking a raw Chart or Series handle. Exact display timestamps
  map back to accepted market Bar starts through the existing interaction
  index.
- One accepted Workspace snapshot supplies Session, Pane, instrument,
  timeframe, dataset revision, Bar revisions, Replay cutoff, and current
  Artifact revisions. Missing, stale, future, unclosed, or non-FVG evidence
  produces zero accepted writes and a visible stable error.
- Annotation Runtime remains the only accepted Artifact writer; persistence
  retains the exact source evidence, construction identity, and override
  provenance across hard reload.
- Dirty Inspector edits suppress only the matching accepted projection while
  showing one Preview layer. Cancel restores accepted projections and Apply
  settles one new accepted layer across eligible Panes.
- Replay-changing controls lock only for an active workflow transaction;
  native wheel, drag, scale, crosshair, and candle writing remain Chart-owned.

## Automated Evidence

- H114 passes six declarative negative controls covering outer/inner binding,
  incomplete or future evidence, stale Workspace identity, and invalid
  construction.
- Real Chromium proves toolbar arm/cancel, visible invalid-click rejection,
  one valid exact-click commit, Inspector edit/cancel/apply, single-layer
  accepted/Preview settlement, multi-Pane projection, hard-reload restoration,
  unchanged candle-writer revision, and native wheel input.
- Focused R13.10a–R13.10d, P0a, Replay Workspace UI/composition, Annotation
  projection, source-quality, and production-architecture gates are retained as
  regression evidence. H114 is also declared in the production regression
  matrix.
- Current production source evidence is 449 files, 37,062 effective lines, 3,890 functions, and 407 public exports, with no source-size/function exception or validation finding.
- Current architecture evidence is 64 modules, 147 actual dependency edges,
  122 construction sites, 18 declared writer surfaces, 23 observed writer
  sites, and zero known violations.
- Production assembly executes 64 public module entries, 27 lifecycle modules,
  and all 40 declared optional-removal cases, including omission of the whole
  workflow and each required optional dependency.
- The nine-scenario production regression matrix passes. It reproduces the two
  pre-existing H091 visual findings and separately inventories the expected
  R13.10e FVG-toolbar pixel change pending this step's human gate; no existing
  visual baseline was re-recorded.
- The complete sequential sweep invokes all 114 top-level Harnesses. One
  hundred ten pass directly. The four non-zero exits are exactly the three
  preserved H091 Session date-picker, mixed-Pane, and Replay Workspace pixel
  gates plus the separately inventoried R13.10e R6.9 toolbar pixel change.
  There is no unexpected functional, contract, owner, persistence, deployment,
  architecture, source-quality, or browser-input failure.
- A final post-hardening repeat reproduced those four visual exits plus one
  Chromium page-evaluation race in Annotation Context Projection. Its immediate
  isolated rerun passed all 15 negative controls; the earlier complete sweep
  had already passed it directly. The transient adds no product finding.
- The temporary V7 read-only market-data service used by browser regression was
  stopped afterward. The original transient `v4-api-restored.service` was
  recreated and `/v4/health` returned version 4.0 `ok`.
- H114 remains `executable`; automation does not satisfy its mandatory human
  interaction/visual gate.

## Upstream Reuse Decision

Official Lightweight Charts 5.2 Primitive lifecycle, drawing-tool examples,
and the awesome-tradingview ecosystem were rechecked before implementation.
They provide useful renderer/interaction patterns but not V7's exact evidence,
durable revision, no-future, rollback, Inspector, or ModuleHost contracts. No
new dependency or community runtime was added; existing V7 Chart-owned
Primitive and interaction adapters remain authoritative.

## Scope Kept Closed

No visual Plugin Center, install-from-file flow, loader, public SDK/build
tooling, Community registry, external executable code, Worker/WASM runtime,
automatic detector, MA/SMA, BSL/SSL expansion, Fibonacci, Marketplace,
payment, or licensing behavior enters R13.10e.

## Human Gate

The focused production fixture must still be reviewed for toolbar discoverability
and states, invalid/valid candle selection, Inspector legibility, one-layer
Preview/Cancel/Apply behavior, multi-Pane/no-future correctness, native Chart
navigation, and hard-reload provenance. Only explicit user acceptance may move
H114 and R13.10e to accepted.

Binding contract: `docs/V7_PRODUCTION_MANUAL_FVG_WORKFLOW_R13_10E.md`.
