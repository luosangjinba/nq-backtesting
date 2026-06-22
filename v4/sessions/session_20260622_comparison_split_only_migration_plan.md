# Step 308: Comparison Window Split-only Workflow Migration Plan

Date: 2026-06-22

## Background

Step 307 delivered the Comparison Window MVP and parity work for the main comparison workflow:

- cross-instrument and cross-timeframe loading;
- sliding/floating window behavior;
- comparison-source PDA/Segment/FVG creation;
- SMT rendering, selection, and locate path;
- replay progressive HTF behavior;
- workspace persistence and Replay History restore;
- browser verification and user documentation.

Step 307.13 concluded that old Split should not be removed yet. Comparison Window is the preferred replacement candidate, but several Split-only workflows remain.

## Product Boundary

Step 308 is a planning and migration track for Split-only workflows. It must not directly remove Split.

The removal rule is:

- migrate or explicitly drop Split-only workflows first;
- verify real trading-day workflows;
- only then open a dedicated Split removal plan.

## Split-only Gaps To Address

### 1. Inspector And Calendar Locate Routing

Current issue:

- Calendar, Time Reaction, Order Review reason, and Live Record locate paths still branch explicitly between primary and secondary viewport controllers.
- Comparison Window has its own context and chart manager, but these Inspector routes do not yet target it generically.

Goal:

- Introduce chart-context locate routing that can target primary, secondary, or comparison views.
- Preserve existing primary/secondary behavior.
- Add Comparison Window locate/flash where the source object belongs to the comparison view or the user requests it.

Acceptance checks:

- Calendar object locate can target primary, old secondary, and comparison when available.
- Time Reaction locate with chart target no longer hard-codes only primary/secondary.
- Order Review reason locate uses `sourceChartId` / chart context routing.
- Live Record locate uses the same routing.
- Browser or focused smoke covers at least one comparison locate path from Inspector.

### 2. Pick-preview Routing

Current issue:

- Order Setup edit pick and Segment actor pick preview have primary/secondary-specific implementations.
- Preview cursor, hover, and click routing do not yet use a generic chart context.

Goal:

- Route pick-preview workflows through chart context capabilities.
- Support comparison chart coordinate mapping and preview cursor behavior where the workflow is valid.

Acceptance checks:

- Existing primary and secondary pick workflows keep working.
- Comparison Window can participate in supported pick workflows without duplicate per-chart branches.
- Escape/cancel behavior clears the correct preview cursor.

### 3. Comparison Hit-test Link To Active Setup

Current issue:

- Old Split secondary context menu can hit-test existing PDA, Segment, and Composite Move objects and link them to active Order Setup.
- Comparison Window currently supports creating comparison-source objects and adding bar evidence, but existing-object hit-test link is not equivalent.

Goal:

- Add comparison-view hit-test for existing PDA/Segment/FVG/Composite evidence.
- Add Link To Active Setup actions where the hit object is valid for the comparison view.

Acceptance checks:

- Existing comparison PDA can be hit-tested and linked to active setup.
- Existing comparison Segment can be hit-tested and linked to active setup.
- Existing comparison FVG can be hit-tested and linked to active setup.
- Composite behavior is either implemented or explicitly deferred with a reason.

### 4. Advanced PDA Workflow Decision

Current issue:

- Secondary context menu supports advanced PDA workflows that Comparison Window does not yet support:
  - OB;
  - Breaker;
  - Fib;
  - Range PDA drafts;
  - EQH/EQL Point Sets.

Goal:

- Decide workflow-by-workflow whether each belongs in Comparison Window.
- Avoid blindly cloning all secondary menu complexity into the floating window.

Decision options for each workflow:

- migrate to Comparison Window;
- keep only on primary chart and old Split;
- drop from comparison scope because it is low-frequency or confusing in floating/sliding mode.

Acceptance checks:

- A table records each workflow, decision, rationale, and required implementation/test if migrated.
- If any advanced workflow remains Split-only, Split removal remains blocked.

### 5. Real-use Audit Checklist

Current issue:

- Browser smoke proves technical paths, but Split removal needs real workflow confidence.

Goal:

- Define a concrete real-use checklist for 1-2 trading days.

Checklist candidates:

