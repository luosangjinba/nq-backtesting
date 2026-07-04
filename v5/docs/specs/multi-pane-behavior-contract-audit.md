# Multi-Pane Behavior Contract Audit

Phase: Phase 3 - Real Chart Interaction.

Step: 503A.

Purpose: compare the requested multi-pane behavior with the current
implementation and smoke coverage before the Step 503-507 module split.

This is a behavior audit, not a feature implementation.

## Requested Contract

The current user-facing multi-pane contract is:

- There is exactly one active pane at a time.
- When expanding from single pane, the initial active pane follows the visible
  split direction: right pane for vertical two-pane layout, upper pane for
  horizontal two-pane layout.
- The shared TF dropdown displays the active pane's display timeframe.
- The shared TF dropdown changes only the active pane when `sync.interval` is
  off.
- The shared TF dropdown changes every pane only when `sync.interval` is on.
- Each pane's canvas chrome shows that pane's real state: OHLC, TF label, price
  axis, time axis, reset view, and active-pane border.
- Each pane can drag, wheel zoom, extend left through viewport demand, and reset
  view with the same semantics as single pane.
- Reset view restores both latest-time follow and price visibility.
- Split panes use responsive ratios, not fixed pixel layout state.
- Split resize clamps panes to a minimum wall so a pane cannot disappear.
- Shared toolbar actions that are pane-local target the current active pane.
- Replay cursor actions are shared by default: same-timeframe panes should
  advance together on `Next`, while independent-timeframe panes should project
  their own display window for the new cursor.
- Route UI must not request bars, write chart series, or own replay cursor
  state.

## Current Implementation Check

| Contract item | Current status | Evidence | Risk |
| --- | --- | --- | --- |
| Exactly one active pane | Mostly satisfied | `layout-runtime.js` stores one `activePaneId`; `setActivePane` rejects unknown pane ids. Pane shell applies optimistic active-pane state before the async command resolves. | Logic is split between layout runtime, pane shell, route datasets, and shared controls. Step 503 must keep one reconciliation boundary. |
| Initial active pane follows split direction | Covered | Step 508 updates `layout-runtime.js`; `replay-workstation-layout-browser-smoke.js` and `multi-pane-active-pane-browser-smoke.js` verify `twice.vertical` starts with `secondary` active. | Triple/composite initial focus is still a future UX decision; do not infer extra rules without a contract step. |
| Shared TF shows active pane TF | Covered | `chart-replay-route.js` derives `activePaneDisplayTimeframe`; `replay-workstation-layout-browser-smoke.js` checks primary focus shows `1` and secondary focus shows `5`. | Derivation still lives in route and depends on fallback order. Step 503 should move it into the pane orchestrator. |
| TF independent with `sync.interval` off | Covered for key cases | `layout-runtime.js` updates only target pane unless `state.sync.interval` is true. `multi-pane-active-pane-browser-smoke.js` covers primary `1H` and secondary `5m`. `replay-workstation-layout-browser-smoke.js` covers fresh secondary selection and shared dropdown value. | Route still performs replay display reload fan-out. Keep layout state as source of truth during Step 503. |
| TF synchronized only with `sync.interval` on | Covered | `layout-runtime.js` fans out pane TF when sync interval is true. `replay-workstation-layout-browser-smoke.js` enables interval sync and verifies both panes become `10`. | Sync fan-out is currently route-level replay command looping. Step 503/504 must preserve but isolate it. |
| Per-pane OHLC and TF labels | Covered for TF label and overlay visibility | `chart-replay-status.js` reads pane/canvas `displayTimeframe`; `multi-pane-active-pane-browser-smoke.js` checks primary `1H` and secondary `5m` labels; layout smoke checks triple panes have visible overlays. | Future refactors must not let overlays fall back to active/global TF before pane metadata. |
| Every pane has price/time axis chrome | Covered visually through canvas metadata | `replay-workstation-layout-browser-smoke.js` checks all triple pane canvases expose `priceScaleVisible` and `timeScaleVisible`. | This is not a pixel-perfect axis visibility assertion. If visual regressions continue, add screenshot/pixel assertions later. |
| Pane-local Go to / Jump cursor / reset targeting | Covered | `multi-pane-active-pane-browser-smoke.js` verifies Go to targets secondary, reset on secondary is pane-local, and Jump cursor targets active secondary. | Reset price autoscale is covered at chart-runtime level but not yet by a multi-pane visual price-range assertion. |
| Pane-local viewport demand after TF changes | Covered | `multi-pane-viewport-demand-browser-smoke.js` switches secondary to `5m`, triggers secondary manual range, verifies left extension loads without mouseup and primary is unchanged. `chart-runtime-pane-local-viewport-smoke.js` checks demand carries `paneId`. | Merge logic is in `replay-display-window-controller.js` and reads chart snapshots; Step 507 must isolate this to prevent accidental coupling. |
| Manual range / wheel / drag behavior matches single pane | Partially covered | Browser smokes cover command-driven manual range and viewport demand; single-pane interaction smoke covers drag/wheel/follow behavior. | No explicit multi-pane wheel/drag browser smoke for every layout variant. Keep as a follow-up if regressions reappear. |
| Reset view restores latest time and price visibility | Partially covered | `chart-runtime.js` calls `hostSync.resetPriceScales({ paneId })` in `resumeViewportFollow`; Step 487 added the adapter reset behavior. | User previously observed price not returning to visible range. Current audit did not rerun a visual reset scenario. Add/keep reset view checks when touching chart runtime or adapter. |
| Split resize is ratio-based and has minimum wall | Covered | `layout-runtime.js` owns `split.ratios`; `replay-workstation-layout-browser-smoke.js` drags split handles and checks clamped ratios and pane dimensions. | Pane shell still owns pointer logic and DOM handle positioning. Step 505 should split resize behavior without changing ratio state. |
| Shared controls target active pane | Covered for primary controls | Go to, Jump cursor, reset, and TF have browser coverage. Pane shell ignores control/popover clicks for active-pane selection. | Future shared controls must use the same active-pane boundary, not ad hoc route globals. |
| Replay Next advances same-timeframe panes by default | Covered | Step 508 adds pane-orchestrator follow behavior and `replay-workstation-layout-browser-smoke.js` verifies primary and secondary full bar counts both increase after `Next`. | Different-timeframe pane projection is command-boundary based but still needs more visual coverage when higher-timeframe pane playback UX is expanded. |
| Runtime ownership boundaries | Mostly satisfied | Layout owns pane/sync state; chart runtime owns chart writes; bar-data runtime owns window loading; replay runtime owns display loading and cursor state. | Route currently coordinates too much cross-runtime policy. Step 503/504 are required before more behavior. |

