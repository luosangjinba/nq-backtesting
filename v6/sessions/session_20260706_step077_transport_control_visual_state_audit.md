# V6 Step 77 - Transport Control Visual State Audit

Date: 2026-07-06

## Summary

Step 77 audited the replay transport control states before adding more workflow
features.

The transport now exposes explicit DOM state for:

- play active/disabled;
- next disabled;
- restart active/disabled;
- speed slider value text;
- replay step period label/selected option;
- active-chart-period sync toggle.

Disabled delegated actions are ignored explicitly in the shell transport event
layer. This makes click behavior match disabled button state even in tests or
non-native event paths.

## Browser Matrix

Added `v6/tests/replay-transport-visual-state-browser-smoke.js`.

It covers:

- ready state;
- manual period selection;
- sync toggle following the active chart period;
- playing state;
- ended state;
- disabled click and keyboard behavior at ended state;
- restarted ready state.

The test confirms that sync follows the active chart period. In the current
single-pane chart, enabling sync moves the replay step period back to `1m`.

## Commits

- `e299cfff docs(v6): scope step seventy seven transport audit`
- `270259e2 feat(v6): harden transport control states`
- `6e6cb3c2 test(v6): audit transport visual states`

## Verification

- `node v6/tests/replay-transport-controller-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `node v6/tests/fxreplay-ui-guardrails-smoke.js`
- `node v6/tests/replay-transport-visual-state-browser-smoke.js`
- `node v6/tests/chart-entry-restart-browser-smoke.js`
- `node v6/tests/chart-entry-playback-period-boundary-browser-smoke.js`
- `node v6/tests/replay-transport-browser-smoke.js`
- `node v6/tests/chart-entry-auto-play-browser-smoke.js`
- `node v6/tests/app-shell-browser-smoke.js`
- `node v6/tests/session-dashboard-browser-smoke.js`
- `node v6/tests/product-baseline-screenshot-smoke.js`
- `git diff --check`

## Next

Step 78 should polish transport focus and keyboard affordances. The visual
state matrix is now stable, so focus rings and shortcut behavior can be checked
without changing replay, chart data, bars, or viewport ownership.
