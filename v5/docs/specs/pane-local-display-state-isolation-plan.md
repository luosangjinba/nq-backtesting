# Pane-Local Display State Isolation Plan

Phase: Phase 3 - Real Chart Interaction / Multi-pane replay stabilization.

Step: 531 planned.

## Trigger

Manual testing after Step 530 showed the active-pane `1H` blank-pane bug is
improved but not structurally solved:

1. switching the left active pane to `1H` now renders more candles, but the
   first load still may not fill to the left canvas boundary until the user
   drags left;
2. after the left pane is active and `1H`, mouse-wheel zooming the left pane can
   make the right pane switch from `1m` to `1H`;
3. three-pane layouts have more variations of the same state leakage, making
   individual patching too fragile.

Step 531 therefore targets the underlying pane-local display-state boundary,
not another isolated visual symptom.

## Reference Check

- Lightweight Charts `ITimeScaleApi` checked on 2026-07-04. The relevant
  range, logical-range, and scroll APIs remain adapter-owned V5 chart-runtime
  concerns.
- `awesome-tradingview` checked on 2026-07-04. No plugin is needed for pane
  state isolation.

## Working Hypothesis

V5 still has multiple sources of display-timeframe truth:

- layout pane records store pane-local `displayTimeframe`;
- replay runtime stores a primary/global display timeframe;
- chart runtime stores pane display context;
- chart route keeps a global `displayTimeframe` fallback for shared controls;
- layout `sync.interval` can fan out TF changes to all panes.

When active-pane controls, wheel/drag events, and status refreshes all consult
different fallbacks, the active pane's TF can leak into non-active panes. The
right fix is to make layout pane state the source of truth for pane-local TF,
and to make any all-pane TF change require an explicit interval-sync command
path.

## Target Behavior

- With `sync.interval` off, changing, dragging, wheel-zooming, or resetting one
  pane must not mutate another pane's `displayTimeframe`.
- The shared TF select displays the active pane's TF only; it must not become a
  global fallback that rewrites other panes.
- Replay runtime may own the primary replay display context, but non-primary
  panes must retain their own chart display context and layout TF.
- Viewport-demand loads must use the target pane id and target pane TF.
- Three-pane layouts must obey the same pane-local TF invariants as two-pane
  layouts.
- Interval-sync fan-out remains supported only when explicitly enabled.

## Step 531 Detailed Plan

1. Step 531.1 - Plan and documentation.
   - Add this plan and session handoff.
   - Update TODO, spec index, docs index, and session index.
   - Commit planning docs.

2. Step 531.2 - Add reproducing two-pane isolation smoke.
   - Build a two-pane vertical replay session.
   - Make the left/primary pane active, switch it to `1H`, then wheel zoom the
     left pane.
   - Assert the right/secondary pane remains `1m` in layout state and chart
     canvas metadata.
   - Commit the failing/current-behavior harness first if needed.

3. Step 531.3 - Stop implicit interval fan-out on non-sync paths.
   - Audit `layout.setPaneDisplayTimeframe` callers.
   - Ensure all-pane TF mutation is only possible through explicit interval
     sync intent, not through stale `sync.interval` or shared-control fallback.
   - Completed: layout runtime now requires explicit `applyIntervalSync` for
     all-pane TF fan-out; the shared active-pane TF control supplies that
     intent when interval sync is currently enabled.
   - Commit the layout/control fix.

4. Step 531.4 - Make active-pane TF fallback pane-local.
   - Reduce route/global `displayTimeframe` fallback usage so shared controls
     read active layout pane TF and pane display loaders read target pane TF.
   - Keep replay runtime primary display context separate from non-primary
     pane display context.
   - Completed: primary may fall back to replay display context, while
     non-primary panes default to session timeframe unless their pane record
     explicitly stores a TF.
   - Commit boundary tightening.

5. Step 531.5 - Add three-pane isolation regression.
   - Cover a triple layout where one pane is switched to `1H`, another remains
     `1m`, and a third remains independently initialized.
   - Trigger wheel/viewport interaction on the active `1H` pane and assert the
     other panes' TF metadata is unchanged.
   - Commit the regression harness and any minimal fix needed.

6. Step 531.6 - Regression and closeout.
   - Run:
     `node v5/tests/multi-pane-timeframe-follow-browser-smoke.js`
     `node v5/tests/multi-pane-active-pane-browser-smoke.js`
     `node v5/tests/multi-pane-viewport-demand-browser-smoke.js`
     `node v5/tests/replay-workstation-layout-browser-smoke.js`
     `node v5/tests/replay-pane-fanout-ordering-browser-smoke.js`
     `node v5/tests/replay-right-edge-follow-browser-smoke.js`
     `git diff --check`
   - Update TODO/spec/session with the final result.
   - Commit closeout docs.

## Non-Goals

- Do not remove interval sync as a feature.
- Do not rewrite all multi-pane modules in one step.
- Do not change replay `Next` fan-out from Step 529.
- Do not let route UI request bars or write chart series.
- Do not show unfinished higher-timeframe candles.
