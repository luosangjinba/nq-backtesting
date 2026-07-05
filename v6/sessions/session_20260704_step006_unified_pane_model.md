# V6 Session - Step 6 Unified Pane Model

Date: 2026-07-04 PDT

## Result

V6 Step 6 is complete. The app now has one canonical pane record shape, a
default pane id, active pane id state, a minimal pane runtime, and static audits
against primary/non-primary split state.

## Commits

- `72c2e71 feat(v6): add unified pane model`
- `9259e68 feat(v6): register pane runtime`
- `228aadb test(v6): gate unified pane model`

## Verification

- `node v6/tests/pane-model-smoke.js`
- `node v6/tests/pane-runtime-smoke.js`
- `node v6/tests/runtime-core-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `node v6/tests/app-shell-browser-smoke.js`
- `git diff --check`

## Boundary Notes

- Pane records use one shape for the default pane and future panes:
  `id`, `instrument`, `displayTimeframe`, `chartBarsRevision`,
  `viewportIntentRevision`, and `active`.
- Pane runtime exposes `pane.getSnapshot`, `pane.list`, `pane.getActive`,
  `pane.getById`, and `pane.setActive`.
- Pane runtime emits `pane:activeChanged`.
- Pane modules do not import or own chart, bar-data, replay, or viewport state.
- Static audits continue to forbid primary/non-primary split state names.

## Next

Step 7 should add viewport intent as pure domain logic: default wall intent,
manual wall intent, cursor advance projection, and logical range projection.
