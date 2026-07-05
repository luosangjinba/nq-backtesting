# V6 Session - Step 7 Viewport Intent Domain

Date: 2026-07-04 PDT

## Result

V6 Step 7 is complete. The app now has pure viewport intent domain logic for
default replay walls, manual replay walls, cursor-only intent updates, measured
manual wall promotion, and logical range projection.

## Commits

- `993697d feat(v6): add viewport intent domain`
- `db46ab5 feat(v6): add viewport projection domain`
- `1c2e05b test(v6): gate viewport intent invariants`

## Verification

- `node v6/tests/viewport-intent-domain-smoke.js`
- `node v6/tests/viewport-projection-smoke.js`
- `node v6/tests/viewport-intent-invariant-smoke.js`
- `node v6/tests/runtime-core-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `node v6/tests/app-shell-browser-smoke.js`
- `git diff --check`

## Boundary Notes

- Default and manual walls share one projection algorithm.
- Replay cursor movement updates `cursorTimestamp` only; it does not change
  wall origin, latest offset, span, or revision.
- Manual walls are derived from measured logical range values:
  `latestOffsetBars` and `spanBars`.
- Viewport domain modules do not import DOM, chart engine, replay runtime,
  bar-data runtime, pane runtime, session runtime, or app runtime modules.

## Next

Step 8 should add chart data runtime state for pane-local chart bars,
append/replace operations, no-future filtering, and chart bars revision
metadata. It must not mutate viewport intent.
