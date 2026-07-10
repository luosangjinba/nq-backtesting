# V6 Step 248 - Chart Foundation Next Slice Selection

Date: 2026-07-09

## Decision

Step 249 should implement **Drag/Scroll Display Stability Reaudit/Gate**.

This is a bounded chart-foundation slice. It should review and tighten the
existing browser coverage around native chart drag, wheel/scroll history
extension, drag release, sticky hover-drag prevention, visible-range
compensation after prepends, and replay responsiveness while older history is
pending.

## Why This Slice

Steps 245-247 closed the replay/transport chain, date-range entry alignment,
Manual Previous, leftward history basics, multi-pane bootstrap, reset view, and
display-timeframe switching. The remaining foundation risk most directly tied to
observed user pain is chart drag/scroll display stability:

- fast drag should not snap the chart back to an initial wall;
- hover after mouse release must not keep dragging the chart;
- older-history loading may be delayed, coalesced, and chunked, but current
  K-lines must stay visually stable;
- prepending older bars must compensate visible logical range instead of moving
  the user's screen;
- replay controls must stay responsive while leftward history is pending.

This area was repaired after Step 186, but the coverage is spread across
several smokes and session notes. Step 249 should consolidate the current owner
map and decide whether a missing high-level gate or a small owner fix is needed.

## Owner Boundaries

- Native Lightweight Charts interaction owns immediate drag/scroll chart
  movement.
- Chart surface owns visible-range observation and prepend visible-range
  compensation.
- Manual-wall input bridge may record viewport intent after native drag, but
  must not immediately project that measured range back into the chart.
- Leftward-history input bridge owns delayed/coalesced history-extension
  scheduling, not bar requests.
- Chart-history owns older-window orchestration and in-flight/exhausted
  suppression.
- Bar-data owns bounded request planning, database/cache reads, and chunked
  windows.
- Chart-data owns pane-local prepend/append/replace records.
- Chart viewport owns manual/default viewport intent and must suppress
  prepend-triggered manual projection.
- Replay owns cursor/reveal state and must not be mutated by history extension.

## Step 249 Scope

Implement Drag/Scroll Display Stability Reaudit/Gate:

- document the current coverage matrix for drag release, fast right drag,
  drag-triggered history extension, replay-safe history latency, prepend
  compensation, and manual projection suppression;
- identify any missing browser-visible gate for sticky drag, jump-back, or
  delayed history under quick user input;
- add a focused gate if the missing behavior can be automated reliably;
- if a gate exposes a runtime regression, fix it in the owning module only;
- keep current K-line visual stability ahead of immediate leftward loading.

## Non-Goals

- Do not redesign chart interaction or replace Lightweight Charts behavior.
- Do not change replay cursor semantics, Manual Previous, date-range entry,
  pane layout, or display-timeframe projection unless the new gate exposes a
  specific owner bug.
- Do not add new timeframes.
- Do not add indicators, Pine Script compatibility, SMC/ICT overlays, trading
  simulation, order tickets, prop firm rule engines, or journal workflows.
- Do not move drag/scroll, bar-request, chart-data, or viewport ownership into
  shell UI.

## Suggested Verification For Step 249

- `node v6/tests/drag-scroll-display-stability-reaudit-step249-smoke.js`
- `node v6/tests/chart-drag-release-lifecycle-browser-smoke.js`
- `node v6/tests/fast-right-drag-stability-browser-smoke.js`
- `node v6/tests/drag-triggered-history-extension-browser-step149-smoke.js`
- `node v6/tests/replay-safe-leftward-history-latency-browser-step187-smoke.js`
- `node v6/tests/chart-viewport-prepend-manual-stability-smoke.js`
- `node v6/tests/chart-surface-prepend-visible-range-stability-smoke.js`
- `node v6/tests/product-direction-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

## Acceptance For This Selection

- Step 249 has one drag/scroll stability target.
- The selected slice stays inside chart foundation display stability.
- Verification commands are listed before implementation starts.
- Runtime behavior is unchanged in Step 248.
