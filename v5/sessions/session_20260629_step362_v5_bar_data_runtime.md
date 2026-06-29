# Step 362 - V5 Bar Data Runtime

## Goal

Add the only V5 runtime allowed to request K-line bars and own loaded bar
windows.

## Completed

### Step 362.1 - V4 Bars Endpoint Wrapper

- Added `v5/src/runtime/bar-data-runtime.js`.
- The runtime wraps the existing `/v4/bars` endpoint internally.
- Registered `runtime.barData` in the V5 app shell.
- Feature modules still do not import bars clients or request bars directly.

### Step 362.2 - Bounded Request Planner

- Added `barData.planWindow`.
- Added `planBoundedBarWindow` and `normalizeBarWindow`.
- Windows may be planned by explicit `start`/`end` or by `anchor`/`count`.
- Oversized windows are rejected before fetch.

### Step 362.3 - Window Cache And Release

- Added commands:
  - `barData.loadWindow`
  - `barData.getWindow`
  - `barData.releaseWindow`
  - `barData.getCacheSummary`
- Cache keys include instrument, timeframe, start, and end.
- Loaded bars are normalized, sorted, and deduped.
- Explicit window release emits `barData:windowReleased`.

### Step 362.4 - Full-Range Preload Guards

- Added `v5/tests/bar-data-runtime-smoke.js`.
- Added `v5/tests/bar-data-boundary-smoke.js`.
- Added `v5/tests/bar-data-preload-boundary-smoke.js`.
- Added the new tests to `v5/scripts/smoke_all.js`.

## Checks

- `node v5/tests/bar-data-runtime-smoke.js`
- `node v5/tests/bar-data-boundary-smoke.js`
- `node v5/tests/bar-data-preload-boundary-smoke.js`
- `node v5/scripts/smoke_all.js`
- `git diff --check`

## Manual Acceptance

- Bar data runtime can load bounded bar windows.
- Runtime owns the window cache and explicit release behavior.
- Feature modules cannot request bars directly.
- Session setup/session creation do not request bars.
- Oversized full-range requests fail before touching the API.

## Next Step

Step 363 should implement FX Replay initial load:

- resolve the session start bar;
- ask chart runtime for viewport metrics;
- request a bounded prefix window through bar data runtime;
- render prefix plus start through chart runtime;
- guard that display state contains no bars after the start bar.

Do not let replay runtime call `/v4/bars` directly. Replay should request data
through bar data runtime commands only.
