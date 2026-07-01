# V5 Harness

Harness documents describe executable checks for important V5 invariants.

Harnesses should be added for rules that are:

- easy for AI to accidentally bypass;
- hard to verify manually;
- high-impact if broken;
- repeatedly at risk during iteration.

Examples:

- UI cannot import chart internals.
- Features cannot import the bars API client.
- Initial FX Replay display cannot include future bars.
- Session setup cannot preload the full date range.

## Current Critical Checks

Run `node v5/scripts/smoke_all.js` before committing V5 behavior changes unless
the step explicitly documents a narrower verification reason.

Use targeted checks while developing:

- Runtime and boundaries:
  - `node v5/tests/runtime-smoke.js`
  - `node v5/tests/boundary-smoke.js`
  - `node v5/tests/runtime-boundary-smoke.js`
  - `node v5/tests/bar-data-boundary-smoke.js`
  - `node v5/tests/chart-boundary-smoke.js`
- Replay session and no-future behavior:
  - `node v5/tests/replay-initial-render-smoke.js`
  - `node v5/tests/replay-no-future-bars-smoke.js`
  - `node v5/tests/replay-session-switch-smoke.js`
  - `node v5/tests/replay-controls-browser-smoke.js`
- Viewport and native chart interaction:
  - `node v5/tests/replay-manual-viewport-follow-smoke.js`
  - `node v5/tests/replay-viewport-follow-browser-smoke.js`
  - `node v5/tests/chart-native-interaction-browser-smoke.js`
  - `node v5/tests/chart-interaction-browser-smoke.js`
- Floating transport and workstation UI:
  - `node v5/tests/replay-floating-controls-browser-smoke.js`
  - `node v5/tests/replay-workstation-layout-browser-smoke.js`
  - `node v5/tests/chart-overlay-visibility-browser-smoke.js`
  - `node v5/tests/chart-responsive-visual-browser-smoke.js`

Always run `git diff --check` before commit.
