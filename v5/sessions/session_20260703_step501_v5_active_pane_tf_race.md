# Step 501 - Active Pane TF Race

Date: 2026-07-03

## Trigger

User reported a two-pane interaction bug:

- If the initial active pane's TF is changed first, then switching to the other
  pane allows both panes to change TF independently.
- If the initial active pane TF is not changed first, then switching directly
  to the other pane can make the shared TF dropdown fail to independently target
  that pane.

## Diagnosis

The stable active-pane path already worked after `layout.setActivePane` had
resolved. The missing case was the fast UI race: a user can click a pane and
immediately change the shared TF dropdown before the async active-pane command
has reconciled route state.

Because the TF dropdown targets the active pane, stale route active-pane state
can make the dropdown action target the previous pane or appear unresponsive.

## Plan

1. Reproduce the no-wait sequence in browser coverage.
2. Make pane selection update route controls immediately without bypassing
   layout runtime ownership.
3. Reconcile optimistic UI state with the official layout runtime result.
4. Update docs and session handoff.
5. Run multi-pane and viewport-demand regression smokes.

## Changes

- `chart-replay-pane-shell.js` now stores the latest rendered layout state and
  applies an optimistic active-pane snapshot before awaiting
  `layout.setActivePane`.
- The official layout runtime result still reconciles the state after the
  command resolves.
- `multi-pane-active-pane-browser-smoke.js` now covers the no-wait race: create
  two panes, do not change primary TF, click secondary, immediately change the
  shared TF dropdown, then verify primary remains `1m` and secondary becomes
  `5m`.

## Verification

- `node v5/tests/multi-pane-active-pane-browser-smoke.js`
- `node v5/tests/multi-pane-viewport-demand-browser-smoke.js`
- `node v5/tests/replay-workstation-layout-browser-smoke.js`
- `node v5/tests/chart-runtime-pane-local-viewport-smoke.js`

## Next

Recommended Step 502: split-pane resize and active-pane UX polish, including
resize-handle hit area, minimum pane wall behavior, and active-pane visibility
while resizing.
