# Step 317: Drawing Sync / No Sync Semantics

Date: 2026-06-22
Branch: feature/comparison-window-mvp
Status: planned

## Goal

Replace the current `Local / Sync` wording and default behavior with a TradingView-like `Sync / No Sync` model:

- `Sync` is the default.
- PDA/Segment drawings are workspace/layout objects, not objects owned by one visible window.
- When Main and Comparison share the same instrument and timeframe, drawings can show in both windows regardless of which window created them.
- `No Sync` explicitly disables cross-window drawing display.
- Instrument/timeframe mismatch always blocks cross-window projection to prevent false chart context.

## Clarified Semantics

`sourceChartId` remains internal metadata:

- creation audit;
- Inspector/debug context;
- locate routing;
- persistence and object identity.

It must not be presented as the primary user-facing display boundary. The user-facing boundary is only:

- `Sync`: show compatible drawings across windows;
- `No Sync`: do not show drawings across windows.

## Steps

### Step 317.1: Rename State Contract

Status: completed.

- Replace `COMPARISON_OVERLAY_SYNC_MODE.local` with `COMPARISON_OVERLAY_SYNC_MODE.noSync`.
- Keep `sync`.
- Default `overlaySyncMode` to `sync`.
- Add backward compatibility so persisted `local` is restored as `no-sync`.

Implementation notes:

- Descriptor default is now `overlaySyncMode: sync`.
- `setComparisonOverlaySyncMode('local')` and persisted `local` values are mapped to `no-sync`.
- Invalid persisted values fall back to `sync`.
- Verification: `node v4/tests/comparison-window-store-smoke.js`, `node v4/tests/comparison-window-persistence-smoke.js`, `node v4/tests/comparison-overlay-policy-smoke.js`.

### Step 317.2: Update UI Copy

- Rename header label from `Overlays` to `Drawings`.
- Show options in the order `Sync`, `No Sync`.
- Ensure default visible value is `Sync`.
- Keep the same compact control footprint.

### Step 317.3: Adjust Policy Semantics

- `Sync` plus same instrument/timeframe means PDA/Segment cross-window display/hit-test is allowed by default.
- `No Sync` means cross-window display/hit-test is disabled.
- Mismatch instrument/timeframe disables cross-window display/hit-test even when `Sync`.
- Source metadata remains unchanged and still identifies creation context.

### Step 317.4: Focused Verification

Update focused/browser smoke coverage:

- default descriptor is `sync`;
- old persisted `local` becomes `no-sync`;
- default Sync + same NQ 1M shows/hits drawings both ways;
- No Sync prevents cross-window drawing hit/render;
- Sync mismatch still prevents cross-window projection.

Expected commands:

- `git diff --check`
- `node v4/tests/comparison-overlay-policy-smoke.js`
- `node v4/tests/comparison-window-persistence-smoke.js`
- `node v4/tests/comparison-window-browser-smoke.js`
