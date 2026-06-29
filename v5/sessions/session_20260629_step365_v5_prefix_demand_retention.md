# Step 365 - V5 Prefix Demand And Retention

## Goal

Make left drag request older prefix windows and release off-screen data.

## Completed

### Step 365.1 - Detect Viewport Demand

- Added chart runtime prefix-demand detection.
- Chart runtime computes demand when visible range moves near the earliest
  loaded chart bar.
- Added `chart.getPrefixDemand` and `chart:prefixDemand`.
- Detection does not request bars or mutate replay cursor state.
- Added `v5/tests/prefix-demand-detect-smoke.js`.

Commit: `23ccd2e Detect V5 prefix demand`

### Step 365.2 - Request Older Prefix Chunks

- Replay runtime subscribes to `chart:prefixDemand`.
- Prefix demand is fulfilled through `barData.loadWindow` with a bounded
  backward request anchored at the earliest loaded chart bar.
- Loaded older prefix chunks are recorded in replay state as `prefixChunks`.
- This step does not merge chunks into chart display state; sparse merge is left
  to Step 365.3.
- Added `v5/tests/prefix-demand-load-smoke.js`.

## Checks

- `node v5/tests/prefix-demand-detect-smoke.js`
- `node v5/tests/prefix-demand-load-smoke.js`
- `node v5/scripts/smoke_all.js`
- `git diff --check`

## Next Step

Step 365.3 should merge sparse prefix chunks without converting the whole
session range into a dense array. Keep chart writes behind chart runtime
commands.
