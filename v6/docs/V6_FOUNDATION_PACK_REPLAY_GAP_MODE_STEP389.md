# Step 389 - Foundation Pack Replay Gap Fast/Full Mode Implementation

Status

Completed.

## Scope

This step implemented the Step 388 runner-level replay-gap mode control in the
Step 276 foundation regression pack.

No production runtime behavior changed in this step. It does not modify
`v6/src/app.js`, Step 274 pack membership, Step 387 pack membership, command
surfaces, replay cursor movement, no-bar gap skipping, chart viewport intent,
chart-engine behavior, target-history request sizing, shell readout code,
producer runtimes, or the Step 362 runtime skeleton.

## Behavior

Step 276 now chooses its replay-gap member from
`FOUNDATION_REPLAY_GAP_MODE`.

| Mode | Replay-gap member |
| --- | --- |
| unset | `v6/tests/replay-gap-fast-browser-regression-pack-step387-smoke.js` |
| `fast` | `v6/tests/replay-gap-fast-browser-regression-pack-step387-smoke.js` |
| `full` | `v6/tests/replay-gap-browser-regression-pack-step274-smoke.js` |

Invalid modes fail before browser members start:

```text
[timeframe-replay-foundation-pack] invalid FOUNDATION_REPLAY_GAP_MODE="..."; expected "fast" or "full"
```

The runner logs the selected replay-gap mode before member execution:

```text
[timeframe-replay-foundation-pack] replay-gap mode fast: v6/tests/replay-gap-fast-browser-regression-pack-step387-smoke.js
```

## Observed Default Fast Run

Default command:

- `node v6/tests/timeframe-replay-foundation-regression-pack-step276-smoke.js`

Observed result:

```text
[timeframe-replay-foundation-pack] passed 8/8 in 44597ms
```

The replay-gap member was the Step 387 fast pack:

```text
[replay-gap-fast-browser-pack] passed 3/3 in 28243ms
```

## Preserved Full Path

The full replay-gap path remains available through:

- direct Step 274:
  `node v6/tests/replay-gap-browser-regression-pack-step274-smoke.js`;
- Step 276 full mode:
  `FOUNDATION_REPLAY_GAP_MODE=full node v6/tests/timeframe-replay-foundation-regression-pack-step276-smoke.js`.

Step 274 still preserves long-path manual source and HTF manual confirmation.

## Next Recommendation

Step 390 should add a small verification/pack documentation closeout for the
new foundation replay-gap modes:

- document the default fast command and explicit full command;
- add static coverage that handoff/TODO/index expose both commands;
- keep Step 274 and Step 387 directly runnable;
- avoid another runtime behavior change unless a concrete regression appears.

## Verification

- `node v6/tests/timeframe-replay-foundation-regression-pack-step276-smoke.js`
- `node v6/tests/foundation-pack-replay-gap-fast-full-mode-step389-static-smoke.js`
- `node v6/tests/foundation-pack-replay-gap-fast-full-selection-step388-static-smoke.js`
- `node v6/tests/replay-gap-fast-browser-regression-pack-step387-static-smoke.js`
- `node v6/tests/replay-gap-browser-regression-pack-step274-static-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`