## Known Gaps And Follow-Ups

These are not blockers for starting Step 503, but they are the behaviors most
likely to regress during the split:

- Add a dedicated multi-pane reset-view browser check if reset/price-scale code
  is touched again. It should verify the active/target pane returns to latest
  time and visible price range.
- Add a multi-pane wheel/drag browser check only if interaction regressions
  reappear. Existing command-level and viewport-demand smokes cover the
  state-path, but not every physical input path.
- Keep the active-pane TF no-wait race in `multi-pane-active-pane-browser-smoke`
  as a required gate for Step 503.
- Keep the secondary `5m` viewport-demand smoke as a required gate for Step 507.
- Do not introduce new multi-pane behavior while moving functions in Steps
  503-507.

## Step 503-507 Guardrails

- Step 503 must preserve active-pane TF derivation, fresh-pane initialization,
  interval sync fan-out, and non-primary display loading.
- Step 504 must preserve layout sync behavior without letting layout runtime
  write charts or request bars.
- Step 505 must preserve ratio-based split resize and minimum walls.
- Step 506 must preserve pane-local chart state and primary-only global chart
  sync.
- Step 507 must preserve pane-local viewport demand merge behavior and keep
  route UI out of chart snapshots and bar requests.

## Verification Gates

Required before committing any implementation step in 503-507:

- `node v5/tests/multi-pane-active-pane-browser-smoke.js`
- `node v5/tests/multi-pane-viewport-demand-browser-smoke.js`
- `node v5/tests/replay-workstation-layout-browser-smoke.js`
- `node v5/tests/chart-runtime-pane-local-viewport-smoke.js`
- `git diff --check`

For chart runtime or reset-view changes, also run:

- `node v5/tests/chart-price-scale-browser-smoke.js`
- `node v5/tests/chart-interaction-browser-smoke.js`

## Conclusion

The current logic is broadly aligned with the requested multi-pane behavior for
active pane, independent TF, interval sync, pane-local chrome, pane-local
navigation, viewport demand, and split resize. The main problem is not that the
contract is absent; it is that the contract is implemented across too many
modules. Steps 503-507 should therefore move code behind clearer boundaries
while preserving the behavior verified here.
