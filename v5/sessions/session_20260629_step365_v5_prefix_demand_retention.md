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

## Checks

- `node v5/tests/prefix-demand-detect-smoke.js`
- `node v5/scripts/smoke_all.js`
- `git diff --check`

## Next Step

Step 365.2 should have replay runtime consume prefix demand and request older
prefix chunks through bar data runtime. Keep bar requests behind
`barData.loadWindow`, and keep chart writes behind chart runtime commands.
