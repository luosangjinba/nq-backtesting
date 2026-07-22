# Session — R6.9d GoTo Redesign Contract

Date: 2026-07-22
Status: completed headlessly with automated evidence

## Trigger

The stage review's P2 GoTo suggestion did not match the intended product. The
user clarified that V7 needs eight fixed forward shortcuts plus a separate
range-aware Exact GoTo, while retaining one shared Replay clock across every
Pane and leaving Economic Calendar for the later business phase.

## Decision

- design Quick and Exact GoTo together but deliver their presentations in
  separate bounded slices;
- retain the existing shared Replay Navigation/Workspace Transaction path;
- add SB London, SB New York AM, and SB New York PM to the original five quick
  actions;
- retain New York `18:00`, `19:00`, `02:00`, `09:30`, `03:00`, `10:00`, and
  `14:00` defaults with DST-aware conversion;
- derive Next Session from only Asian, London, and New York;
- define every quick action as strictly forward;
- retain Exact GoTo as an exclusive cutoff bounded by Replay Session start/end;
- keep the generic Calendar Surface reusable without coupling it to Economic
  Calendar events;
- classify quick range exhaustion as an expected non-mutating navigation
  rejection rather than a generic Workspace error.

## Delivered

- the Replay Pane action/response contract accepts all eight anchor ids;
- the pure navigation schedule accepts exactly seven configurable wall times
  and generates Silver Bullet candidates;
- source lookup exhaustion emits `goto-target-unavailable-in-range`;
- Replay Navigation translates that failed target preparation into a
  terminal-free `rejected` result while preserving cursor, playback pause, and
  every visible Pane;
- the exact target range validation remains at the shared response-plan
  boundary and therefore cannot diverge between future presentation entries.

## Evidence

- Replay Pane Response Contract Harness passes with all eight anchors and 19
  negative controls;
- Replay Navigation Runtime Harness passes with defaults/custom values,
  New York DST, strict-forward equality, primary-only Next Session, Silver
  Bullet candidates, range exhaustion, and 21 negative/race controls;
- all 39 non-browser and six serial real-Chrome Harnesses pass;
- architecture, source-quality, JSON parsing, and `git diff --check` pass.

## Next Boundary

Implement the eight-item quick menu, simplified seven-time Custom Settings,
and non-blocking range-end message without moving Exact GoTo yet. The following
slice gives Exact GoTo its separate Workspace-level entry and range-aware
Calendar Surface presentation.