- NQ primary + ES comparison SMT workflow.
- 1M primary + 1H/4H comparison replay workflow.
- Comparison PDA/Segment/FVG creation and later Inspector review.
- Active Order Setup evidence from comparison view.
- Calendar/object locate across primary and comparison views.
- Replay History restore with Comparison Window enabled.
- User preference review: floating/sliding window versus fixed Stack/Side Split.

Exit condition:

- Only after this checklist passes should a later task create a Split removal plan.

## Planned Steps

### Step 308.1: Freeze Removal Boundary

- Confirm Step 308 does not delete Split.
- Confirm migration work must preserve old primary/secondary behavior.
- Confirm Split removal requires a later dedicated plan.

Status: complete.

Frozen boundary:

- Step 308 is a migration-planning and targeted migration track for Split-only workflows.
- Do not delete or disable old Split in Step 308.
- Do not remove Stack/Side layout controls in Step 308.
- Every migration must preserve current primary and secondary behavior unless a later user-approved removal plan explicitly changes it.
- New comparison routing should be additive: primary and old secondary remain valid chart targets.
- Review JSON schema should not change for temporary UI state.
- Split removal requires a later dedicated removal plan after the real-use audit checklist passes.

Verification expectation for later substeps:

- Focused tests should cover old primary/secondary behavior and the new comparison target.
- Browser smoke should cover at least one user-facing comparison workflow for each migrated area.
- Documentation must clearly distinguish migration completion from Split deletion.

### Step 308.2: Chart Context Locate Routing

- Audit current locate call sites.
- Design a chart-context locate API covering primary, secondary, and comparison.
- Plan focused/browser coverage for comparison locate from Inspector.

Status: complete.

Locate call-site audit:

| Area | Current route | Gap |
| --- | --- | --- |
| `ui/inspector/calendar-actions.js` | Calls primary `viewport.locateTimestampRange` and old secondary `locateSecondaryTimestampRange`; PDA uses `locatePdaProjection`. | No comparison target; status copy only knows primary/secondary. |
| `ui/inspector/time-reaction-actions.js` | `locate.chart` supports `primary` or `secondary`; refs use `locatePdaProjection` or direct primary/secondary branches. | Locate selector cannot choose comparison; Order Setup locate is primary-only. |
| `ui/inspector/order-review-reason-actions.js` | PDA uses `locatePdaProjection`; Segment uses `sourceChartId === secondary` branch; Chart Note is primary only. | `sourceChartId=comparison-window` falls back to primary. |
| `ui/inspector/live-record-actions.js` | Mirrors Order Review reason locate behavior. | `sourceChartId=comparison-window` is not routed. |
| `pda/pda-locate-actions.js` | Uses primary and secondary chart contexts only. | PDA projection cannot locate/flash comparison even when source metadata matches comparison. |
| `comparison/comparison-context-menu.js` | Can locate comparison bar time in primary. | One-off primary locate helper, not a reusable router. |

Recommended implementation shape:

1. Add `chart/viewport-router.js`.
2. Export constants using existing chart ids: `primary`, `secondary`, `comparison-window`, and `both`.
3. Provide `locateChartRange(chartId, range, options = {})`.
4. Provide `locateChartRangeMany(chartIds, range, options = {})`.
5. Return a structured result:

```js
{
  located: true,
  targets: {
    primary: { located: true, reason: '' },
    secondary: { located: false, reason: 'not-enabled' },
    'comparison-window': { located: true, reason: '' }
  }
}
```

Router behavior:

- `primary`: call existing `viewport.locateTimestampRange`.
- `secondary`: call existing `secondaryViewport.locateSecondaryTimestampRange`.
- `comparison-window`: add a comparison viewport controller or generic context implementation that uses comparison chart, comparison display bars, and comparison primitives.
- `both`: preserve current primary + secondary behavior first; only include comparison when explicitly requested or when source metadata points to comparison.
- Do not auto-open Comparison Window just to locate; return `not-enabled` if it is closed or unloaded.
- Keep `flash: false` support for Chart Note/PDA paths that use custom flash primitives.

Migration order:

1. Implement the router with primary/secondary parity tests first.
2. Add comparison range locate support and focused test with comparison store/chart mocks.
3. Migrate `pda-locate-actions.js` to use router and include comparison when source metadata permits it.
4. Migrate Calendar object locate.
5. Migrate Order Review reason and Live Record reason locate using `sourceChartId`.
6. Migrate Time Reaction locate selector after the UI can expose `comparison-window` as a target.

Test plan:

