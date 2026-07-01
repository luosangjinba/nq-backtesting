# Step 410 - V5 Single-Pane Chart Shell Semantics

Date: 2026-07-01

Status: completed.

## Goal

Make the current single-pane chart shell explicit and testable before any
layout split-pane implementation begins.

## Plan

1. Add stable route-level single-pane metadata.
2. Mark the chart viewport and chart host as the active `primary` pane.
3. Keep the Layout control disabled and explicitly deferred.
4. Extend browser smoke coverage for active pane semantics and visible
   single-pane controls.
5. Update TODO, interaction contracts, and session handoff before commit.

## Implementation

- Added `data-active-pane-count="1"` and `data-layout-mode="single"` to the
  chart route shell.
- Marked both the chart viewport and chart host as the active `primary` pane.
- Added deferred Layout metadata so the button remains a future affordance, not
  a live multi-pane command.
- Strengthened `replay-workstation-layout-browser-smoke.js` to verify active
  pane identity, deferred Layout state, and visible TF / Go to / Settings
  controls.
- Updated `chart-interaction-contracts.md` with the single-pane active-pane
  rule and multi-pane deferral boundary.

## Acceptance

- Chart route exposes exactly one active pane with stable `primary` identity.
- Display timeframe, Go to, Settings, replay transport, and reset/follow remain
  active-pane controls in the single-pane shell.
- Layout remains disabled/deferred until a dedicated multi-pane ownership step.
- Replay cursor, display bars, bar-data windows, and chart runtime ownership are
  unchanged.

## Checks

- `node v5/tests/replay-workstation-layout-browser-smoke.js`
- `node v5/tests/replay-display-timeframe-browser-smoke.js`
- `node v5/tests/replay-floating-controls-browser-smoke.js`
- `node v5/scripts/smoke_all.js`
- `git diff --check`

## Next

Continue single-pane polish before split panes. Good next candidates are setup
route visual cleanup or tighter chart settings / Go to surface refinement.
