# V7 Multi-Pane RTH History Preservation — R6.7a

Status: implemented; follow-up review blocked by Viewport span collapse (2026-07-21)

## Reproduction

Create a Session from `05/01/2026 12:40` through `05/11/2026 12:40` New York
time with NQ and ES available, activate two NQ `1m` Panes, extend the left Pane
under ETH, switch to RTH, then extend the Panes toward earlier history. One Pane
could display `No eligible bars at this Replay time`; later input could remain
on RTH or report `workspace-transaction-failed`.

## Cause

Incremental history intentionally projects only the newly acquired chunk and
the oldest accepted boundary chunk. Consecutive windows wholly outside RTH can
contain real raw bars but no eligible RTH bars. That bounded prefix therefore
raised `PROJECTION_VISIBLE_EMPTY`, which the Pane composition interpreted as an
empty Pane even though its accepted snapshot still contained valid visible RTH
candles. The raw ledger advanced, but the false empty result hid the accepted
chart and destabilized subsequent interaction.

## Correction

The pure history-extension operation now treats `PROJECTION_SOURCE_EMPTY` and
`PROJECTION_VISIBLE_EMPTY` as non-contributing prefixes only when a valid ready
accepted snapshot already exists. It preserves those bars and visible-through,
rebinds provenance to the current retained Replay proposal, and prepends the
new raw request key so later requests continue across the closed interval.

This exception is narrow. It still proves exact cursor target, provider,
instrument, resolution, dataset, TF, calendar, aggregation, and Session Hours
policy compatibility. Window gaps/overlaps, changed policy revisions, forged
request-key chains, and every other Projection error remain failures. No fake
bar is created and no Pane/UI module merges projected bars.

## Gate

- the pure Projection Harness covers two consecutive closed-session prefixes,
  preserved candles, advanced request-key provenance, changed-policy
  rejection, and forged-chain rejection;
- a dedicated real-browser Harness recreates the exact reviewed date range,
  extends under ETH, switches to RTH, repeatedly and rapidly extends both
  Panes, then switches back to ETH;
- both Panes must remain ready with candles, ETH/RTH controls must remain
  interactive, Workspace state must stay ready, and browser errors must remain
  empty;
- all 37 non-browser and five browser gates pass; the retained single-Pane
  performance gate measures Next p95 `52.1ms`, p99 `60.4ms`, max `61.2ms`,
  `12h` RTH replacement about `1065ms`, and rapid history with no long task.

## Review Follow-up

The false-empty and recovery behavior was corrected, but follow-up review found
rapid RTH dragging could collapse an unzoomed manual wall to roughly seven
bars. R6.7b corrects that separate adapter-only logical-range defect and extends
this browser gate through a two-to-one Pane transition.
