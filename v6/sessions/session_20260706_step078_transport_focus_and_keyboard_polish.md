# V6 Step 78 - Transport Focus And Keyboard Polish

Date: 2026-07-06

## Summary

Step 78 polished replay transport focus and keyboard behavior.

The transport now has visible focus rings for:

- drag handle;
- transport icon buttons;
- replay step period trigger;
- replay step period menu items;
- replay speed slider;
- active-chart-period sync toggle.

The replay step period menu now supports basic keyboard movement:

- `ArrowDown` opens/focuses the first period option or moves forward;
- `ArrowUp` opens/focuses the last period option or moves backward;
- `Home` and `End` move to the first and last period options;
- `Escape` closes the menu and returns focus to the trigger.

When the period menu is open, global transport shortcuts do not fire. Space and
ArrowRight also remain ignored from editable controls.

## Boundary

This step stayed inside shell transport UI and command dispatch boundaries. It
does not move replay cursor ownership, chart data ownership, bars, or viewport
intent logic.

## Commits

- `6e3f37ef docs(v6): scope step seventy eight transport focus`
- `5e4a3b81 feat(v6): polish transport focus keyboard`
- `72f2bf24 test(v6): verify transport focus keyboard`

## Verification

- `node v6/tests/replay-transport-controller-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `node v6/tests/fxreplay-ui-guardrails-smoke.js`
- `node v6/tests/replay-transport-focus-keyboard-browser-smoke.js`
- `node v6/tests/replay-transport-visual-state-browser-smoke.js`
- `node v6/tests/chart-entry-restart-browser-smoke.js`
- `node v6/tests/replay-transport-browser-smoke.js`
- `node v6/tests/chart-entry-playback-period-boundary-browser-smoke.js`
- `node v6/tests/chart-entry-auto-play-browser-smoke.js`
- `node v6/tests/app-shell-browser-smoke.js`
- `node v6/tests/session-dashboard-browser-smoke.js`
- `node v6/tests/product-baseline-screenshot-smoke.js`
- `git diff --check`

## Next

Step 79 should persist the floating transport drag position as shell-local UI
state. It should remain independent from replay cursor, chart data, bars, and
viewport intent.
