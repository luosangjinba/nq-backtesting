# V7 Replay Bar Step — R6.6

Status: implemented; awaiting human interaction review (2026-07-21)

## Correction

R6.5 exposed Previous/Next controls but still resolved each action to an
adjacent primary-source `1m` bar. The resulting behavior was Next minute, not
Next bar. R6.6 replaces that hidden assumption with one explicit Session-level
Replay step.

Replay step is independent from every product Pane display timeframe. Focusing
a Pane or changing a Pane from `1m` to `4h` cannot change the meaning of the
global transport. The bounded initial options follow the reviewed V6 playback
period set: `1m`, `3m`, `5m`, `15m`, `30m`, `1h`, `2h`, and `4h`; the default
is `1m`.

## Owner And Target Semantics

Replay Contract brands the fixed step grid: id, duration, alignment offset,
and source duration. Replay Runtime owns the selected branded value beside its
cursor and playback state. Changing the selection does not move or revise the
cursor and creates no Pane materialization transaction.

For Manual Next and Autoplay Next, source traversal finds the earliest aligned
step bucket after the current exclusive cursor that contains at least one real,
eligible primary-instrument source bar. The target is that bucket's exclusive
completion cutoff. Empty closed-session/weekend buckets are skipped, while a
missing minute inside a real bucket does not shift its completion slot.

Manual Previous symmetrically finds the latest earlier non-empty step bucket
and replaces all Pane visibility through its completion cutoff. At the first
Replay bar it returns to the Session start. Exact and quick GoTo semantics do
not depend on the Replay step.

This means a `5m` action from a `12:41` exclusive cursor resolves to `12:45`
and displays through the `12:44` completion slot. A partial `12h` RTH bucket
may complete at its shared fixed-clock cutoff even when the last eligible
source bar is earlier; no source bar is synthesized.

## Atomic Pane Response

The response plan is schema v3 and carries the exact branded Replay step used
for target resolution. The Replay proposal boundary rejects a plan if the
accepted step changed. The resolved target still enters the existing single
Workspace Transaction, so every visible Pane reprojects at one cursor and only
one complete Pane-set paint may publish Replay progress.

## Visible Surface

The current R6.5 toolbar now exposes the independent Replay step selector and
labels the forward action `Next bar`. This is an interim transport shell. The
reviewed constrained floating transport, continuous Autoplay, speed control,
and final button arrangement remain the next correction; this step does not
claim their visual acceptance.

## Gate

- Replay Contract: 15 negative controls;
- Replay Runtime: 12 negative controls;
- Replay × Pane response: schema v3 and 19 negative controls;
- Replay Navigation Runtime: 21 negative/race controls;
- focused source traversal: completion grid, missing minute, RTH weekend gap,
  Previous symmetry, and partial `12h` completion;
- real mixed-Pane browser: a `5m` Replay step remains independent of the active
  ES/`4h` Pane and one Next displays through `12:44 EDT` atomically;
- established single-Pane performance and visual regression remain green:
  Next p95 `58.2ms`, p99 `60.9ms`, max `64.5ms`, and `12h` RTH replacement
  about `921ms` in the final serial gate.

## Still Rejected From R6.5

- `Auto ×1` is not the final continuous Autoplay control;
- the transport is not yet the constrained floating bottom-center surface;
- only one/two-Pane layouts exist;
- Symbol, Interval, Crosshair, Time, and Date-range sync controls do not yet
  exist.
