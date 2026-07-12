# Step 382 - Replay Gap Regression Pack Cost Audit

Status

Accepted.

## Scope

This step audits why the Step 274 replay-gap browser pack dominated the Step
381 chart-foundation refresh runtime.

No runtime behavior changed in this step. It does not modify `v6/src/app.js`,
command surfaces, replay cursor movement, no-bar gap skipping, chart viewport
intent, chart-engine behavior, target-history request sizing, shell readout
code, producer runtimes, or the Step 362 runtime skeleton.

## Step 381 Runtime Input

Step 381 measured:

- `node v6/tests/timeframe-replay-foundation-regression-pack-step276-smoke.js`
  passed `8/8` in `105292ms`;
- `replay-gap-browser-regression-pack-step274-smoke.js` consumed `90350ms`
  inside that run;
- Step 274 member runtimes were:
  - `manual-next-session-gap-browser-step258-smoke.js`: `27270ms`;
  - `auto-play-session-gap-browser-step263-smoke.js`: `4843ms`;
  - `htf-manual-next-replay-gap-browser-step273-smoke.js`: `50161ms`;
  - `htf-auto-play-replay-gap-browser-step273-smoke.js`: `8014ms`.

## Cost Owners

The primary cost owner is not production replay behavior. It is browser harness
shape plus manual-step scenario size.

### Pack orchestration

`v6/tests/replay-gap-browser-regression-pack-step274-smoke.js` runs four member
browser smokes serially as child Node processes. Each member owns its own page
harness lifecycle. This preserves isolation and fail-fast behavior, but it also
means the pack pays browser/page setup repeatedly.

### Manual 1m/5m/15m gap smoke

`v6/tests/manual-next-session-gap-browser-step258-smoke.js` runs three cases:
`1m`, `5m`, and `15m`.

Each case:

- opens a fresh V6 browser page;
- creates a session from `2026-06-01T15:34` to `2026-06-05T16:00`;
- waits for chart-entry projection apply;
- loops Manual Next until the replay cursor reaches `2026-06-01T18:00:00.000Z`;
- sends one more Manual Next and asserts the cursor reaches
  `2026-06-01T18:01:00.000Z`.

The loop cap is `100` Manual Next calls per case. The expected crossed cursor
index is `146`, which means the test intentionally drives a long source-replay
path before it reaches the gap.

### HTF manual gap smoke

`v6/tests/htf-manual-next-replay-gap-browser-step273-smoke.js` delegates to
`runHtfReplayGapBrowserPack({ mode: 'manual' })`.

The helper runs three HTF cases: `1D`, `1W`, and `1M`.

Each manual HTF case:

- opens a fresh V6 browser page;
- creates a session from `2026-06-01T15:34` to `2026-06-05T16:00`;
- applies the requested HTF display timeframe;
- loops Manual Next until the replay cursor reaches `2026-06-01T18:00:00.000Z`;
- sends one more Manual Next and asserts the cursor reaches
  `2026-06-01T18:01:00.000Z`;
- asserts HTF projection metadata, including final source timestamp and footer
  cursor text.

This is the slowest member because it combines three fresh browser cases, long
manual cursor advancement, and HTF projection assertions.

### Auto-play gap smokes

The auto-play members are much cheaper because their sessions start near the
gap:

- auto low-TF uses `2026-06-01T16:50` to `2026-06-01T18:10`;
- HTF auto uses the same near-gap window;
- both set the cursor to `2026-06-01T16:58:00.000Z` before starting playback.

The auto tests still have polling deadlines, but they do not manually drive
roughly a full pre-gap replay segment for each timeframe.

## Unknowns

This audit does not yet measure per-case setup time versus per-Manual-Next
loop time. The likely split is:

- repeated browser/page setup cost from one page per case;
- long manual replay advancement cost from starting manual cases at `15:34`;
- HTF projection cost on the three manual HTF cases.

Step 383 should measure this split before changing runner membership or test
coverage.

## Cost-Control Plan

Use a staged approach instead of weakening the replay-gap assertions:

1. Add harness-only timing probes around Step 258 and Step 273 manual cases:
   page setup, session creation/apply, timeframe apply, manual advancement
   loop, final post-gap assertion, cleanup.
2. Keep the existing Step 274 pack and Step 276 foundation pack available as
   broad confirmation commands.
3. Based on measurement, choose one bounded optimization:
   - a near-gap manual fixture that starts closer to `16:58` while preserving at
     least one long-path manual source assertion;
   - a pack split between fast replay-gap smoke and full replay-gap pack;
   - or a shared-page test harness if lifecycle reuse proves safe and does not
     leak session/chart state.
4. Do not remove `1m`, `5m`, `15m`, `1D`, `1W`, or `1M` gap assertions until a
   replacement proves equivalent coverage.

## Step 383 Recommendation

Select **Replay Gap Manual Path Timing Probe** as the next bounded
chart-foundation slice.

Step 383 should be measurement-only:

- instrument the manual low-TF and HTF replay-gap browser paths with
  harness-local phase timings;
- report per-case timing for setup, apply, manual-loop duration, Manual Next
  count, assertion/readout, and cleanup;
- leave Step 274 and Step 276 pack membership unchanged;
- leave replay cursor movement and no-bar gap skipping behavior unchanged.

## Preserved Boundaries

- Runtime behavior remains unchanged.
- Replay cursor movement and no-bar gap skipping remain unchanged.
- `v6/src/app.js` remains unchanged.
- Display-Timeframe Runtime remains the TF-switch owner.
- Replay remains source `1m` driven.
- Target bars remain display materialization inputs only.
- Step 274 replay-gap assertions remain intact.
- Step 276 foundation pack remains the broad confirmation command.
- The Step 293 target-history diagnostics default pack remains eight tests.
- Optional members `replay-coordination`, `readout-producer-flow`,
  `handoff-registration`, and `reduced-delay-budget` remain available.

## Verification

- `node v6/tests/replay-gap-regression-pack-cost-audit-step382-static-smoke.js`
- `node v6/tests/chart-foundation-regression-refresh-step381-static-smoke.js`
- `node v6/tests/replay-gap-browser-regression-pack-step274-static-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`
