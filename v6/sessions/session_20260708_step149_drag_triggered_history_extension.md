# V6 Session - Step 149 Drag-Triggered History Extension Hardening

Date: 2026-07-08

## Outcome

Step 149 hardened leftward history extension for real chart interaction and
duplicate request behavior.

Completed in commits:

- `fcfb65bb feat(v6): suppress duplicate history extension requests`
- `1edd0358 test(v6): cover drag-triggered history extension`

## Implementation

- Added in-flight older-window suppression keyed by pane and planned window.
- Added exhausted older-window suppression after empty or exhausted responses.
- Added runtime smoke for concurrent duplicate requests and exhausted repeats.
- Added browser smoke that uses real CDP wheel input on the chart host to
  trigger history extension and measure effective visible latency.

## Boundaries

- Bar-data remains the only K-line requester/cache owner.
- Chart-data owns prepend/merge.
- Chart-viewport owns projection after chart-data changes.
- Chart-engine remains the only chart series writer.
- Replay cursor ownership was not changed.
- No simulated trading, comparison symbols, overlays, plugins, indicators,
  Order, Calendar, or multi-pane UI controls were added.

## Verification

- `node v6/tests/leftward-history-hardening-step149-smoke.js`
- `node v6/tests/drag-triggered-history-extension-browser-step149-smoke.js`
- `node v6/tests/leftward-history-extension-step148-smoke.js`
- `node v6/tests/leftward-history-extension-browser-step148-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

## Next Step

Step 150 should verify replay `Next` and auto-play visible speed while
leftward history extension is active or recently loaded.
