# V6 Step 66 - Chart Entry Initial Visibility Browser Gate

Date: 2026-07-05

## Summary

Step 66 added a browser-level gate for the session-entry chart path.

The new `chart-entry-initial-visibility-browser-smoke.js` creates a session
through the session dashboard, waits for `chartEntryProjectionApply` to become
`applied`, and verifies:

- chart-data runtime has main pane bars;
- chart viewport has projection state;
- workstation chart surface has received the applied data;
- the latest initial candle is inside the projected visible logical range;
- the browser canvas exists and contains candle-colored pixels.

The smoke exposed a real mismatch: the workstation chart host still used
`data-v6-pane-id="default"` while the chart-entry path planned and applied pane
`main`. Step 66 fixed the host to `main` and updated the chart presentation
audit accordingly.

## Commits

- `e0259d49 docs(v6): scope step sixty six visibility gate`
- `9e46453f fix(v6): align workstation chart pane id`
- `af66f7f3 test(v6): add chart entry visibility smoke`
- `2033c03d docs(v6): align chart presentation pane id`

## Verification

- `node v6/tests/chart-entry-initial-visibility-browser-smoke.js`
- `node v6/tests/chart-entry-projection-apply-runtime-smoke.js`
- `node v6/tests/app-shell-browser-smoke.js`
- `node v6/tests/session-dashboard-browser-smoke.js`
- `node v6/tests/product-baseline-screenshot-smoke.js`
- `node v6/tests/chart-presentation-audit-smoke.js`
- `node v6/tests/replay-chart-readiness-audit-smoke.js`
- `node v6/tests/fxreplay-ui-guardrails-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

## Next

Step 67 should start validating replay stepping on the new chart-entry path:
manual next should advance replay and visible chart data through the new owner
chain without calling the old coupled `defaultWall.load` path.