- Focused router smoke: primary success, secondary disabled, secondary success, comparison disabled, comparison success.
- PDA projection smoke: source primary, source secondary, and source comparison route to the expected targets.
- Browser smoke: create comparison PDA/FVG or Segment, open Inspector/Calendar locate, verify the comparison chart range/flash path is reachable and old primary/secondary locate still works.

### Step 308.3: Pick-preview Routing

- Audit Order Setup edit pick and Segment actor pick code paths.
- Design chart-context preview cursor and click routing.
- Define supported comparison pick workflows and non-goals.

Status: complete.

Pick call-site audit:

| Area | Current route | Gap |
| --- | --- | --- |
| `ui/inspector/order-review-edit-actions.js` | Local `getPickChartContext(e)` branches on DOM id `secondary-chart`; primary uses `chart-manager`, secondary uses `secondary-chart-manager`. | Comparison Window is not a pick target; clear/hover logic hard-codes only primary/secondary preview cursors. |
| `ui/inspector/segment-actions.js` | Has a separate local `getPickChartContext(e)` with the same primary/secondary assumptions. | Duplicate logic and no comparison support. |
| `chart/chart-context.js` | Exposes chart/series/display bars/coordinate APIs for primary, secondary, comparison. | Does not expose chart DOM element or pick preview cursor functions. |
| `chart/comparison-chart-manager.js` | Supports replay cursor and sync hover cursor. | Missing dedicated pick preview cursor API equivalent to primary/secondary. |

Recommended implementation shape:

1. Add `chart/pick-context-router.js`.
2. Provide `getPickContext(chartIdOrEvent)` returning:

```js
{
  chartId,
  chartEl,
  timeframe,
  getDisplayBars,
  coordinateToTime,
  timeToCoordinate,
  findBarByChartTime,
  showPreviewCursor,
  hidePreviewCursor,
  isEnabled
}
```

3. Provide `clearOtherPickPreviewCursors(activeChartId)` and `clearAllPickPreviewCursors()`.
4. Reuse `chart-context.js` for common chart capabilities, but keep DOM element and preview cursor operations in the router because they are UI-specific.
5. Add `showComparisonPickPreviewCursor`, `hideComparisonPickPreviewCursor`, and optionally `hasComparisonPickPreviewCursor` to `comparison-chart-manager.js`.

Migration order:

1. Implement the router for primary and secondary only.
2. Migrate `order-review-edit-actions.js` to use the router; verify no behavior change.
3. Migrate `segment-actions.js` to use the router; verify no behavior change.
4. Add comparison preview cursor support.
5. Enable comparison in the router.
6. Add comparison support selectively:
   - Order Setup exit bar pick can support comparison if the selected comparison bar timestamp is meaningful for the setup result.
   - Segment actor pick should support comparison only when the actor timeframe matches the comparison timeframe.

Behavior rules:

- Pick state stays owned by each workflow controller; the router only provides chart targeting.
- Cursor cleanup must clear all chart preview cursors when cancelling.
- Hover in one chart must hide preview cursors in other charts.
- Comparison Window must not auto-open for pick mode; it is a valid target only when enabled and loaded.
- Unsupported comparison pick should return a clear status message, not silently fall back to primary.

Test plan:

- Focused smoke for router primary/secondary parity.
- Order Setup edit pick smoke: primary pick still updates exit timestamp; secondary pick still updates exit timestamp.
- Segment actor pick smoke: primary/secondary actor pick still updates actor timestamp/timeframe.
- Comparison smoke after implementation: open Comparison Window, start supported pick, hover/click comparison chart, verify preview cursor and timestamp update.

### Step 308.4: Comparison Hit-test Link

- Audit secondary hit-test link behavior.
- Map PDA, Segment, FVG, and Composite hit-test APIs to comparison chart context.
- Plan context-menu actions and active setup link tests.

Status: complete.

Secondary behavior to preserve:

- `secondary-context-menu` computes hit state at right-click time:
  - `hitTestPdaAnnotations({ x, y, context })`;
  - `hitTestSegments({ x, y, context })`;
  - `hitTestSegmentGroups({ x, y, context })`.
- It stores `contextMenuPdaHit`, `contextMenuSegmentHit`, and `contextMenuSegmentGroupHit`.
- It renders active setup link actions:
  - `secondary-order-link-pda`;
  - `secondary-order-link-segment`;
  - `secondary-order-link-composite`.
