# Session 2026-07-04 - Step 522 Latest-Intent Thresholds

## Goal

Turn the Step 521 observer-based latest-intent measurement into real regression
gates by tightening single-pane and multi-pane rapid `Next` thresholds.

## Product Standard

- Product target remains about 100ms from latest `Next` intent to expected
  candle visible.
- Observer-based cursor metadata visibility is the gate metric.
- Polling and `requestAnimationFrame` timings remain diagnostics, not the
  primary product latency metric.
- Replay runtime owns cursor/reveal state, chart runtime owns chart metadata and
  series writes, bar-data runtime owns data loading, and UI remains command-only.

## Detailed Plan

1. Step 522.1 - Plan and boundary setup.
   - Record the current loose thresholds:
     - trace smoke: `finalClickToVisibleMs < 1000`.
     - single-pane latest-intent smoke: `automationThresholdMs = 350`.
     - multi-pane rapid gate: elapsed polling threshold `< 1800`.
   - Define non-goals: no replay/chart runtime behavior change unless tightened
     tests expose a true regression.
   - Commit plan docs.

2. Step 522.2 - Tighten single-pane gates.
   - Set trace smoke observer threshold near the product target, with modest
     headless variance allowance.
   - Set single-pane latest-intent smoke automation threshold to the same
     observer-based limit.
   - Keep diagnostic fields for polling and rAF.
   - Run both single-pane latest-intent smokes and commit.

3. Step 522.3 - Tighten multi-pane rapid `Next`.
   - Add a `MutationObserver` helper that resolves when every visible chart
     canvas reaches the expected replay cursor timestamp.
   - Record latest intent latency from final rapid click to all-pane observed
     cursor visibility.
   - Assert the observer latency against the same product-aligned threshold,
     while keeping the existing elapsed polling guard as a broad fallback.
   - Run the multi-pane rapid gate and commit.

4. Step 522.4 - Regression and closeout.
   - Run:
     `node v5/tests/replay-latest-intent-trace-browser-smoke.js`
     `node v5/tests/replay-latest-intent-browser-smoke.js`
     `node v5/tests/multi-pane-rapid-next-performance-browser-smoke.js`
     `node v5/tests/route-teardown-browser-smoke.js`
     `node v5/tests/replay-controls-browser-smoke.js`
     `git diff --check`
   - Update TODO/session handoff with measured timings and final thresholds.
   - Commit closeout docs.

## Non-Goals

- Do not change replay semantics, cursor persistence, or no-future invariants.
- Do not change chart runtime append behavior unless a tightened gate exposes a
  real production regression.
- Do not use rAF timing as the product latency gate.
- Do not remove polling diagnostics; they are still useful for headless/browser
  scheduling context.

## Status

- Step 522.1: completed. Planned latest-intent threshold tightening and
  recorded current loose thresholds.
- Step 522.2: completed. Tightened single-pane latest-intent gates to a 120ms
  observer-based threshold.
- Step 522.3: completed. Added all-pane observer timing to the multi-pane rapid
  `Next` gate and introduced a 300ms observer-based regression guard.
- Step 522.4: completed. Ran regression coverage and closed TODO/session
  handoff.

## Baseline From Step 521

- Trace smoke observer final-click-to-visible: about 23ms.
- Single-pane latest-intent smoke still has `automationThresholdMs = 350`.
- Multi-pane rapid gate still asserts total polling elapsed `< 1800ms` and does
  not separately measure latest-click-to-all-pane-observed-cursor visibility.

Interpretation: the performance is now fast enough, but the tests would not
catch a regression until latency is much worse than the product target. Step 522
should make that protection explicit.

## Single-Pane Thresholds

- `replay-latest-intent-trace-browser-smoke.js` now asserts
  `finalClickToVisibleMs < 120` using the observer-based metric.
- `replay-latest-intent-browser-smoke.js` now sets
  `automationThresholdMs = 120` for observer-based latest-intent latency.
- Verification:
  - `node --check v5/tests/replay-latest-intent-trace-browser-smoke.js` passed.
  - `node --check v5/tests/replay-latest-intent-browser-smoke.js` passed.
  - `node v5/tests/replay-latest-intent-trace-browser-smoke.js` passed with
    observer latency about 14ms.
  - `node v5/tests/replay-latest-intent-browser-smoke.js` passed.

The threshold is intentionally a little above the 100ms product target to allow
headless variance while still catching regressions long before the previous
350ms/1000ms gates.

## Multi-Pane Threshold

- `multi-pane-rapid-next-performance-browser-smoke.js` now observes every
  mounted pane canvas and records final-click-to-all-pane-cursor visibility.
- A first attempt to apply the 120ms single-pane threshold failed with observed
  multi-pane latency around 228ms. That is useful signal, not a test artifact.
- The committed multi-pane gate uses a 300ms observer-based guard so the test
  now protects the measured all-pane latest-intent path while documenting that
  multi-pane still misses the 100ms product target.
- The existing `< 1800ms` polling elapsed guard remains as a broad fallback.
- Verification:
  - `node --check v5/tests/multi-pane-rapid-next-performance-browser-smoke.js`
    passed.
  - `node v5/tests/multi-pane-rapid-next-performance-browser-smoke.js` passed.

Next performance work should target why two-pane all-cursor visibility is still
around 200ms+ while single-pane is about 20ms.

## Final Verification

- `node v5/tests/replay-latest-intent-trace-browser-smoke.js` passed.
- `node v5/tests/replay-latest-intent-browser-smoke.js` passed.
- `node v5/tests/multi-pane-rapid-next-performance-browser-smoke.js` passed.
- `node v5/tests/route-teardown-browser-smoke.js` passed.
- `node v5/tests/replay-controls-browser-smoke.js` passed.
- `git diff --check` passed.
- Final trace sample:
  - single-pane observer final-click-to-visible: about 13ms.
  - single-pane final-click-to-polling-visible: about 15ms.
  - single-pane final-click-to-animation-frame: about 123ms.
  - replay next: about 15ms.
  - chart runtime append: about 10ms.

## Next

Step 523 should investigate multi-pane all-cursor visibility. Step 522 proved
the single-pane 120ms target is comfortably met, but the attempted 120ms
multi-pane threshold measured about 228ms before the gate was set to a 300ms
regression guard.
