# 2026-06-09 - Fib Levels and Economic Event Detail Follow-up

Goal:

- Add missing Fib ratio `3` to the Fib Inspector default positive target levels.
- Confirm whether Economic Event detail notes were previously implemented and
  fix the missing user-facing entry point.

Completed:

- Updated the default Fib positive unchecked levels to:
  - `1.5/2/2.5/3/3.5/4/5/6`
- Removed `4.5` from the default positive unchecked Fib set so the positive
  target section remains eight slots.
- Updated `v4/tests/fib-levels-smoke.js` to assert the new default sequence.
- Confirmed Economic Event detail notes were previously implemented in:
  - `3c60baf feat(v4): add economic event notes`
- Found the real gap: Calendar object actions did not treat
  `economic-event` as an openable object type, so the detail page existed but
  the Economic Events row menu did not show `Open`.
- Added `economic-event` to the Calendar openable object type list so each
  Economic Event row can open its detail page with a single note textarea.

Verification:

- `node --check v4/src/pda/fib-levels.js`
- `node v4/tests/fib-levels-smoke.js`
- `node --check v4/src/ui/inspector/calendar-panel.js`
- `git diff --check`

Current status:

- These follow-up changes are not committed yet.
- Modified tracked files:
  - `v4/src/pda/fib-levels.js`
  - `v4/tests/fib-levels-smoke.js`
  - `v4/src/ui/inspector/calendar-panel.js`
  - `v4/TODO.md`
  - `v4/sessions/session_20260609_fib_economic_event_followup.md`
- Workspace still has unrelated untracked local/runtime files, intentionally
  left alone.
