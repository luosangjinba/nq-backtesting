# Step 387 - Replay Gap Fast Browser Pack Implementation

Status

Completed.

## Scope

This step implemented the standalone fast replay-gap browser pack selected in
Step 386.

No runtime behavior changed in this step. It does not modify `v6/src/app.js`,
Step 274 pack membership, Step 276 pack membership, command surfaces, replay
cursor movement, no-bar gap skipping, chart viewport intent, chart-engine
behavior, target-history request sizing, shell readout code, producer runtimes,
or the Step 362 runtime skeleton.

## Command

- `node v6/tests/replay-gap-fast-browser-regression-pack-step387-smoke.js`

The runner uses the same serial child-process and fail-fast shape as Step 274,
with a separate log prefix:

- `[replay-gap-fast-browser-pack] start ...`
- `[replay-gap-fast-browser-pack] pass ...`
- `[replay-gap-fast-browser-pack] failed`
- `[replay-gap-fast-browser-pack] passed ...`

## Members

The fast pack runs three members:

- `v6/tests/replay-gap-near-gap-manual-fixture-step385-smoke.js`;
- `v6/tests/auto-play-session-gap-browser-step263-smoke.js`;
- `v6/tests/htf-auto-play-replay-gap-browser-step273-smoke.js`.

This covers:

- manual low-TF replay-gap path through the Step 385 near-gap fixture;
- manual HTF replay-gap path through the Step 385 near-gap fixture;
- existing low-TF auto-play replay-gap path;
- existing HTF auto-play replay-gap path.

## Observed Run

The fast pack passed:

```text
[replay-gap-fast-browser-pack] passed 3/3 in 24532ms
```

Observed member timings:

| Member | Duration |
| --- | ---: |
| Step 385 near-gap manual fixture | `12618ms` |
| Step 263 low-TF auto-play gap | `4751ms` |
| Step 273 HTF auto-play gap | `7163ms` |

The Step 385 member again proved all six manual cases with:

```text
16:58 -> 16:59 -> 18:00 -> 18:01
```

and `2` pre-gap Manual Next calls.

## Preserved Full Coverage

The full Step 274 command remains unchanged and directly runnable:

- `node v6/tests/replay-gap-browser-regression-pack-step274-smoke.js`

It still preserves the long-path manual source assertion through
`manual-next-session-gap-browser-step258-smoke.js` and the long-path HTF manual
confirmation through `htf-manual-next-replay-gap-browser-step273-smoke.js`.

Step 276 remains unchanged and still uses the full Step 274 command as its
replay-gap member.

## Next Recommendation

Step 388 should decide how to use the fast pack in the broader foundation
regression strategy:

- keep Step 276 on the full Step 274 command;
- switch Step 276 to the fast pack while keeping Step 274 directly runnable;
- or add explicit fast/full controls to the foundation pack.

This should be a selection step before changing Step 276 membership.

## Verification

- `node v6/tests/replay-gap-fast-browser-regression-pack-step387-smoke.js`
- `node v6/tests/replay-gap-fast-browser-regression-pack-step387-static-smoke.js`
- `node v6/tests/replay-gap-fast-pack-integration-selection-step386-static-smoke.js`
- `node v6/tests/replay-gap-browser-regression-pack-step274-static-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`
