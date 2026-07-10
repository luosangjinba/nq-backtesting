# 2026-07-10 - Restart Handoff

## Repository State

- Branch: `v6/fx-replay-workstation`
- Worktree at handoff: clean before writing this handoff
- Latest committed work before handoff:
  - `b68404fe fix(v6): skip replay session gaps`
  - `a8828499 fix(v6): parse session setup times as chart axis`
  - `dfc270f1 fix(v6): stabilize wheel prepend range`

## Current Runtime

- API was listening on `127.0.0.1:8766`.
- Static V6 page was listening on `127.0.0.1:8002`.
- Open V6 at `http://127.0.0.1:8002/v6/index.html`.
- Check API health at `http://127.0.0.1:8766/v4/health`.

Windows entry points:

- `v6/start_windows.bat`
- `powershell -NoProfile -ExecutionPolicy Bypass -File v6/start_windows.ps1 start`

## Current Direction

- Keep working on chart foundation before indicators, simulated trading, or
  journal workflows.
- The current foundation scope is chart loading, timeframe switching, leftward
  history extension, date range entry, replay, multi-pane behavior, pane-local
  reset, and visible K-line latency.
- Preserve V6 ownership boundaries: replay runtime owns cursor state, bar-data
  runtime owns bar fetch/cache, chart runtime owns series writes, UI dispatches
  commands and subscribes to events.

## Latest Important Fixes

- Session form `datetime-local` values are chart-axis UTC literals.
- Session switch and reset view now reset price scale instead of inheriting the
  prior session's price axis.
- Wheel zoom leftward prepend has delayed stabilization.
- Manual next skips no-bar session gaps to the next source bar. This fixed the
  observed stop at the first `16:59` around the 17:00 break. Browser coverage
  checks 1m, 5m, and 15m display paths.

## Last Verification

- `node v6/tests/replay-domain-smoke.js`
- `node v6/tests/replay-runtime-smoke.js`
- `node v6/tests/manual-next-session-gap-step258-smoke.js`
- `node v6/tests/manual-next-session-gap-browser-step258-smoke.js`
- `node v6/tests/chart-entry-manual-next-runtime-smoke.js`
- `node v6/tests/manual-next-htf-projection-step197-smoke.js`
- `node v6/tests/auto-play-htf-projection-step199-smoke.js`
- `node v6/tests/display-timeframe-leftward-auto-chain-browser-smoke.js`
- `node v6/tests/replay-transport-chain-regression-pack-step245-smoke.js`
- `node v6/tests/visible-kline-latency-regression-pack-step257-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

Note: one browser latency test had a transient failure in the full pack, then
passed individually and in the full pack rerun.

## After Restart

1. Read `v6/TODO.md`.
2. Read `v6/docs/V6_HANDOFF.md`, especially the 2026-07-10 snapshot at the top.
3. Confirm branch and status:
   - `git branch --show-current`
   - `git status --short`
4. Verify API and web endpoints.
5. Manually spot-check a session crossing `2026-06-01 17:00` if continuing the
   replay-gap thread.
6. If no regression appears, proceed by selecting Step 258 as the next bounded
   chart-foundation slice.
