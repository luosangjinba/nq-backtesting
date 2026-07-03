# Step 484 - V5 Next Reveal Before Persist

## Goal

Remove the remaining single-click delay between pressing Next and seeing the
next K-line.

## Result

- Replay `next` now updates in-memory cursor/display state and writes chart
  bars before waiting for `session.updateCursor`.
- `persistedCursor` is patched into replay state after persistence resolves.
- This keeps chart reveal responsive even if storage/session persistence is
  slow.
- Regression coverage intentionally delays cursor persistence and verifies the
  chart has already rendered the next bar while persistence is still pending.

## Boundaries

- Future bars still remain hidden from chart/display state until replay cursor
  advances.
- Session runtime still owns cursor persistence.
- Chart runtime remains the only chart writer.
- UI still dispatches replay commands only.

## Verification

- `node --check v5/src/runtime/replay-navigation-controller.js`
- `node --check v5/tests/replay-next-chart-before-persist-smoke.js`
- `node v5/tests/replay-next-chart-before-persist-smoke.js`
- `node v5/tests/replay-next-smoke.js`
- `node v5/tests/replay-play-smoke.js`
- `node v5/tests/replay-cursor-persistence-smoke.js`
- `node v5/tests/replay-session-end-smoke.js`
- `node v5/tests/replay-display-progression-smoke.js`
- `node v5/tests/replay-controls-browser-smoke.js`
- `node v5/tests/replay-fast-next-browser-smoke.js`

## Next

Step 485 should measure multi-pane playback and resize write counts in browser
before adding more split-pane behavior.
