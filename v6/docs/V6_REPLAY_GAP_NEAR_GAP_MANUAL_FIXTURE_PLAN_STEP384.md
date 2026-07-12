# Step 384 - Replay Gap Near-Gap Manual Fixture Plan

Status

Accepted.

## Scope

This step designs a near-gap manual browser fixture for replay-gap coverage,
using the Step 383 timing probe results.

No runtime behavior changed in this step. It does not modify `v6/src/app.js`,
Step 274 pack membership, Step 276 pack membership, command surfaces, replay
cursor movement, no-bar gap skipping, chart viewport intent, chart-engine
behavior, target-history request sizing, shell readout code, producer runtimes,
or the Step 362 runtime skeleton.

## Problem

Step 383 proved the current manual replay-gap browser coverage spends most of
its time in repeated pre-gap Manual Next loops.

All six manual cases used `86` Manual Next calls before the final post-gap next.
The Manual Next loop timings were:

- `1m`: `4983.8ms`;
- `5m`: `4887.9ms`;
- `15m`: `4373.6ms`;
- `1D`: `9083.7ms`;
- `1W`: `17361.9ms`;
- `1M`: `14931.7ms`.

The fixture should preserve the same replay-gap semantics while avoiding
repeating the `86`-step pre-gap path in every fast regression case.

## Near-Gap Fixture Design

Create a future focused browser fixture with this shape:

- session start: `2026-06-01T16:50`;
- session end: `2026-06-01T18:10`;
- after session apply, set replay cursor to `2026-06-01T16:58:00.000Z`;
- apply the requested display timeframe;
- run Manual Next until the replay cursor reaches `2026-06-01T18:00:00.000Z`;
- run one final Manual Next and assert the replay cursor reaches
  `2026-06-01T18:01:00.000Z`.

Expected near-gap Manual Next path:

| Phase | Expected result |
| --- | --- |
| Cursor seed | `2026-06-01T16:58:00.000Z` |
| First Manual Next | `2026-06-01T16:59:00.000Z` |
| Gap-crossing Manual Next | `2026-06-01T18:00:00.000Z` |
| Post-gap Manual Next | `2026-06-01T18:01:00.000Z` |

This reduces the pre-gap loop from `86` Manual Next calls to approximately `2`
Manual Next calls before the final post-gap assertion.

## Covered Timeframes

The fixture should cover the same manual replay-gap families:

- low-TF source/projection cases: `1m`, `5m`, `15m`;
- HTF projection cases: `1D`, `1W`, `1M`.

## Assertions To Preserve

For every near-gap case:

- chart-entry apply completes;
- requested display timeframe is applied;
- Manual Next advances to `16:59`;
- the next Manual Next crosses the no-bar gap to `18:00`;
- the final Manual Next continues to `18:01`;
- replay cursor time, cursor index, and revealed count stay aligned;
- chart bars remain non-empty;
- `1m` chart latest bar is `2026-06-01T18:01:00.000Z`;
- non-`1m` projection metadata includes the final source timestamp
  `2026-06-01T18:01:00.000Z`;
- HTF projection metadata keeps the requested target timeframe and cursor cap;
- footer cursor reads `Cursor 18:01` for HTF cases.

## Long-Path Coverage Preservation

Do not delete the existing long-path coverage.

Keep one long-path manual source assertion available as a full confirmation
path. The recommended preserved long-path case is the existing `1m`
`manual-next-session-gap-browser-step258-smoke.js` path from
`2026-06-01T15:34` through the `16:59 -> 18:00` gap and then to `18:01`.

The near-gap fixture may become the fast regression path only after it proves
equivalent no-bar gap assertions for all six display timeframe cases.

## Command Shape

Step 385 should add a focused command rather than immediately replacing pack
membership:

- `node v6/tests/replay-gap-near-gap-manual-fixture-step385-smoke.js`

Initial placement:

- standalone focused browser command;
- not a Step 274 member yet;
- not a Step 276 member yet.

Later pack options, after proof:

- add a fast replay-gap pack member while keeping the full Step 274 pack;
- or split Step 274 into fast and full commands;
- or replace only redundant long-path cases while retaining one long-path
  source confirmation.

## Step 385 Recommendation

Select **Replay Gap Near-Gap Manual Fixture Browser Probe** as the next bounded
chart-foundation slice.

Step 385 should implement the standalone fixture command and prove:

- low-TF `1m`, `5m`, `15m` near-gap manual cases pass;
- HTF `1D`, `1W`, `1M` near-gap manual cases pass;
- pre-gap Manual Next count is near `2`, not `86`;
- existing Step 274 and Step 276 pack membership remains unchanged.

## Preserved Boundaries

- Runtime behavior remains unchanged.
- Replay cursor movement and no-bar gap skipping remain unchanged.
- `v6/src/app.js` remains unchanged.
- Step 274 replay-gap pack membership remains unchanged.
- Step 276 foundation pack membership remains unchanged.
- Display-Timeframe Runtime remains the TF-switch owner.
- Replay remains source `1m` driven.
- Target bars remain display materialization inputs only.
- The Step 293 target-history diagnostics default pack remains eight tests.

## Verification

- `node v6/tests/replay-gap-near-gap-manual-fixture-plan-step384-static-smoke.js`
- `node v6/tests/replay-gap-manual-path-timing-probe-step383-static-smoke.js`
- `node v6/tests/replay-gap-browser-regression-pack-step274-static-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`
