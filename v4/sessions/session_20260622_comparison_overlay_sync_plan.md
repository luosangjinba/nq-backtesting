# Step 315: Comparison Overlay Sync Controls

Date: 2026-06-22
Branch: feature/comparison-window-mvp
Status: planned

## Context

Real-use testing showed that hard source isolation is too restrictive. It fixed the immediate bug where Comparison-created PDA/Segment rendered on the Main chart, but it prevents the TradingView-like workflow where drawings can be synchronized across panes when safe.

The desired behavior is not global automatic sync. It is a controllable simplified model:

- `Local`: no cross-chart price overlay projection.
- `Sync`: cross-chart price overlay projection only when Main and Comparison share the same instrument and timeframe.

This keeps the safety boundary for `NQ` vs `ES` and `1M` vs `1H/4H`, while allowing same-chart review such as `Main NQ 1M` plus `Comparison NQ 1M`.

## Goals

- Add a visible `Overlays` control to the Comparison Window.
- Persist `overlaySyncMode` with the comparison workspace.
- Implement a single safe sync policy helper.
- Sync PDA/Segment overlays bidirectionally when safe.
- Sync Order Setup and Live Record overlays to Comparison Window when safe.
- Preserve source labels such as `Main NQ 1M` and `Comparison NQ 1M`.

## Non-goals

- Do not implement TradingView's full `No sync / Sync in layout / Sync globally` model.
- Do not sync price objects across different instruments.
- Do not sync price objects across different timeframes in this first version.
- Do not remove Split.
- Do not change persisted object source ownership.

## Steps

### Step 315.1: State and UI Contract

Add `overlaySyncMode: local | sync` to the comparison descriptor/store/persistence. Add a compact header select:

- `Overlays: Local`
- `Overlays: Sync`

Default remains `Local`.

### Step 315.2: Safe Sync Policy Helper

Create a small helper that answers:

- current Main instrument/timeframe;
- current Comparison instrument/timeframe;
- whether a given object can render on a given chart target.

First version allows cross-chart sync only when instrument and timeframe match.

### Step 315.3: PDA/Segment Sync Rendering

Update Main and Comparison PDA/Segment renderers:

- Local: render only local-source objects.
- Sync and safe: render Main and Comparison source objects on both charts.
- Labels retain source prefix.

### Step 315.4: Order Setup / Live Record Sync Rendering

Update Order Setup and Live Record overlay rendering so Main-sourced execution overlays can show on Comparison when safe.

### Step 315.5: Hit-test and Selection Routing

Update PDA/Segment/Order/Live hit-test behavior to match overlay visibility:

- Local: source-isolated hit-test.
- Sync and safe: hit-test synced objects on both charts.

### Step 315.6: Verification

Browser/focused coverage:

- Local: Main and Comparison objects do not cross-render.
- Sync + same `NQ 1M`: PDA/Segment cross-render and cross-hit.
- Sync + `NQ/ES`: price objects stay local.
- Sync + `1M/1H`: price objects stay local.
- Order Setup and Live Record overlays appear in Comparison only under safe sync.

## Verification Commands

Expected during implementation:

- `git diff --check`
- `node v4/tests/comparison-window-browser-smoke.js`
- `node v4/tests/pda-locate-actions-smoke.js`
- `node v4/tests/pick-context-router-smoke.js`
- `node v4/tests/viewport-router-smoke.js`
- targeted Order/Live smoke after Step 315.4
