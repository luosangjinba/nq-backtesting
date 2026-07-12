# Step 386 - Replay Gap Fast Pack Integration Selection

Status

Accepted.

## Scope

This step selects how the proven Step 385 near-gap manual fixture should enter
the replay-gap regression strategy.

No runtime behavior changed in this step. It does not modify `v6/src/app.js`,
Step 274 pack membership, Step 276 pack membership, command surfaces, replay
cursor movement, no-bar gap skipping, chart viewport intent, chart-engine
behavior, target-history request sizing, shell readout code, producer runtimes,
or the Step 362 runtime skeleton.

## Inputs

Step 274 full replay-gap pack currently runs four browser members serially:

- `manual-next-session-gap-browser-step258-smoke.js`;
- `auto-play-session-gap-browser-step263-smoke.js`;
- `htf-manual-next-replay-gap-browser-step273-smoke.js`;
- `htf-auto-play-replay-gap-browser-step273-smoke.js`.

Step 276 currently includes the full Step 274 pack as its replay-gap member.

Step 385 added a standalone near-gap manual fixture:

- `node v6/tests/replay-gap-near-gap-manual-fixture-step385-smoke.js`

It covers `1m`/`5m`/`15m` and `1D`/`1W`/`1M`, proving:

```text
16:58 -> 16:59 -> 18:00 -> 18:01
```

with `2` pre-gap Manual Next calls before the final post-gap next.

## Options Considered

### Keep Step 385 Standalone Only

This keeps risk lowest, but it does not help Step 276 runtime because the broad
foundation command still reaches the expensive full Step 274 pack.

### Add Step 385 Directly To Step 274

This gives a new fast signal but makes Step 274 larger and does not reduce its
current runtime. It also mixes fast and full confirmation concerns in one
command.

### Replace Step 274 Members Immediately

This would reduce runtime, but it is too abrupt because the existing long-path
manual source case is still valuable. The long path proves replay can advance
from `15:34` across the full pre-gap source sequence before skipping to
`18:00`.

### Split Fast And Full Replay-Gap Commands

This is the selected strategy.

Create a future fast replay-gap browser pack that uses:

- Step 385 near-gap manual fixture for all six manual low-TF/HTF cases;
- existing low-TF auto-play near-gap browser coverage;
- existing HTF auto-play near-gap browser coverage.

Keep the current Step 274 command as the full replay-gap confirmation path. It
preserves the long-path manual source assertion through
`manual-next-session-gap-browser-step258-smoke.js` and the existing HTF manual
long-path assertion.

## Decision

Select **fast/full replay-gap pack split**.

Step 387 should implement a new fast replay-gap browser pack command while
leaving the current full Step 274 pack unchanged.

Recommended future command:

- `node v6/tests/replay-gap-fast-browser-regression-pack-step387-smoke.js`

Recommended Step 387 fast pack members:

- `v6/tests/replay-gap-near-gap-manual-fixture-step385-smoke.js`;
- `v6/tests/auto-play-session-gap-browser-step263-smoke.js`;
- `v6/tests/htf-auto-play-replay-gap-browser-step273-smoke.js`.

The new fast pack should be standalone at first. Step 276 should keep using the
full Step 274 command until the fast pack has passed and a later step explicitly
selects whether Step 276 should switch to the fast pack or expose fast/full
member controls.

## Preserved Coverage

The selected strategy preserves:

- one long-path manual source assertion in the full Step 274 command;
- existing long-path HTF manual confirmation in the full Step 274 command;
- near-gap low-TF manual assertions through Step 385;
- near-gap HTF manual assertions through Step 385;
- existing low-TF auto-play gap assertions;
- existing HTF auto-play gap assertions.

## Step 387 Recommendation

Select **Replay Gap Fast Browser Pack Implementation** as the next bounded
chart-foundation slice.

Step 387 should:

- add `node v6/tests/replay-gap-fast-browser-regression-pack-step387-smoke.js`;
- run the three selected fast members serially with the same fail-fast behavior
  as Step 274;
- add static coverage proving Step 274 and Step 276 membership remain
  unchanged;
- keep the Step 385 standalone fixture directly runnable;
- keep the full Step 274 command directly runnable.

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
- Optional target-history members remain unchanged.

## Verification

- `node v6/tests/replay-gap-fast-pack-integration-selection-step386-static-smoke.js`
- `node v6/tests/replay-gap-near-gap-manual-fixture-step385-static-smoke.js`
- `node v6/tests/replay-gap-browser-regression-pack-step274-static-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`
