# Step 391 - Chart Foundation Runtime Refresh Selection

Status

Accepted.

## Scope

This step selects the chart-foundation runtime refresh path after Step 390
documented the replay-gap fast/full foundation commands.

No runtime behavior changed in this step. It does not modify `v6/src/app.js`,
Step 274 pack membership, Step 276 runner behavior, Step 387 pack membership,
command surfaces, replay cursor movement, no-bar gap skipping, chart viewport
intent, chart-engine behavior, target-history request sizing, shell readout
code, producer runtimes, or the Step 362 runtime skeleton.

## Inputs

Older full foundation refresh from Step 381:

- `node v6/tests/timeframe-replay-foundation-regression-pack-step276-smoke.js`
  passed `8/8` in `105292ms`;
- the Step 274 replay-gap member consumed `90350ms`.

Current default fast foundation result from Step 389:

- `node v6/tests/timeframe-replay-foundation-regression-pack-step276-smoke.js`
  passed `8/8` in `44597ms`;
- the default Step 276 replay-gap member is now the Step 387 fast pack;
- the Step 387 standalone fast replay-gap pack passed `3/3` in `24532ms`;
- during the Step 389 default foundation run, the fast replay-gap member
  completed in `28243ms`.

## Decision

No additional immediate browser runtime refresh is required before returning to
the next chart-foundation selection step.

The current default foundation command was already rerun after the Step 276
fast/full mode split and passed with the new default fast replay-gap member.
That gives a fresh default-path runtime signal (`44597ms`) against the older
full-path signal (`105292ms`) without spending another equivalent browser run
for the same evidence.

The replay-gap pack cost-control chain can close for now. Broad long-path
confirmation remains explicit and available through full mode and direct Step
274.

## Commands To Keep

Routine chart-foundation regression:

```bash
node v6/tests/timeframe-replay-foundation-regression-pack-step276-smoke.js
```

Broad replay-gap confirmation through the foundation pack:

```bash
FOUNDATION_REPLAY_GAP_MODE=full node v6/tests/timeframe-replay-foundation-regression-pack-step276-smoke.js
```

Standalone fast replay-gap pack:

```bash
node v6/tests/replay-gap-fast-browser-regression-pack-step387-smoke.js
```

Standalone full replay-gap pack:

```bash
node v6/tests/replay-gap-browser-regression-pack-step274-smoke.js
```

Standalone near-gap manual fixture:

```bash
node v6/tests/replay-gap-near-gap-manual-fixture-step385-smoke.js
```

## Preserved Confidence

- Step 274 remains the full long-path replay-gap confirmation command.
- Step 387 remains the default fast replay-gap pack used by Step 276.
- Step 385 remains directly runnable for the near-gap manual fixture.
- One long-path manual source assertion remains preserved through the explicit
  full path.
- Existing manual-next, auto-play, and HTF replay-gap assertions are not
  weakened.

## Step 392 Recommendation

Select **Chart Foundation Post Replay-Gap Cost Control Re-audit** as the next
bounded chart-foundation slice.

Step 392 should:

- re-audit the chart-foundation queue after the replay-gap cost-control chain
  closes;
- select the next concrete chart-foundation implementation or verification
  slice;
- keep the default fast foundation command and explicit full replay-gap command
  documented;
- avoid returning to the narrow HTF leftward latency chain unless a concrete
  uncovered regression is identified;
- keep runtime behavior unchanged unless the selected slice explicitly scopes a
  behavior change.

## Verification

- `node v6/tests/chart-foundation-runtime-refresh-selection-step391-static-smoke.js`
- `node v6/tests/foundation-replay-gap-mode-closeout-step390-static-smoke.js`
- `node v6/tests/foundation-pack-replay-gap-fast-full-mode-step389-static-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`
