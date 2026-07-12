# Step 378 - Target-History Pack Reduced-Delay Budget Member

Status

Accepted.

## Scope

- Added the Step 377 reduced-delay browser budget guard as an optional
  target-history diagnostics pack member.
- Kept the default Step 293 pack membership unchanged at eight tests.
- Preserved existing optional members:
  `replay-coordination`, `readout-producer-flow`, and `handoff-registration`.
- Did not modify runtime behavior, `v6/src/app.js`, command surfaces, replay,
  chart viewport intent, chart-engine behavior, request sizing, shell readout
  code, or the Step 362 runtime skeleton.

## Optional Member

Member id:

- `reduced-delay-budget`

Script:

- `v6/tests/high-timeframe-target-history-reduced-delay-budget-browser-step377-smoke.js`

Run command:

- `TARGET_HISTORY_PACK_MEMBERS=reduced-delay-budget node v6/tests/target-history-diagnostics-readout-regression-pack-step293-smoke.js`

Observed pack plan:

- `plan members 1/8 reduced-delay-budget`

Observed target-fetch timings:

| TF | input->target fetch | target fetch |
| --- | ---: | --- |
| `4h` | `124.8ms` | `4h` |
| `8h` | `139.5ms` | `8h` |
| `1D` | `132.8ms` | `1D` |
| `1W` | `129.9ms` | `1W` |

## Step 379 Recommendation

Run and document the combined optional pack member path:

- `TARGET_HISTORY_PACK_MEMBERS=replay-coordination,readout-producer-flow,handoff-registration,reduced-delay-budget node v6/tests/target-history-diagnostics-readout-regression-pack-step293-smoke.js`

Acceptance should confirm:

- all four optional members run in the requested order;
- default Step 293 pack membership remains unchanged;
- the Step 377 budget guard still passes when run after the other optional
  members.

## Verification

- `node v6/tests/target-history-pack-reduced-delay-budget-member-step378-static-smoke.js`
- `node v6/tests/target-history-pack-replay-coordination-member-step339-static-smoke.js`
- `node v6/tests/target-history-pack-readout-producer-flow-member-step353-static-smoke.js`
- `node v6/tests/target-history-pack-handoff-registration-member-step366-static-smoke.js`
- `TARGET_HISTORY_PACK_MEMBERS=reduced-delay-budget node v6/tests/target-history-diagnostics-readout-regression-pack-step293-smoke.js`
- `git diff --check`
