# Step 316: Overlay Source Model Simplification

Date: 2026-06-22
Branch: feature/comparison-window-mvp
Status: planned

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

Audit source metadata use across PDA, Segment, Order Setup, Live Record, labels, Inspector, locate, and edit/delete routing.

Expected result:

- identify metadata that must stay internal;
- identify chart label text that can be simplified;
- identify tests needed for edit/delete routing.

### Step 316.2: Label/UI Simplification

Simplify on-chart PDA/Segment labels so the object label emphasizes instrument/timeframe, not source chart name.

Expected behavior:

- PDA label example: `BSL · NQ 1M`;
- Segment label example: `1M UP LEG`;
- source chart remains visible in Inspector/details, not as the primary user decision.

### Step 316.3: Edit/Delete Routing Verification

Verify synced objects still select and mutate the original object record:

- selecting Main-sourced PDA/Segment from Comparison selects the original id;
- deleting or hiding it removes/hides the same object from both windows under Sync;
- no cloned synced object is created.

### Step 316.4: Verification

Focused verification:

- Local mode keeps source-window-only behavior;
- Sync safe allows cross render/hit;
- Sync mismatch falls back to local-like behavior;
- edit/delete routing works on original object ids;
- source metadata is retained for persistence/Inspector/locate.

Commands expected:

- `git diff --check`
- `node v4/tests/comparison-overlay-policy-smoke.js`
- `node v4/tests/comparison-window-persistence-smoke.js`
- `node v4/tests/comparison-window-browser-smoke.js`
