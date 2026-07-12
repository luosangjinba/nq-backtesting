# Step 381 - Chart Foundation Regression Refresh

Status

Accepted.

## Scope

This step refreshes the chart-foundation regression picture after the Step 380
HTF leftward-extension performance closeout.

No runtime behavior changed in this step. It does not modify `v6/src/app.js`,
command surfaces, replay cursor movement, chart viewport intent, chart-engine
behavior, target-history request sizing, shell readout code, producer runtimes,
or the Step 362 runtime skeleton.

## Refreshed Commands

Primary foundation pack:

- `node v6/tests/timeframe-replay-foundation-regression-pack-step276-smoke.js`

HTF reduced-delay guard added by the Step 380 closeout recommendation:

- `node v6/tests/high-timeframe-target-history-reduced-delay-budget-browser-step377-smoke.js`

Static and boundary confirmation:

- `node v6/tests/timeframe-replay-foundation-regression-pack-step276-static-smoke.js`
- `node v6/tests/high-timeframe-leftward-extension-performance-chain-reaudit-step380-static-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

## Coverage

The refreshed foundation coverage includes:

- display timeframe switching and `1m` round-trip behavior:
  `display-timeframe-browser-smoke.js`;
- interval menu parity for the supported minute/hour/day/week/month set:
  `timeframe-menu-parity-browser-smoke.js`;
- display-timeframe leftward history:
  `display-timeframe-leftward-auto-chain-browser-smoke.js`;
- session-aware leftward history:
  `session-aware-leftward-auto-chain-browser-smoke.js`;
- daily, weekly, and monthly projection:
  `daily-projection-browser-step268-smoke.js`,
  `weekly-projection-browser-step269-smoke.js`, and
  `monthly-projection-browser-step270-smoke.js`;
- replay gap coverage through the Step 274 pack:
  `replay-gap-browser-regression-pack-step274-smoke.js`;
- HTF reduced-delay target-history coverage:
  `high-timeframe-target-history-reduced-delay-budget-browser-step377-smoke.js`.

## Observed Result

The Step 276 foundation pack passed `8/8` in `105292ms`.

Observed Step 276 member durations:

| Member | Result | Duration |
| --- | --- | --- |
| `display-timeframe-browser-smoke.js` | pass | `1887ms` |
| `timeframe-menu-parity-browser-smoke.js` | pass | `1717ms` |
| `display-timeframe-leftward-auto-chain-browser-smoke.js` | pass | `2579ms` |
| `session-aware-leftward-auto-chain-browser-smoke.js` | pass | `2669ms` |
| `daily-projection-browser-step268-smoke.js` | pass | `1731ms` |
| `weekly-projection-browser-step269-smoke.js` | pass | `1748ms` |
| `monthly-projection-browser-step270-smoke.js` | pass | `2611ms` |
| `replay-gap-browser-regression-pack-step274-smoke.js` | pass | `90350ms` |

Observed replay-gap pack member durations inside Step 274:

| Member | Result | Duration |
| --- | --- | --- |
| `manual-next-session-gap-browser-step258-smoke.js` | pass | `27270ms` |
| `auto-play-session-gap-browser-step263-smoke.js` | pass | `4843ms` |
| `htf-manual-next-replay-gap-browser-step273-smoke.js` | pass | `50161ms` |
| `htf-auto-play-replay-gap-browser-step273-smoke.js` | pass | `8014ms` |

The Step 377 reduced-delay guard passed under the `300ms` budget:

| TF | Input to target fetch | Target TF | Target bars |
| --- | --- | --- | --- |
| `4h` | `114.3ms` | `4h` | `20` |
| `8h` | `128.8ms` | `8h` | `20` |
| `1D` | `132.3ms` | `1D` | `14` |
| `1W` | `132.5ms` | `1W` | `4` |

## Decision

Chart foundation behavior covered by this refresh is green.

The weakest current signal is not HTF leftward-extension latency. It is the
runtime cost concentration inside the replay-gap browser pack, especially
`htf-manual-next-replay-gap-browser-step273-smoke.js` at `50161ms` and
`manual-next-session-gap-browser-step258-smoke.js` at `27270ms`.

## Step 382 Recommendation

Select **Replay Gap Regression Pack Cost Audit** as the next bounded
chart-foundation slice.

Step 382 should:

- keep replay cursor movement and no-bar gap skipping behavior unchanged;
- inspect the Step 274 replay-gap pack membership and harness setup;
- identify whether the long runtime comes from intentional wait budgets,
  repeated browser setup, replay-session data setup, or avoidable polling;
- propose a bounded cost-control plan or runner split without weakening the
  existing manual-next, auto-play, and HTF gap assertions;
- keep the Step 276 foundation pack usable as the broad confirmation command.

## Preserved Boundaries

- Runtime behavior remains unchanged.
- `v6/src/app.js` remains unchanged.
- Display-Timeframe Runtime remains the TF-switch owner.
- Replay remains source `1m` driven.
- Target bars remain display materialization inputs only.
- The Step 293 target-history diagnostics default pack remains eight tests.
- Optional members `replay-coordination`, `readout-producer-flow`,
  `handoff-registration`, and `reduced-delay-budget` remain available.
- Shell readout code does not call target APIs.
- Producer runtimes remain unchanged.

## Verification

- `node v6/tests/timeframe-replay-foundation-regression-pack-step276-smoke.js`
- `node v6/tests/high-timeframe-target-history-reduced-delay-budget-browser-step377-smoke.js`
- `node v6/tests/timeframe-replay-foundation-regression-pack-step276-static-smoke.js`
- `node v6/tests/high-timeframe-leftward-extension-performance-chain-reaudit-step380-static-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`
