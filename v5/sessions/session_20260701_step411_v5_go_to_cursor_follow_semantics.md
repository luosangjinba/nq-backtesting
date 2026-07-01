# Step 411 - V5 Go-To Cursor Follow Semantics

Date: 2026-07-01

Status: completed.

## Goal

Remove the ambiguous top-level `Cursor` action and keep the same behavior inside
the Go to surface with explicit wording.

## Plan

1. Remove the top-level chart toolbar `Cursor` button.
2. Keep the Go to popover action and rename it to `Jump to replay cursor`.
3. Preserve the command-driven implementation through chart runtime
   `RESUME_VIEWPORT_FOLLOW`.
4. Update browser smoke coverage so the action is exercised from Go to and the
   top-level ambiguous button remains absent.
5. Update TODO, interaction contracts, and session handoff before commit.

## Implementation

- Removed the top-level `[data-chart-jump-cursor]` button from the workstation
  toolbar.
- Renamed the Go to popover button to `Jump to replay cursor`.
- Kept `jumpToCursor()` as a chart follow action that dispatches
  `CHART_COMMANDS.RESUME_VIEWPORT_FOLLOW`.
- Made the legacy top-level jump-cursor binding null-safe so the route does not
  depend on the removed button.
- Updated `chart-go-to-time-browser-smoke.js` to reopen Go to, click
  `Jump to replay cursor`, verify follow mode, and assert no top-level Cursor
  button exists.

## Acceptance

- The top toolbar no longer shows a `Cursor` button.
- Go to exposes `Jump to replay cursor`.
- The action resumes chart viewport follow.
- The action does not advance replay cursor, reset replay, change revealed
  count, or directly request bars.

## Checks

- `node v5/tests/chart-go-to-time-browser-smoke.js`
- `node v5/tests/replay-workstation-layout-browser-smoke.js`
- `node v5/scripts/smoke_all.js`
- `git diff --check`

## Next

Continue single-pane polish before layout split panes. Setup route visual
cleanup and chart settings surface refinement remain good next candidates.
