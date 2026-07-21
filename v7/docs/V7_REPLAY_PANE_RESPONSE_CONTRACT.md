# V7 Replay × Pane Response Contract

Status: R6.2 pure plan, range-bound schema v2 consumed by R6.4

## Decision

Replay navigation semantics are fixed before complete Pane-set materialization
or browser multi-Pane layout. `core.replay-pane-response-contract` turns one
validated Replay action plus one branded Pane Workspace into a complete,
immutable response plan. It performs no I/O and mutates no owner.

Every action targets all visible Panes. Active focus never narrows Replay
scope. The Session primary instrument is the shared source-clock authority;
Pane-local instrument, timeframe, and Viewport intents remain independent.

## V6 Evidence And Disposition

Retained and re-derived:

- Manual Previous replaces visibility through the rewound cursor instead of
  deleting the last rendered candle;
- Autoplay uses the same Next semantics and cannot create another cursor path;
- later V6 shared-cursor materialization and GoTo navigation target every
  visible Pane;
- quick GoTo uses New York schedule anchors verified against nearby real source
  data;
- forward GoTo loads the complete revealed interval, not only its destination;
- Session Hours remains one Session-scoped mode/revision shared by all Panes;
- missing comparison-instrument bars do not stall the shared cursor;
- every Pane preserves its own Viewport intent.

Rejected as V7 implementation structure:

- the earlier V6 Step 156 target-Pane-only Next/Autoplay path, which predates
  the later shared-cursor materializer and cannot represent one atomic V7
  workspace revision;
- command/event fan-out as transaction orchestration;
- append/delete decisions made from rendered candles;
- shell or calendar surfaces writing Replay or chart state.

Primary V6 evidence:

- `V6_REPLAY_STEP_BACK_OWNER_READINESS_AUDIT_STEP235.md`;
- `V6_CHART_ENTRY_MANUAL_PREVIOUS_REPLACEMENT_CONTRACT_STEP237.md`;
- `V6_SHARED_CURSOR_MATERIALIZATION_STEP404.md`;
- `V6_GOTO_REPLAY_NAVIGATION_PLAN_STEP402.md`;
- `V6_REPLAY_NAVIGATION_COORDINATOR_STEP405.md`;
- `V6_REPLAY_NAVIGATION_CONTINUOUS_RANGE_STEP407.md`;
- `V6_ETH_RTH_REPLAY_PROJECTION_PHASE_A3.md`;
- `V6_MULTI_INSTRUMENT_PANE_PHASE_PLAN.md`.

## Action Matrix

| Action | Target resolution | Coverage/materialization |
| --- | --- | --- |
| Manual Next | next eligible primary-source bar | one eligible source step; reproject all Panes |
| Autoplay Next | same resolver as Manual Next | one non-overlapping atomic Next transaction |
| Manual Previous | previous eligible primary-source bar | replace all Pane visibility through resolved target |
| Restart/Back-to | selected earlier source cutoff | replace all Panes; selected cutoff remains exclusive |
| Quick GoTo | next real source near the selected New York anchor | complete forward range from old cursor through target |
| Exact GoTo forward | requested Session cutoff | complete forward range from old cursor through target |
| Exact GoTo backward | requested Session cutoff | replace all Pane visibility through target |
| Exact GoTo at cursor | current cutoff | no materialization transaction required |

Quick GoTo anchors are `Next Day Open`, `Next Session`, `Asian Session`,
`London Session`, and `New York Session`. Custom Settings configures those
anchors; it is not another materialization path.

Exact GoTo is a separate action that accepts any valid cutoff within the Replay
Session and may move forward or backward. A future Custom Range operation is a
Session/history-range concern, not an alias for Replay cursor movement.

## Atomicity And Missing Data

Every plan declares:

- one affected set containing every visible Pane in stable order;
- one shared cursor and Session Hours/calendar revision;
- one Workspace Transaction and exact visible-completion acknowledgement;
- Replay plus complete Pane-set commit only after every Pane is visibly ready;
- failure preserves the last accepted workspace and pauses playback;
- only one Replay transaction may be in flight, so Autoplay cannot backlog;
- a Pane may end earlier than another or be empty when its instrument has no
  eligible bar, but no Pane may reveal source data at or after the shared
  exclusive cursor.

Different TFs can respond to a source step by updating the current aggregate
candle rather than adding a new displayed candle. Different instruments may
have different `visibleThrough` values. Neither condition creates a separate
cursor or stalls Replay.

R6.4 binds the exact active Replay range into response-plan schema v2. This
lets both the navigation executor and Replay proposal port reject a stale or
foreign range before no-op or materialization work.

## Economic Calendar Boundary

V6 has no accepted Economic Calendar implementation. V7 therefore does not
claim one in R6.2. Economic Calendar is deferred to the business-feature phase
as an optional event provider and collapsible event-container consumer.

It may later emit an Exact GoTo intent and read a generic chart-marker
projection port. It may not own Replay, request bars, write chart series, or
expose post-release news results before the accepted Replay cursor. Replay,
live-order, training-order, and review-order providers remain separate fact
owners behind the same read-only event presentation contract.

## R6.2 Exclusions At Definition Time

- no Replay Runtime Previous/target/autoplay mutation API;
- no target-resolution I/O or New York anchor scheduler;
- no complete Pane-set Projection/application runtime;
- no browser transport, GoTo dialog, multi-Pane layout, or event markers;
- no Economic Calendar provider or data source.

R6.3 and R6.4 now activate the first three items headlessly through the shared
runtime; browser transport/dialog/layout and Economic Calendar remain excluded.

## Gate

`tests/replay-pane-response-contract-harness.js` covers all six action kinds,
all five quick anchors, exact forward/backward/retain movement, single- and
mixed-instrument/mixed-TF multi-Pane plans, Session-level ETH/RTH, primary-clock
authority, Viewport preservation, complete forward coverage, atomic failure and
overlap policies, plus 18 negative controls.
