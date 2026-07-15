# Step 390 - Foundation Replay Gap Mode Documentation Closeout

Status

Completed.

## Scope

This step documents the foundation replay-gap fast/full commands after Step 389.

No runner behavior changed in this step. It does not modify `v6/src/app.js`,
Step 274 pack membership, Step 276 runner behavior, Step 387 pack membership,
command surfaces, replay cursor movement, no-bar gap skipping, chart viewport
intent, chart-engine behavior, target-history request sizing, shell readout
code, producer runtimes, or the Step 362 runtime skeleton.

## Default Foundation Command

Use this for routine chart-foundation regression:

```bash
node v6/tests/timeframe-replay-foundation-regression-pack-step276-smoke.js
```

This defaults to `FOUNDATION_REPLAY_GAP_MODE=fast` and runs the Step 387 fast
replay-gap pack as the replay-gap member.

Observed Step 389 default run:

```text
[timeframe-replay-foundation-pack] passed 8/8 in 44597ms
```

## Full Replay-Gap Foundation Command

Use this when broad replay-gap confirmation is needed:

```bash
FOUNDATION_REPLAY_GAP_MODE=full node v6/tests/timeframe-replay-foundation-regression-pack-step276-smoke.js
```

This runs the full Step 274 replay-gap pack as the Step 276 replay-gap member.

## Direct Replay-Gap Commands

Fast replay-gap pack:

```bash
node v6/tests/replay-gap-fast-browser-regression-pack-step387-smoke.js
```

Full replay-gap pack:

```bash
node v6/tests/replay-gap-browser-regression-pack-step274-smoke.js
```

Near-gap manual fixture:

```bash
node v6/tests/replay-gap-near-gap-manual-fixture-browser-step385-smoke.js
```

## Coverage Preservation

The default foundation command now prioritizes routine runtime cost by using
the fast replay-gap pack. The full long-path replay-gap signal remains
available through the explicit full foundation command and the direct Step 274
command.

Step 274 continues to preserve the long-path manual source assertion. Step 387
continues to preserve the fast low-TF/HTF manual and auto-play replay-gap
signals.

## Next Recommendation

Step 391 should refresh the chart-foundation regression documentation after the
mode split:

- compare the latest Step 276 default fast runtime against the older Step 381
  full runtime;
- keep the full replay-gap command documented as the broad confirmation path;
- decide whether another chart-foundation runtime refresh is needed before
  returning to feature work.

## Verification

- `node v6/tests/foundation-replay-gap-mode-closeout-step390-static-smoke.js`
- `node v6/tests/foundation-pack-replay-gap-fast-full-mode-step389-static-smoke.js`
- `node v6/tests/foundation-pack-replay-gap-mode-closeout-step389-static-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`