- It delegates to `handleOrderSetupChartAction` with the existing action ids:
  - `order-setup-link-pda`;
  - `order-setup-link-segment`;
  - `order-setup-link-composite`.

Comparison gap:

- `comparison-context-menu` currently stores only `contextMenuBar` and `contextMenuPrice`.
- It supports new comparison-source object creation and bar evidence.
- It does not compute existing-object hit state.
- It does not expose Link PDA/Segment/Composite to Active Setup.

Recommended implementation shape:

1. Import `hitTestPdaAnnotations`, `hitTestSegments`, `hitTestSegmentGroups`, and `handleOrderSetupChartAction` into `comparison-context-menu.js`.
2. Add stored hit state:
   - `contextMenuPdaHit`;
   - `contextMenuSegmentHit`;
   - `contextMenuSegmentGroupHit`.
3. In comparison right-click handler, compute hits using `getComparisonChartContext()`.
4. Render an `Order Setup Evidence` menu section similar to secondary:
   - `Add Comparison Bar Evidence`;
   - `Link PDA To Active Setup`;
   - `Link Segment To Active Setup`;
   - `Link Composite To Active Setup`.
5. Link actions should delegate to `handleOrderSetupChartAction` with:

```js
{
  bar: contextMenuBar,
  price: contextMenuPrice,
  timeframe: context.timeframe,
  pdaHit: contextMenuPdaHit,
  segmentHit: contextMenuSegmentHit,
  segmentGroupHit: contextMenuSegmentGroupHit
}
```

Behavior rules:

- Link actions stay disabled when no active setup exists or no matching hit exists.
- Bar evidence remains available when there is an active setup and a comparison bar.
- Hit-test must respect existing source instrument/timeframe guard behavior; do not link objects projected onto the wrong price axis.
- Composite support depends on `hitTestSegmentGroups` producing stable comparison-context hits. If this is not reliable in implementation, explicitly defer Composite and keep the action disabled with a status message.

Test plan:

- Focused comparison hit-test smoke:
  - comparison PDA hit returns expected id;
  - comparison Segment hit returns expected id;
  - comparison Composite hit either returns expected id or documented unsupported result.
- Browser smoke:
  - create active setup;
  - render or create comparison PDA/FVG and Segment;
  - right-click hit location;
  - click Link PDA/Segment to active setup;
  - verify active setup refs include `sourceChartId=comparison-window`.
- Regression:
  - existing secondary link smoke remains valid.

### Step 308.5: Advanced PDA Workflow Decision

- Create the workflow decision table.
- Decide migrate/keep/drop for OB, Breaker, Fib, Range PDA drafts, and EQH/EQL Point Sets.
- Convert migrate decisions into implementation steps.

Status: complete.

Decision principle:

- Do not clone the full secondary context menu into Comparison Window by default.
- Migrate workflows only when they are frequent in comparison review or low-risk because existing context-aware helpers already support them.
- Keep complex draft/set workflows on primary and old Split until real-use audit proves they are needed in the floating/sliding window.

Decision table:

| Workflow | Decision | Rationale | Implementation if later migrated |
| --- | --- | --- | --- |
| OB Last Bar | Migrate candidate | Single-bar action; `addManualObLastBar(bar, context, price)` is already context-aware and low complexity. | Add comparison menu item; browser smoke asserts `sourceChartId=comparison-window`. |
| Wick CE | Migrate candidate | Single-bar action; `addManualWickCe(side, bar, context)` is already context-aware and useful for candle-level review. | Add upper/lower Wick CE menu items; focused smoke can verify metadata and price. |
| OB range draft | Keep primary/Split for now | Two-step range selection adds draft state to a small floating menu; current user value in comparison view is unproven. | If migrated, create comparison-specific range draft state and cancel behavior; smoke start/finish/cancel. |
| Breaker range draft | Keep primary/Split for now | Same draft complexity as OB, with more visual ambiguity in a sliding window. | Migrate only together with a generic comparison range-draft controller. |
| Fib | Keep primary/Split for now | Two-click measurement/draft workflow is layout-sensitive and may conflict with sliding/drag affordances. | Migrate only after pick/router work; verify no conflict with window drag and chart pan. |
| EQH/EQL Point Sets | Keep primary/Split for now | Session-scoped point-set draft state exists per scope, but comparison scope needs selection, cancel, and selected-set append rules. | Generalize point-set scope to `comparison-window`; smoke start/add/finish/cancel and selected-set append. |
| Existing selected EQH/EQL append | Keep primary/Split for now | Depends on selected annotation routing and source metadata; more complex than starting a new set. | Implement only after comparison hit-test link and selection paths are stable. |

