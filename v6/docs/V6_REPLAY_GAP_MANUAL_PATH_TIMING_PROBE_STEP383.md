# Step 383 - Replay Gap Manual Path Timing Probe

Status

Accepted.

## Scope

This step adds and runs a harness-only timing probe for the manual replay-gap
browser paths identified by Step 382.

No runtime behavior changed in this step. It does not modify `v6/src/app.js`,
Step 274 pack membership, Step 276 pack membership, command surfaces, replay
cursor movement, no-bar gap skipping, chart viewport intent, chart-engine
behavior, target-history request sizing, shell readout code, producer runtimes,
or the Step 362 runtime skeleton.

## Probe Command

- `node v6/tests/replay-gap-manual-path-timing-probe-browser-step383-smoke.js`

The probe keeps the existing replay-gap assertions and adds harness-local
timing around:

- page setup;
- session creation and chart-entry apply;
- display timeframe apply;
- Manual Next loop;
- final post-gap Manual Next;
- assertion/readout;
- cleanup.

It covers the same manual gap target families:

- low-TF manual cases: `1m`, `5m`, `15m`;
- HTF manual cases: `1D`, `1W`, `1M`.

## Observed Timing

The probe passed with these per-case measurements:

| Case | Manual Next count | Page setup | Session/apply | TF apply | Manual loop | Final next | Readout | Cleanup |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| `1m` | `86` | `1554.9ms` | `205.2ms` | `0ms` | `4983.8ms` | `4.8ms` | `17.5ms` | `125.4ms` |
| `5m` | `86` | `1491.1ms` | `242.9ms` | `35.8ms` | `4887.9ms` | `4.5ms` | `13.2ms` | `146.8ms` |
| `15m` | `86` | `1420.2ms` | `222.1ms` | `50.1ms` | `4373.6ms` | `2.2ms` | `22.4ms` | `116.3ms` |
| `1D` | `86` | `1432.5ms` | `232.7ms` | `35.9ms` | `9083.7ms` | `56.8ms` | `6.2ms` | `139.5ms` |
| `1W` | `86` | `1422.8ms` | `203.2ms` | `35.3ms` | `17361.9ms` | `108.4ms` | `8.2ms` | `171.2ms` |
| `1M` | `86` | `2364.9ms` | `231.0ms` | `35.3ms` | `14931.7ms` | `148.2ms` | `7.9ms` | `144.3ms` |

## Interpretation

The dominant cost is the Manual Next loop, not page setup, session/apply,
timeframe apply, readout, or cleanup.

The probe records the same `86` Manual Next calls for all six cases. The
per-step cost differs sharply by display timeframe:

- low-TF manual-loop cost is roughly `4.4-5.0s` per case;
- `1D` manual-loop cost is roughly `9.1s`;
- `1W` manual-loop cost is roughly `17.4s`;
- `1M` manual-loop cost is roughly `14.9s`.

This means the current Step 274 cost concentration is mostly produced by
repeating a long manual replay advancement path, with HTF projection work making
the weekly and monthly cases especially expensive.

Page setup is visible but secondary:

- most cases are roughly `1.4-1.6s`;
- `1M` page setup measured `2364.9ms`;
- cleanup remains below `200ms` per case.

## Decision

Do not split or weaken Step 274 yet. The next bounded slice should first add a
near-gap manual replay fixture, then prove it preserves the specific no-bar gap
assertions while avoiding the repeated `86` Manual Next pre-gap loop in every
case.

The existing long-path coverage should remain available as a full confirmation
path until the near-gap fixture has equivalent evidence.

## Step 384 Recommendation

Select **Replay Gap Near-Gap Manual Fixture Plan** as the next bounded
chart-foundation slice.

Step 384 should:

- design a near-gap manual browser fixture starting close to
  `2026-06-01T16:58:00.000Z`;
- keep at least one long-path manual source assertion available for confidence;
- preserve the low-TF `1m`/`5m`/`15m` and HTF `1D`/`1W`/`1M` gap assertions;
- keep Step 274 and Step 276 membership unchanged until the near-gap fixture is
  proven;
- avoid runtime/replay behavior changes.

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

- `node v6/tests/replay-gap-manual-path-timing-probe-browser-step383-smoke.js`
- `node v6/tests/replay-gap-manual-path-timing-probe-step383-static-smoke.js`
- `node v6/tests/replay-gap-regression-pack-cost-audit-step382-static-smoke.js`
- `node v6/tests/replay-gap-browser-regression-pack-step274-static-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`
