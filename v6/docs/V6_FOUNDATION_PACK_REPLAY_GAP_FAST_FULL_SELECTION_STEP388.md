# Step 388 - Foundation Pack Replay Gap Fast/Full Selection

Status

Accepted.

## Scope

This step selects how the Step 387 fast replay-gap browser pack should
participate in the broader Step 276 foundation regression pack.

No runner behavior changed in this step. It does not modify `v6/src/app.js`,
Step 274 pack membership, Step 276 pack membership, command surfaces, replay
cursor movement, no-bar gap skipping, chart viewport intent, chart-engine
behavior, target-history request sizing, shell readout code, producer runtimes,
or the Step 362 runtime skeleton.

## Inputs

Step 276 currently runs eight members and ends with the full replay-gap pack:

- `v6/tests/replay-gap-browser-regression-pack-step274-smoke.js`.

Step 274 remains the full replay-gap confirmation command. It preserves:

- the long-path manual source assertion through
  `manual-next-session-gap-browser-step258-smoke.js`;
- the long-path HTF manual assertion through
  `htf-manual-next-replay-gap-browser-step273-smoke.js`;
- low-TF and HTF auto-play replay-gap assertions.

Step 387 added a standalone fast replay-gap browser pack:

- `node v6/tests/replay-gap-fast-browser-regression-pack-step387-smoke.js`.

The fast pack passed `3/3` in `24532ms` and covers:

- Step 385 near-gap manual low-TF and HTF assertions;
- existing low-TF auto-play replay-gap assertions;
- existing HTF auto-play replay-gap assertions.

## Options Considered

### Keep Step 276 On Full Step 274

This preserves the broadest default signal, but it leaves the Step 276 runtime
cost problem unchanged. Step 381 measured the foundation pack at `105292ms`,
with Step 274 consuming `90350ms`.

### Switch Step 276 Directly To Fast Step 387

This reduces default foundation-pack runtime, but it removes the full long-path
confirmation from the default foundation command without leaving an explicit
in-command way to request the full replay-gap path.

### Add Fast/Full Controls To Step 276

This is the selected strategy.

Step 276 should gain a small test-runner-level replay-gap mode control:

- default replay-gap mode: `fast`;
- explicit full mode: `FOUNDATION_REPLAY_GAP_MODE=full`;
- explicit fast mode: `FOUNDATION_REPLAY_GAP_MODE=fast`.

The default foundation pack should use the Step 387 fast replay-gap pack to
reduce routine chart-foundation runtime. Full replay-gap coverage should remain
available through both:

- direct Step 274 command;
- Step 276 full mode.

## Decision

Select **foundation replay-gap fast/full mode controls with fast default**.

Step 389 should implement the Step 276 runner control without changing runtime
behavior or Step 274 membership.

Recommended behavior:

| Mode | Replay-gap member |
| --- | --- |
| unset / `fast` | `v6/tests/replay-gap-fast-browser-regression-pack-step387-smoke.js` |
| `full` | `v6/tests/replay-gap-browser-regression-pack-step274-smoke.js` |

Invalid modes should fail early with a clear message before running browser
members.

## Step 389 Recommendation

Select **Foundation Pack Replay Gap Fast/Full Mode Implementation** as the next
bounded chart-foundation slice.

Step 389 should:

- update `v6/tests/timeframe-replay-foundation-regression-pack-step276-smoke.js`;
- choose the replay-gap member from `FOUNDATION_REPLAY_GAP_MODE`;
- default to the Step 387 fast pack;
- preserve explicit full mode through Step 274;
- add static coverage for default fast, explicit fast, explicit full, invalid
  mode fail-fast, and unchanged Step 274 membership;
- keep Step 274 and Step 387 directly runnable.

## Preserved Boundaries

- Runtime behavior remains unchanged.
- Replay cursor movement and no-bar gap skipping remain unchanged.
- `v6/src/app.js` remains unchanged.
- Step 274 replay-gap pack membership remains unchanged.
- Step 387 fast pack membership remains unchanged.
- Display-Timeframe Runtime remains the TF-switch owner.
- Replay remains source `1m` driven.
- Target bars remain display materialization inputs only.
- The Step 293 target-history diagnostics default pack remains eight tests.
- Optional target-history members remain unchanged.

## Verification

- `node v6/tests/foundation-pack-replay-gap-fast-full-selection-step388-static-smoke.js`
- `node v6/tests/replay-gap-fast-browser-regression-pack-step387-static-smoke.js`
- `node v6/tests/replay-gap-browser-regression-pack-step274-static-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`
