# Step 451 - V5 Modularization Audit And Next Boundary Selection

Status: completed.

Date: 2026-07-02

## Goal

Pause broad CSS splitting and audit current modularity before choosing the next
workstream.

## Plan

1. Record CSS module sizes after Steps 447-450.
2. Record chart replay route/controller sizes after JS splits.
3. Record runtime size hotspots.
4. Check CSS selector ownership for Settings, transport, navigation, and
   truncate.
5. Update TODO/session handoff and run lightweight checks.

## Audit Results

CSS line counts:

- `src/styles/app.css`: 616 lines.
- `src/styles/chart-settings.css`: 250 lines.
- `src/styles/replay-transport.css`: 150 lines.
- `src/styles/chart-navigation.css`: 114 lines.
- `src/styles/replay-truncate.css`: 87 lines.

Chart replay route/controller line counts:

- `chart-replay-route.js`: 407 lines.
- `chart-replay-controls.js`: 218 lines.
- `chart-replay-status.js`: 182 lines.
- `chart-replay-truncate.js`: 171 lines.
- `chart-replay-navigation.js`: 128 lines.
- `replay-floating-controls.js`: 136 lines.
- Settings is split into template, panel, lifecycle, modal, draft, bindings
  composer, and section bindings.

Runtime hotspots:

- `chart-runtime.js`: 612 lines.
- `chart-engine-presentation.js`: 463 lines.
- `replay-navigation-controller.js`: 403 lines.
- `bar-data-runtime.js`: 324 lines.
- `chart-engine-lightweight-adapter.js`: 299 lines.

## Boundary Notes

- Settings, replay transport, chart navigation, and replay truncate CSS now
  have feature-owned stylesheets.
- `app.css` still owns global shell, setup form, chart shell/overlay, replay
  status/footer, fallback chart, and responsive layout styles.
- Broad CSS splitting should pause unless a complete UI surface has a clear
  owner and likely near-term change pressure.
- The next modularization step should prefer runtime/product boundaries over
  moving isolated selectors.

## Verification

- `node v5/tests/boundary-smoke.js`
- `git diff --check`

## Next Step Candidate

Step 452 should target the highest-risk runtime/product boundary. Current
candidates are `chart-runtime.js` ownership reduction,
`chart-engine-presentation.js` presentation mapping split, or a dedicated
product bug/interaction step.
