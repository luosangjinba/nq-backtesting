# V6 Step 287 - Activated Target-History Browser Integration

Date: 2026-07-10

## Decision

Step 287 adds browser/runtime integration coverage for the activated
target-history path. The new browser smoke uses the real V6 page, runtime
registry, chart surface, display-timeframe runtime, chart-history input bridge,
and leftward-history runtime.

The test mocks browser `fetch` for `/v4/bars` and `/v4/target_bars` so it
validates frontend ownership and command flow without depending on external API
server state.

## Covered Path

- Create a session through the dashboard.
- Switch the main pane to `8h` through `DISPLAY_TIMEFRAME_COMMANDS.APPLY`.
- Let the real chart-history input bridge auto-chain from the chart surface
  after display timeframe application.
- Verify the bridge-activated request reaches target history and loads
  `/v4/target_bars`.
- Verify the loaded history extension reports `projectionSource.owner:
  runtime.bar-data` and target timeframe `8h`.
- Verify target bars do not pollute source bars by switching back to `1m` and
  checking the source bar count.

## Preserved Behavior

- Low timeframe browser auto-chain remains source-window projection through the
  existing `display-timeframe-leftward-auto-chain-browser-smoke.js`.
- Target-history display bars may have target bucket timestamps that are earlier
  than the source latest timestamp, but must not advance beyond source data.
- Replay remains source `1m` driven.

## Verification

- `node v6/tests/activated-target-history-browser-step287-smoke.js`
- `node v6/tests/display-timeframe-leftward-auto-chain-browser-smoke.js`
- `node v6/tests/leftward-history-input-target-activation-step286-smoke.js`
- `node v6/tests/leftward-history-target-opt-in-step285-smoke.js`
- `node v6/tests/leftward-history-target-fallback-step285-smoke.js`
- `node v6/tests/leftward-history-target-default-step285-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

## Next

Step 288 should focus on performance/observability for activated target history:
measure high-TF leftward extension latency and compare target-bar activation
against source-window fallback so slow or blocking paths are visible before
expanding the policy further.
