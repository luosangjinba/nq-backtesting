# Step 464 - V5 Multi-Pane DOM Shell

Status: completed.

Date: 2026-07-02

## Goal

Render the chart route's multi-pane DOM shell from layout state while keeping
one real primary chart host.

## Implementation

- Wrapped the existing primary chart viewport in `data-layout-pane-shell` and a
  primary `data-layout-pane`.
- Added `chart-replay-pane-shell.js` to render pane containers from layout
  runtime state.
- Added secondary/tertiary placeholder panes for `twice` and `triple`.
- Wired pane click and keyboard selection to `layout.setActivePane`.
- Added pane shell CSS for Single/Twice/Triple layout distribution in the
  existing chart route area.
- Updated the replay workstation layout browser smoke to assert:
  - two pane containers after selecting Twice;
  - one placeholder pane;
  - one real `data-chart-host`;
  - secondary pane selection updates active-pane metadata.

## Boundaries

- Route UI renders pane containers and dispatches layout commands only.
- Route UI does not create chart series or additional chart hosts.
- Secondary/tertiary panes do not request bars.
- Chart runtime remains the only chart writer.
- Replay runtime remains the owner of cursor/reveal state.

## Verification

- `node --check v5/src/features/chart-replay/chart-replay-pane-shell.js`
- `node --check v5/src/features/chart-replay/chart-replay-template.js`
- `node --check v5/src/features/chart-replay/chart-replay-route.js`
- `node v5/tests/layout-runtime-smoke.js`
- `node v5/tests/boundary-smoke.js`
- `node v5/tests/replay-workstation-layout-browser-smoke.js`
- `git diff --check`

## Next Step Candidate

Step 465 should make chart runtime host mounting pane-id aware. The route should
pass pane host elements through commands, and chart runtime should own
per-pane adapter lifecycle and chart writes.
