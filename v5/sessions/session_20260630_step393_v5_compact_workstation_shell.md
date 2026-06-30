# Step 393 - V5 Compact Workstation Shell

Date: 2026-06-30

## Goal

Remove the large app-shell header from the chart route so the replay workstation
allocates more first-viewport space to the chart surface, while preserving a
clear way to return to setup.

## Scope

This step advances Historical Replay Review by tightening the chart workstation
composition after comparing the current V5 header against the more compact
FXReplay layout.

In scope:

- route-scoped app-shell styling;
- hiding the global `V5 / FX Replay` header only on the chart route;
- preserving setup navigation from inside the chart workstation toolbar;
- reclaiming chart-route padding and vertical space;
- browser smoke coverage for the shell/layout behavior.

Out of scope:

- Layout split panes;
- left-side drawing tools;
- order/journal panels;
- chart runtime or Lightweight interaction changes;
- replay cursor, reveal, or bar-data loading changes.

## Plan

- [x] Add a router-owned current-route marker to the root shell.
- [x] Hide `.top-bar` when the current route is `chart`.
- [x] Keep the setup page's full header and route tabs unchanged.
- [x] Add a compact `Setup` route link inside the chart workstation toolbar.
- [x] Reduce chart-route outer padding and increase chart viewport vertical
  room.
- [x] Update app-shell and workstation layout browser smokes.

## Implementation Notes

- `v5/src/runtime/router.js` now writes `data-current-route` on the root shell
  during render. This keeps route-aware layout as app-shell responsibility.
- `v5/src/styles/app.css` uses that route marker to hide `.top-bar` only on the
  chart route and reduce chart-route workspace padding.
- `v5/src/features/chart-replay/chart-replay-route.js` adds a `Setup` route
  link to the chart workstation toolbar. It uses the existing app-level
  `data-route-link` delegation instead of importing router internals.
- `v5/tests/app-shell-browser-smoke.js` now verifies route marking, hidden
  chart header, and returning to setup through the chart-local Setup entry.
- `v5/tests/replay-workstation-layout-browser-smoke.js` now verifies the chart
  route starts near the top of the viewport and still preserves setup
  navigation.

## Manual Acceptance

- On the chart route, the large `V5 / FX Replay` app header is not visible.
- On the setup route, the app header remains visible and route tabs still work.
- The chart route includes a compact `Setup` entry for returning to session
  setup.
- The chart surface receives more vertical room.
- Replay cursor ownership, chart series ownership, native Lightweight
  interactions, and bar-data ownership are unchanged.

## Checks

- `node v5/tests/app-shell-browser-smoke.js`
- `node v5/tests/replay-workstation-layout-browser-smoke.js`
- `node v5/tests/chart-responsive-visual-browser-smoke.js`
- `node v5/scripts/smoke_all.js`
- `git diff --check`

All checks passed before commit.
