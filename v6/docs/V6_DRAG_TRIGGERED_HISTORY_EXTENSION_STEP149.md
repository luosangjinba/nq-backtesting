# V6 Drag-Triggered History Extension Hardening - Step 149

Date: 2026-07-08

## Outcome

Step 149 hardens the Step 148 leftward historical extension flow for real
chart interaction.

The implemented gates prove:

- duplicate in-flight older-window requests are suppressed;
- exhausted older-window requests are remembered and ignored on repeat;
- real browser wheel input on the chart host can trigger the leftward history
  bridge;
- the triggered request still uses the canvas-left capped older-window path;
- browser-visible extension latency is measured from the effective wheel event;
- replay state remains unchanged while older bars are loaded.

## Ownership

- `chart-history` owns history-extension coordination and duplicate/exhausted
  request suppression.
- The chart input bridge only forwards user visible-range demand.
- Bar-data remains the only requester/cache owner.
- Chart-data owns older-bar prepend/merge.
- Chart-viewport owns projection after chart-data changes.
- Chart-engine remains the only chart series writer.
- Replay cursor ownership is unchanged.

## What Did Not Change

- no chart series writes were added outside chart-engine;
- no bar requests were added outside bar-data;
- no replay cursor mutation was added;
- no multi-pane UI controls were added;
- no simulated trading, comparison symbols, overlays, plugins, indicators,
  Order, or Calendar behavior was enabled.

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
