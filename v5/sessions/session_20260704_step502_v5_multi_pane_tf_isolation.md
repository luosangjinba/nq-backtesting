# Step 502 - Multi-Pane TF Isolation

Date: 2026-07-04

## Trigger

User reported two-pane TF behavior from screenshots:

- After switching from single pane to two panes, changing the initial active
  left pane TF could change both panes.
- After panes diverged, each pane's chart OHLC overlay TF label still followed
  the active pane/global TF instead of the pane's actual display TF.

## Diagnosis

Non-primary chart hosts were mounted with current chart state, but global
primary display sync still refreshed hosts that did not yet have an explicit
pane-local override. This let a fast primary TF change leak into a newly mounted
secondary pane before its pane-local display load completed.

The OHLC overlay label also used the route/global `getDisplayTimeframe()` value
for every overlay, so pane labels could show the active pane TF even when the
canvas data was different.

## Plan

1. Reproduce the two-pane sequence in browser smoke coverage.
2. Scope primary chart display/range/reset sync to the primary host only.
3. Keep non-primary updates behind pane-local display loads or explicit
   pane-targeted chart commands.
4. Render OHLC overlay TF labels from pane/canvas metadata.
5. Update docs and run multi-pane regressions.

## Changes

- `chart-runtime.js`
  - Global primary display sync now refreshes only the primary host.
  - Global append sync now appends only to the primary host.
  - Primary manual visible-range and reset/follow paths sync only the primary
    host instead of rerendering all mounted hosts.
- `chart-replay-status.js`
  - Each OHLC overlay reads `displayTimeframe` from its owning pane/canvas
    metadata before falling back to global replay state.
- `multi-pane-active-pane-browser-smoke.js`
  - Covers switching to two panes, changing primary to `1H`, verifying
    secondary remains `1m`, then changing secondary to `5m` and verifying both
    pane overlay labels stay correct.

## Verification

- `node v5/tests/multi-pane-active-pane-browser-smoke.js`
- `node v5/tests/multi-pane-viewport-demand-browser-smoke.js`
- `node v5/tests/replay-workstation-layout-browser-smoke.js`
- `node v5/tests/chart-runtime-pane-local-viewport-smoke.js`
- `node v5/tests/chart-price-scale-browser-smoke.js`

## Next

Recommended Step 503: split-pane resize and active-pane UX polish, including
resize-handle hit area, minimum pane wall behavior, and active-pane visibility
while resizing.
