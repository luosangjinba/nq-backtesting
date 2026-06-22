# Step 315: Comparison Overlay Sync Controls

Date: 2026-06-22
Branch: feature/comparison-window-mvp
Status: completed

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

Status: completed.

Add `overlaySyncMode: local | sync` to the comparison descriptor/store/persistence. Add a compact header select:

- `Overlays: Local`
- `Overlays: Sync`

Default remains `Local`.

Implementation:

- Added `COMPARISON_OVERLAY_SYNC_MODE` and descriptor default `overlaySyncMode: local`.
- Added `setComparisonOverlaySyncMode()` to the comparison store.
- Persisted and sanitized `overlaySyncMode` in comparison workspace localStorage.
- Added `Overlays Local/Sync` select to the Comparison Window header.

Verification:

- `git diff --check`
- `node v4/tests/comparison-window-persistence-smoke.js`
- `node v4/tests/comparison-window-browser-smoke.js`

### Step 315.2: Safe Sync Policy Helper

Status: completed.

Create a small helper that answers:

- current Main instrument/timeframe;
- current Comparison instrument/timeframe;
- whether a given object can render on a given chart target.

First version allows cross-chart sync only when instrument and timeframe match.

Implementation notes:

- `comparison-overlay-policy` now exposes a sync policy and chart-target render guard.
- Local mode keeps cross-chart rendering disabled.
- Sync mode allows only Main <-> Comparison with matching instrument and timeframe.
- Verification: `git diff --check`, `node v4/tests/comparison-overlay-policy-smoke.js`, `node v4/tests/comparison-window-browser-smoke.js`.

### Step 315.3: PDA/Segment Sync Rendering

Status: completed.

Update Main and Comparison PDA/Segment renderers:

- Local: render only local-source objects.
- Sync and safe: render Main and Comparison source objects on both charts.
- Labels retain source prefix.

Implementation notes:

- Main PDA/Segment renderers now ask the sync policy before skipping Comparison-sourced objects.
- Comparison PDA/Segment renderers now accept Main-sourced objects only when the sync policy allows projection.
- Secondary chart rendering remains isolated; this step only covers Main <-> Comparison.
- Verification: `git diff --check`, `node v4/tests/comparison-overlay-policy-smoke.js`, `node v4/tests/comparison-window-browser-smoke.js`.

### Step 315.4: Order Setup / Live Record Sync Rendering

Status: completed.

Update Order Setup and Live Record overlay rendering so Main-sourced execution overlays can show on Comparison when safe.

Implementation notes:

- Order Setup renderer now renders through a chart-context target and keeps separate primitive lists for Primary and Comparison.
- Live Record renderer uses the same target pattern.
- Comparison rendering is gated by the sync policy and treats these execution overlays as Main-sourced.
- Source data, Inspector records, and active selection state are unchanged.
- Verification: `git diff --check`, `node v4/tests/comparison-overlay-policy-smoke.js`, `node v4/tests/comparison-window-browser-smoke.js`.

### Step 315.5: Hit-test and Selection Routing

Status: completed.

Update PDA/Segment/Order/Live hit-test behavior to match overlay visibility:

- Local: source-isolated hit-test.
- Sync and safe: hit-test synced objects on both charts.

Implementation notes:

- PDA and Segment hit-test now use the same Main/Comparison sync policy as renderers.
- Order Setup and Live Record hit-test filter comparison context hits through the sync policy.
- Browser smoke now verifies Local isolation and Sync-safe PDA/Segment bidirectional hit-test.
- Verification: `git diff --check`, `node v4/tests/comparison-overlay-policy-smoke.js`, `node v4/tests/comparison-window-browser-smoke.js`.

### Step 315.6: Verification

Status: completed.

Browser/focused coverage:

- Local: Main and Comparison objects do not cross-render.
- Sync + same `NQ 1M`: PDA/Segment cross-render and cross-hit.
- Sync + `NQ/ES`: price objects stay local.
- Sync + `1M/1H`: price objects stay local.
- Order Setup and Live Record overlays appear in Comparison only under safe sync.

Final notes:

- Browser smoke now covers Local isolation, Sync-safe PDA/Segment bidirectional hit-test, and Sync-safe Order/Live hit-test in the Comparison context.
- The UI remains intentionally simpler than TradingView: `Local` vs `Sync`, with Sync guarded by exact instrument and timeframe match.

## Verification Commands

Final verification:

- `git diff --check`
- `node v4/tests/comparison-overlay-policy-smoke.js`
- `node v4/tests/comparison-window-persistence-smoke.js`
- `node v4/tests/comparison-window-browser-smoke.js`
