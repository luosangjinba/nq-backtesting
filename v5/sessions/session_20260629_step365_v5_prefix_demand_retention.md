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

Commit: `9978b5e Load V5 prefix demand chunks`

### Step 365.3 - Merge Sparse Prefix Chunks

- Added sparse display merge for replay bars keyed by timestamp.
- Older prefix chunks are merged with current display bars without constructing
  a dense session-wide array.
- Merged display bars are written through chart runtime only.
- Added `v5/tests/prefix-demand-merge-smoke.js`.

Commit: `feb6ad8 Merge V5 sparse prefix chunks`

### Step 365.4 - Release Off-Screen Chunks

- Added explicit prefix retention based on two visible-range spans.
- Replay runtime releases prefix chunks that are older than the retention range
  when chart visible range changes.
- Released chunks are removed from replay `prefixChunks`, recorded in
  `releasedPrefixChunks`, removed from display bars, and released from bar data
  cache through `barData.releaseWindow`.
- Added `v5/tests/prefix-retention-smoke.js`.

## Checks

- `node v5/tests/prefix-demand-detect-smoke.js`
- `node v5/tests/prefix-demand-load-smoke.js`
- `node v5/tests/prefix-demand-merge-smoke.js`
- `node v5/tests/prefix-retention-smoke.js`
- `node v5/scripts/smoke_all.js`
- `git diff --check`

## Next Step

Step 366 should start turning the V5 replay navigation into usable UI controls
or define the next MVP slice in `v5/TODO.md`.
