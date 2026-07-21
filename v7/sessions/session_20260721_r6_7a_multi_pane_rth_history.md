# Session — R6.7a Multi-Pane RTH History Preservation

Date: 2026-07-21
Status: implementation complete; awaiting human interaction review

## Review Input

The user supplied an exact two-Pane reproduction: extend ETH history, switch to
RTH, then extend again. Candles disappeared Pane by Pane, the Session Hours
selection appeared stuck on RTH, and `workspace-transaction-failed` appeared.

## Delivered

- reproduced the false empty Pane in real Chrome with the reviewed New York
  range and two NQ `1m` Panes;
- corrected pure incremental Projection so consecutive closed-session history
  windows preserve a ready accepted tail while advancing exact raw coverage;
- retained current Replay-proposal provenance without moving the cursor;
- kept genuine identity, policy, contiguity, and request-chain violations as
  hard failures;
- added a focused browser gate covering ETH extension, RTH extension in both
  Panes, alternating rapid drags, and successful ETH recovery.

## Evidence

- all 37 non-browser Harnesses pass, including closed-session preservation and
  strict changed-policy/forged-chain rejection;
- all five browser Harnesses pass serially, including the exact two-Pane
  ETH→RTH history reproduction and ETH recovery;
- the single-Pane performance gate records 100 Next samples at p95 `52.1ms`,
  p99 `60.4ms`, and max `61.2ms`; ETH→RTH, `5m`, and `12h` RTH replacements
  measure about `53ms`, `161ms`, and `1065ms`;
- rapid history takes about `1841ms` with no observed long task;
- visual fixtures, architecture boundaries, source quality, and
  `git diff --check` pass.

## Next Review Boundary

Repeat the supplied sequence and confirm both Panes retain candles, ETH/RTH can
still switch in either direction, and no Workspace error appears. R6.8 remains
blocked until this correction and continuous Autoplay are accepted together.
