# Step 311: Comparison Window Existing-object Hit-test Link Plan

Date: 2026-06-22
Branch: feature/comparison-window-mvp
Status: planned

## Context

Step 309 migrated locate routing.

Step 310 migrated pick-preview routing.

The next Split-only workflow from Step 308.4 is existing-object hit-test link:

- old Secondary/Split context menu can right-click existing PDA / Segment / Composite objects;
- it can link those hit objects to the active Order Setup;
- Comparison Window currently supports creating comparison-source objects and adding bar evidence, but does not hit-test existing objects for direct link actions.

## Goals

- Add existing-object hit state to Comparison Window context menu.
- Reuse existing hit-test functions for PDA, Segment, and Composite when the comparison chart context supports them.
- Reuse `handleOrderSetupChartAction` for Link To Active Setup actions.
- Preserve existing Comparison Window bar evidence, PDA creation, Segment creation, copy, and primary locate actions.
- Keep old Split/Secondary behavior unchanged.

## Non-goals

- Do not remove Split.
- Do not migrate OB/Breaker/Fib/Point Sets advanced PDA workflows.
- Do not change manual SMT selection logic.
- Do not auto-open Comparison Window.

## Step 311.1: Audit Secondary/Comparison Hit-test Link Flow

Status: Completed in implementation.

Commit:
- Pending in current Step 311 execution.

Audit findings:
- `secondary-context-menu.js` stores `contextMenuPdaHit`, `contextMenuSegmentHit`, and `contextMenuSegmentGroupHit`.
- Secondary right-click computes hits with `hitTestPdaAnnotations({ x, y, context })`, `hitTestSegments({ x, y, context })`, and `hitTestSegmentGroups({ x, y, context })`.
- Secondary link actions map to `order-setup-link-pda`, `order-setup-link-segment`, and `order-setup-link-composite`, then delegate to `handleOrderSetupChartAction`.
- The reusable payload shape is `{ bar, price, timeframe, pdaHit, segmentHit, segmentGroupHit }`.
- `handleOrderSetupChartAction` looks up PDA and Segment store records from hit ids; Composite can use the hit object directly when it has an id.
- `comparison-context-menu.js` currently stores only bar/price and has no existing-object hit state.
- Comparison already has an Order Setup evidence section for bar evidence, making the link actions a natural extension there.

Confirm:

- secondary link action ids and delegation shape;
- required context menu stored state;
- hit-test function inputs and source metadata guards;
- comparison menu existing action structure.

Expected reusable APIs:

- `hitTestPdaAnnotations({ x, y, context })`;
- `hitTestSegments({ x, y, context })`;
- `hitTestSegmentGroups({ x, y, context })`;
- `handleOrderSetupChartAction(action, payload)`.

## Step 311.2: Add Comparison Hit-test State

Status: Completed in implementation.

Commit:
- Pending in current Step 311 execution.

Implemented:
- Added comparison context menu hit state for PDA, Segment, and Composite.
- Right-click now computes comparison hits with the same hit-test functions used by secondary.
- Hiding the comparison menu clears stored hit state.
- Link actions are intentionally deferred to Step 311.3.

Update `comparison/comparison-context-menu.js`:

- add `contextMenuPdaHit`;
- add `contextMenuSegmentHit`;
- add `contextMenuSegmentGroupHit`;
- compute hits in right-click handler using `getComparisonChartContext()`;
- clear hit state when menu hides.

## Step 311.3: Add Link To Active Setup Menu Actions

Status: Completed in implementation.

Commit:
- Pending in current Step 311 execution.

Implemented:
- Added an Order Setup Evidence submenu to the Comparison Window context menu.
- Kept Add Comparison Bar Evidence in that submenu.
- Added Link PDA, Link Segment, and Link Composite actions with active setup and hit-state guards.
- Delegated link actions to `handleOrderSetupChartAction` with comparison bar/price/timeframe/hit payload.

Add an Order Setup Evidence section to Comparison Window menu:

- keep `Add Comparison Bar Evidence`;
- add `Link PDA To Active Setup`;
- add `Link Segment To Active Setup`;
- add `Link Composite To Active Setup`.

Rules:

- disable link actions when no active setup exists;
- disable each link action when its hit is absent;
- delegate to `handleOrderSetupChartAction` with comparison bar/price/timeframe/hit state.

## Step 311.4: Integrate Picker Workflows

Status: Completed in implementation.

Commit:
- Pending in current Step 311 execution.

Implemented:
- Added Comparison Window click selection wiring for PDA hits.
- Added Comparison Window click selection wiring for Segment and Composite hits.
- Reused existing Inspector picker bus handlers: `pda:selected`, `segment:selected`, and `segment-group:selected`.
- Comparison selection binding is lazy because the comparison chart canvas may be created after selection modules initialize.

If existing picker workflows are active:

- Order Review reason select object;
- Live Record reason select object;
- Time Reaction select object;

then comparison context hit objects should route into the same picked-object handlers where possible.

If this is already covered by global selection events, document that no extra code is needed.

## Step 311.5: Browser And Focused Verification

Status: Completed in implementation.

Commit:
- Pending in current Step 311 execution.

Verification run:

- `node --check v4/src/comparison/comparison-context-menu.js`
- `node --check v4/src/pda/pda-selection.js`
- `node --check v4/src/segment/segment-selection.js`
- `node v4/tests/comparison-window-persistence-smoke.js`
- `node v4/tests/pick-context-router-smoke.js`
- `node v4/tests/smt-selection-smoke.js`
- `node v4/tests/comparison-window-browser-smoke.js`
- `node v4/tests/live-record-smoke.js`
- `git diff --check`

Notes:
- Existing comparison browser smoke covers comparison object creation and comparison bar evidence metadata.
- A narrower browser assertion that right-clicks an existing comparison object and clicks Link PDA/Segment can be added later if needed; current implementation uses the same delegated action path as secondary.

Run focused checks:

- comparison context menu syntax;
- hit-test smoke if low-risk to construct.

Run browser checks:

- `node v4/tests/comparison-window-browser-smoke.js`;
- `node v4/tests/live-record-smoke.js`;
- `node v4/tests/smt-selection-smoke.js`.

If low-risk, extend comparison browser smoke:

- create or use a comparison PDA/Segment;
- right-click hit location;
- link to active setup;
- assert linked ref/source metadata contains `sourceChartId=comparison-window`.

## Step 311.6: Closeout

Status: Completed in implementation.

Commit:
- Pending in current Step 311 execution.

Completed:
- Added Comparison Window existing-object hit state.
- Added Link PDA / Segment / Composite To Active Setup actions.
- Reused `handleOrderSetupChartAction` for active setup link delegation.
- Wired Comparison Window hit selection into existing picker workflows through global selection events.
- Verified focused syntax/smoke and comparison browser workflow.

Remaining Split removal blockers:
- Advanced PDA workflows remain primary/old Split scoped: OB/Breaker range drafts, Fib, and EQH/EQL Point Sets.
- Real-use audit from Step 308.6 still needs to pass before opening a Split removal plan.
- Fixed Stack/Side layout preference still needs explicit user workflow review.
- A narrower browser click assertion for right-click Link PDA/Segment on Comparison Window is optional future test hardening.

Update:

- `v4/TODO.md`;
- this session file.

Record:

- commits;
- verification;
- remaining Split removal blockers.
