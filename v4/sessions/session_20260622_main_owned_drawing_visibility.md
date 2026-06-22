# Step 318: Main-Owned Drawing Visibility Semantics

Date: 2026-06-22
Branch: feature/comparison-window-mvp
Status: planned

## Problem

Current `No Sync` behavior still treats drawings as source-window-local:

- a PDA/Segment created in Comparison stays visible in Comparison under `No Sync`;
- switching Sync -> No Sync returns it to Comparison-only visibility.

That does not match the intended model. Main is the canonical review chart. Drawings may be created from either chart, but under `No Sync` the Comparison chart should hide drawings while Main still shows them.

## Target Semantics

- `Sync`: Main and Comparison both show compatible drawings.
- `No Sync`: Main shows compatible drawings; Comparison hides drawings.
- Drawings created in Comparison are still workspace drawings and should not be trapped in Comparison-only visibility.
- If the user draws from Comparison while `No Sync` is active, automatically switch Drawings to `Sync` before creating the object.
- If Main/Comparison instrument or timeframe do not match, do not create Comparison drawings; show a status message instead.

## Steps

### Step 318.1: Policy Semantics Update

Update render/hit policy so chart target, not creation source, defines visibility:

- Primary/Main target: allow compatible PDA/Segment objects regardless of source.
- Comparison target: allow compatible PDA/Segment objects only when Drawings is `Sync`.
- Mismatch still blocks cross-context projection.

### Step 318.2: Comparison Creation Auto-Sync

Before Comparison context-menu creates PDA/Segment:

- if Drawings is `No Sync`, switch it to `Sync`;
- if sync is impossible due to instrument/timeframe mismatch, block creation and surface a concise status message.

### Step 318.3: Browser Verification

Extend browser smoke:

- Set `No Sync`, create PDA/Segment from Comparison, assert mode becomes `Sync`.
- Assert object hits in Main and Comparison.
- Switch back to `No Sync`, assert object still hits in Main and no longer hits in Comparison.

### Step 318.4: Closeout Verification

Expected commands:

- `git diff --check`
- `node v4/tests/comparison-overlay-policy-smoke.js`
- `node v4/tests/comparison-window-persistence-smoke.js`
- `node v4/tests/comparison-window-browser-smoke.js`
