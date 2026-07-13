# Session 2026-07-13 - Step 407 Replay Navigation Continuous Range

## Trigger

User screenshots showed Replay reveal count jumping to the target while Chart
Data skipped the intermediate K-lines and rendered a large blank interval.

## Completed

- diagnosed single-cursor materialization as the root cause;
- extended the shared materializer with bounded forward range loading;
- kept Manual Next on the unchanged single-cursor path;
- passed old cursor time from Replay Navigation only;
- projected the same full range for fixed HTF and session-calendar timeframes;
- strengthened the real NQ browser gate to require more than 500 intermediate
  K-lines and no-future timestamps;
- added terminal, unresolved-target, exception, default-active-pane, and rapid
  double-input acceptance boundaries;
- added one shared `1m`/`4h`/`1D`/`1W`/`1M` multi-pane projection matrix over a
  two-window source range, with ordered/unique/no-future assertions;
- passed Manual Next `5/5`, visible latency `6/6`, chart browser `28/28`, and HTF
  replay-gap regressions.

## Commits

- `a3874d0e fix(v6): materialize replay navigation ranges`
- `ad5f183b fix(v6): fill replay navigation chart ranges`
- `30da32d3 test(v6): gate replay navigation continuity`
- `26a55329 test(v6): cover replay navigation acceptance boundaries`
- `bed21427 test(v6): gate replay navigation timeframe matrix`
- expanded automated acceptance documentation: this commit.

## Next

Only the human visual gate remains. Repeat the user's exact `1m` scenario after
a hard reload, then sample one fixed HTF and one of `1D`/`1W`/`1M`. Confirm the
filled interval remains continuous while dragging and that the destination
K-line agrees with the footer cursor. Step 407 remains open until this passes.
