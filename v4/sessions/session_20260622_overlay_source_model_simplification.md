# Step 316: Overlay Source Model Simplification

Date: 2026-06-22
Branch: feature/comparison-window-mvp
Status: completed

## Goal

Keep chart source metadata for correctness, persistence, locate, and edit/delete routing, but simplify the user-facing model:

- users draw in whichever window they are working in;
- `Local` keeps the object in its source window;
- `Sync` shows safe same-instrument/same-timeframe objects in both Main and Comparison;
- labels and controls should not make users decide between "Main PDA" and "Comparison PDA" as separate object types.

## Non-Goals

- Do not remove `sourceChartId`, `sourceChartLabel`, `sourceInstrument`, `sourceTimeframe`, or `sourceContext`.
- Do not add object-level sync controls yet.
- Do not change Secondary/Split advanced PDA behavior in this step.

## Steps

### Step 316.1: Source Model Audit

Status: completed.

Audit source metadata use across PDA, Segment, Order Setup, Live Record, labels, Inspector, locate, and edit/delete routing.

Expected result:

- identify metadata that must stay internal;
- identify chart label text that can be simplified;
- identify tests needed for edit/delete routing.

Findings:

- `sourceChartId`, `sourceChartLabel`, `sourceInstrument`, `sourceTimeframe`, `sourceTimeframeLabel`, and `sourceContext` must stay. They are used by sync projection, locate routing, Order/Live evidence metadata, Inspector details, persistence, and source-aware identity.
- PDA on-chart labels currently use `formatPdaDisplayLabel()`, which includes `Main` / `Comparison` through `formatPdaSourceBadge()`. This is the main user-facing source noise to weaken.
- Segment on-chart labels already do not include chart source; they use timeframe + direction. Segment Inspector still shows source chart details, which is appropriate.
- Selection/edit/delete routing already uses object ids from the shared stores. Sync rendering and hit-test return original ids, not cloned ids.
- Order Setup and Live Record sync rendering treats execution overlays as Main-sourced and does not create comparison copies.

Implementation boundary:

- Step 316.2 should split PDA source formatting into a chart-source badge for Inspector/details and a source-context label for on-chart display.
- Step 316.3 should add explicit browser assertions that synced cross-window selection/edit/delete acts on original object ids and does not create duplicates.

### Step 316.2: Label/UI Simplification

Status: completed.

Simplify on-chart PDA/Segment labels so the object label emphasizes instrument/timeframe, not source chart name.

Expected behavior:

- PDA label example: `BSL · NQ 1M`;
- Segment label example: `1M UP LEG`;
- source chart remains visible in Inspector/details, not as the primary user decision.

Implementation notes:

- Added `formatPdaChartLabel()` for on-chart PDA labels.
- Kept `formatPdaSourceBadge()` and `formatPdaDisplayLabel()` for Inspector/details and evidence/ref contexts that still need chart source.
- Primary, Secondary, and Comparison PDA renderers now use chart labels without `Main` / `Comparison` by default.
- Verification: `git diff --check`, `node v4/tests/pda-source-format-smoke.js`, `node v4/tests/comparison-window-browser-smoke.js`, `node v4/tests/live-record-smoke.js`.

### Step 316.3: Edit/Delete Routing Verification

Status: completed.

Verify synced objects still select and mutate the original object record:

- selecting Main-sourced PDA/Segment from Comparison selects the original id;
- deleting or hiding it removes/hides the same object from both windows under Sync;
- no cloned synced object is created.

Implementation notes:

- Extended comparison browser smoke to hit Main-sourced PDA/Segment from the Comparison chart under Sync-safe mode.
- The test selects the hit ids, updates the original store records, deletes those original ids, and verifies object counts go from 1 to 0.
- This confirms synced rendering remains a projection of the original object, not a cloned Comparison object.
- Verification: `git diff --check`, `node v4/tests/comparison-window-browser-smoke.js`.

### Step 316.4: Verification

Status: completed.

Focused verification:

- Local mode keeps source-window-only behavior;
- Sync safe allows cross render/hit;
- Sync mismatch falls back to local-like behavior;
- edit/delete routing works on original object ids;
- source metadata is retained for persistence/Inspector/locate.

Commands expected:

- `git diff --check`
- `node v4/tests/pda-source-format-smoke.js`
- `node v4/tests/comparison-overlay-policy-smoke.js`
- `node v4/tests/comparison-window-persistence-smoke.js`
- `node v4/tests/comparison-window-browser-smoke.js`

Final result:

- PDA chart labels now hide chart-source by default while keeping instrument/timeframe visible.
- Inspector/ref metadata still preserves chart source.
- Sync rendering and hit-test still route to original object ids.
- Browser smoke verifies cross-window hit, select, update, and delete on the original PDA/Segment records.
