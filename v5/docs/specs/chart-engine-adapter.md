# Chart Engine Adapter

Phase: Phase 3 - Real Chart Interaction.

Phase gate: V5 can move from placeholder chart rendering to a real chart engine
without letting UI, replay, or bar-data modules own chart internals.

## Scope

Step 377 introduces a chart-engine adapter boundary.
Step 379 introduces the normal static-page loading path for the real
Lightweight Charts standalone build.
Step 380 tunes the real Lightweight Charts timeScale and interaction defaults
for replay-workstation behavior.
Step 381 adds adapter-owned crosshair event normalization for time/price
inspection.

In scope:

- a small adapter contract for mounting, setting bars, setting visible range,
  applying presentation settings, and destroying chart instances;
- optional use of `window.LightweightCharts` when a real engine is available;
- a local, pinned Lightweight Charts standalone script for the V5 static page;
- adapter-owned Lightweight Charts timeScale defaults for horizontal pan/zoom,
  right offset, stable spacing, and resize behavior;
- adapter-owned Lightweight Charts crosshair event subscription normalized to
  V5 chart-domain data;
- a DOM fallback so local static smoke tests remain deterministic without
  network or package installation;
- harnesses proving feature modules still do not call chart-engine APIs.

Out of scope:

- full production Lightweight Charts packaging decision;
- full drag/zoom pointer behavior;
- custom price/time axis formatting beyond existing presentation context;
- full tooltip/crosshair polish beyond the first chart-owned readout;
- orders, journal, annotations, auth, billing, and server persistence.

## Rules

- Chart runtime is the only runtime allowed to create or call chart-engine
  instances.
- UI modules must not import or call chart-engine APIs.
- Replay runtime must not import or call chart-engine APIs.
- Bar data runtime must not import or call chart-engine APIs.
- The adapter must preserve existing chart runtime commands/events.
- The adapter may render with a DOM fallback when `window.LightweightCharts` is
  unavailable.
- The fallback is a test/runtime compatibility path, not a separate product
  feature.
- The default `v5/index.html` path should load a pinned local Lightweight Charts
  script before `v5/src/app.js`, so normal browser use exercises the real chart
  engine without a network dependency.
- Lightweight timeScale and interaction options must be configured inside the
  adapter, not in UI or feature modules.
- The chart presentation `rightOffsetBars` setting remains the source of the
  engine timeScale right offset.
- The real engine path should enable horizontal drag/zoom while keeping vertical
  chart movement out of scope for the replay MVP.
- Programmatic runtime visible-range sync must not be treated as user manual
  interaction.
- Visible range changes from the engine must be converted into chart-runtime
  manual visible range state before they affect the rest of V5.
- Engine visible range changes may emit viewport demand, but must not request
  bars directly.
- Crosshair movement from the engine must be converted into chart-runtime
  inspection state before it affects UI.
- Crosshair movement must not mutate replay cursor, display bars, visible range,
  follow state, or bar-data cache.

## Adapter Contract

The adapter should expose a narrow instance API:

- `mount(host, options)`;
- `setBars(bars, context)`;
- `setVisibleRange(range)`;
- `setPresentation(context)`;
- `onCrosshairChange` mount option;
- `destroy()`;
- `readState()`.

The adapter input/output should use V5 chart-domain data. It should not expose
Lightweight Charts series objects or time-scale objects to feature modules.

## Verification

Step 377 should add or update harnesses proving:

- chart runtime can mount through the adapter;
- the adapter can use a fake Lightweight Charts implementation in tests;
- the DOM fallback keeps existing V5 smoke tests offline and deterministic;
- chart commands still return rendered bars and interaction readback;
- only chart runtime/adapter files reference chart-engine API names.

Expected checks:

- `node v5/tests/chart-engine-adapter-smoke.js`
- `node v5/tests/chart-runtime-smoke.js`
- `node v5/tests/chart-runtime-engine-adapter-smoke.js`
- `node v5/tests/chart-interaction-browser-smoke.js`
- `node v5/tests/chart-interaction-contracts-smoke.js`
- `node v5/tests/chart-engine-boundary-smoke.js`
- `node v5/scripts/smoke_all.js`
- `git diff --check`