Near-term migration recommendation:

1. Add OB Last Bar and Wick CE to Comparison Window only if the user wants richer single-candle marking there.
2. Do not migrate OB/Breaker/Fib/Point Sets before the real-use audit.
3. If any keep-only workflow becomes high-frequency during audit, create a dedicated implementation step rather than expanding the comparison menu opportunistically.

Removal implication:

- Since OB/Breaker/Fib/Point Sets remain primary/Split-only, Split removal remains blocked after Step 308.
- A later Split removal plan must either migrate these workflows or explicitly decide that they do not need a non-primary comparison version.

### Step 308.6: Real-use Audit Checklist

- Write the real-use audit checklist.
- Define pass/fail signals.
- Decide whether a later Split removal plan is allowed.

Status: complete.

Real-use audit window:

- Use at least 1 full review session and preferably 2 separate trading days.
- Keep old Split available during the audit.
- Record friction immediately in TODO/session notes instead of relying on memory.
- Do not start Split removal until all required checklist rows pass or are explicitly waived.

Checklist:

| Workflow | Required action | Pass signal | Fail signal |
| --- | --- | --- | --- |
| NQ/ES SMT | Use Main=NQ and Comparison=ES on the same timeframe; create or review SMT evidence; select and locate it from Inspector. | SMT renders on primary and comparison, selection opens Inspector, locate lands on the expected time. | Need old Split to see SMT, selection misses comparison object, or locate only works on secondary. |
| 1M + HTF replay | Use primary 1M with comparison 1H or 4H while Replay On. | Comparison HTF candle progresses without showing future complete candle; cursor/hover sync is usable. | Future HTF data appears early, chart desyncs, or comparison becomes visually misleading. |
| Comparison annotation | Create BSL/SSL, FVG/IFVG, and Segment in Comparison Window. | Objects keep comparison source metadata and later render/select/filter correctly. | Metadata wrong, wrong price-axis projection, or Inspector cannot review the object. |
| Active Order Setup evidence | Add comparison bar evidence and link comparison-created PDA/Segment/FVG where supported. | Active setup records the evidence with `sourceChartId=comparison-window`. | Evidence loses source context or still requires old Split for normal setup review. |
| Calendar/Inspector locate | Locate comparison-source objects from Calendar or Inspector after the locate router migration. | Primary and comparison target behavior is predictable; status copy names the target. | Locate silently falls back to primary or cannot reach comparison. |
| Replay History restore | Save a replay state with Comparison Window enabled, reload, and restore from History. | Primary cursor/range and comparison instrument/timeframe/window state restore. | Comparison state is missing, stale, or loads a wrong range. |
| Fixed layout preference | During the same review, try doing the workflow without old Stack/Side Split. | Floating/sliding window is ergonomically acceptable for repeated comparison. | User still needs fixed Stack/Side layout for high-frequency work. |
| Advanced PDA frequency | Track every need for OB, Breaker, Fib, Range PDA draft, EQH/EQL Point Sets in comparison context. | These are low-frequency or acceptable on primary/old Split. | Any becomes frequent enough to block Split removal. |

Pass/fail rule:

- Split removal plan is allowed only if all required workflows pass and any advanced PDA misses are either migrated or explicitly waived.
- If a workflow fails, create a focused migration step rather than deleting Split.
- If fixed Stack/Side layout remains preferred, keep Split or build a fixed-layout mode for Comparison Window before removal.

Recommended next implementation order after Step 308:

1. Implement chart context locate routing.
2. Implement pick-preview routing.
3. Implement comparison hit-test link to active setup.
4. Optionally migrate OB Last Bar and Wick CE.
5. Run the real-use audit.
6. Only then decide whether to open a Split removal plan.

Step 308 closeout:

- Completed planning for all Split-only workflow gaps.
- No production feature code was changed in Step 308.
- Old Split remains available and should not be removed until the audit passes.

## Non-goals

- Do not remove Split in Step 308.
- Do not rewrite all chart managers into a full multi-window framework unless a workflow requires it.
- Do not duplicate advanced PDA menu complexity in Comparison Window without a usage reason.
- Do not change Review JSON schema solely for temporary UI window state.
