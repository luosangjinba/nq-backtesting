# V7 V6 Interaction Decision Carry-Forward

Status: binding product-evidence policy; R5.1 complete (2026-07-20)

## Decision

V6 interaction decisions are prior product evidence, not disposable legacy
notes. When V6 documentation records a clear behavior and no later V6 decision
rejects it, V7 retains that user-facing behavior by default. V7 must not ask the
user to redesign or re-accept the same product semantics before implementation.

Carry-forward does not authorize source copying. V7 must still re-derive the
owner graph, public contracts, transaction boundary, persistence schema, stale
work rejection, and executable evidence. V6 command/event cascades, shell-owned
mutation, primary-pane branches, and mixed-purpose templates remain rejected.

## Reopen Triggers

An inherited interaction decision may be reopened only when at least one of
these conditions is recorded:

1. verified provider/timestamp/calendar facts contradict the V6 assumption;
2. two accepted V6 decisions conflict and no later decision resolves them;
3. current Lightweight Charts or browser behavior makes the interaction
   infeasible or materially different;
4. a V6 failure report proves the product behavior itself was wrong rather than
   its implementation;
5. the user explicitly changes the V7 product direction.

Architecture differences alone are not a reason to reopen product behavior.
They require a V7 implementation decision, not another user product interview.

## Carry-Forward Matrix

| Area | Inherited interaction semantics | V7 treatment |
| --- | --- | --- |
| Reset View | reset is Pane-local; it restores that Pane's default wall; it does not request bars, alter chart data, or move Replay | already re-derived and accepted in Viewport Runtime; future multi-pane UI gives every Pane a compact Pane-local action |
| Replay transport | one shared Replay clock; Play/Pause, Next, Previous, Restart and period/speed controls reflect real availability; Space and Arrow Right avoid editable fields; ended/disabled states are honest | retain interaction model for R7; UI dispatches to Replay/workspace transaction owners and never infers acceptance from command return |
| Chart Settings | open from committed state; edits live in a draft; Cancel/close/Escape/backdrop restore committed presentation; Reset is draft-only; OK atomically validates and persists; never expose a control without a real consumer | retain for a future Settings owner; presentation preview uses explicit reversible ports and only the chart adapter mutates Lightweight Charts |
| Settings scope | Chart Settings and Session Settings are distinct; visual preferences are global workspace preferences; Pane-local instrument/timeframe/viewport remain operational Pane state; no templates, Apply-to-all, or per-Pane visual overrides without a new journey | retain; do not reproduce V6's large shell modal or global command/event registry |
| Multi-pane | every Pane uses the same Pane record shape; active focus controls which Pane the toolbar describes/targets; each Pane owns instrument, timeframe and viewport intent; one chart instance per host is acceptable; Reset and manual walls stay Pane-local | re-derive in R6 through one atomic workspace revision; no primary/non-primary code paths and no partial visible layout commit |
| Multi-pane Replay | all Panes share one cursor/reveal state; a Pane update does not move another Pane's viewport; no Pane may show future data; missing Pane bars do not stall the shared clock | retain; one workspace transaction materializes all affected Panes and publishes only after exact visible completion |
| ETH/RTH | one Session-scoped mode shared by all Panes; compact toolbar selector; switching retains source cursor and recomputes visible-through; RTH traversal skips ineligible intervals; eligibility precedes aggregation; all Panes replace under one hours/calendar revision | retain for R5; verify actual provider timestamps, holidays, early closes, maintenance break and DST before activating policy |
| ETH/RTH failure | switching pauses playback; successful atomic replacement may resume prior playback; failure stays paused and preserves the last accepted workspace; stale mode work cannot commit | re-derive through Workspace Transaction Runtime rather than V6 coordinator/event fan-out |
| Multi-instrument | Session owns an allowed asset set and primary symbol; Pane instrument intent is local; sync-off targets one Pane and sync-on fans one intent to all; toolbar follows active Pane without issuing a command; comparisons share one Replay clock | retain for R6 after Session Hours; reject symbols outside Session assets and preserve instrument provenance |
| Multi-instrument gaps | missing or differently aligned comparison bars do not stall Replay; each Pane renders only source data at or before the shared cursor | retain; Bar Data identities stay instrument-specific and the coordinated snapshot may contain different final Pane timestamps |
| Persistence/provenance | layout intent persists separately from Replay truth; evidence and drillback retain instrument, timeframe, Session Hours mode, calendar revision, cursor and visible-through context | retain for R6/R7 and later Backtesting/Journal owners |

## V6 Evidence Used

Targeted product evidence, without loading historical session logs:

- `V6_PANE_LOCAL_RESET_VIEW_CONTROLS_STEP163.md`;
- `V6_PANE_ACTION_RAIL_STEP184.md`;
- `V6_REPLAY_TRANSPORT_CHAIN_REGRESSION_PACK_STEP245.md` and the modular
  transport presentation/controller sources;
- `V6_SETTINGS_TRANSACTION_DURABILITY_SELECTION_STEP409.md`;
- `V6_SETTINGS_CURRENT_PRICE_PRESENTATION_STEP415.md`;
- `V6_SETTINGS_SCOPE_CLOSEOUT_STEP417.md`;
- `V6_MULTI_PANE_CHART_FOUNDATION_STEP147.md`;
- `V6_MULTI_PANE_REPLAY_VIEWPORT_PROJECTION_STEP157.md`;
- `V6_MULTI_PANE_ACTIVE_FOCUS_CHAIN_STEP251.md`;
- `V6_ETH_RTH_SESSION_HOURS_PHASE_PLAN.md`;
- `V6_ETH_RTH_REPLAY_PROJECTION_PHASE_A3.md`;
- `V6_MULTI_INSTRUMENT_PANE_PHASE_PLAN.md`.

## Rejected V6 Implementation Patterns

- shell templates containing long-lived feature logic or authoritative state;
- UI-generated event chains used as transaction orchestration;
- one bridge/event fan-out per materialization stage;
- independent primary and secondary Pane mutation paths;
- direct Settings-to-chart-library calls;
- CSS-only ETH/RTH hiding;
- one Replay cursor, Session Hours mode, or transport per Pane;
- controls presented before their owner and real consumer exist;
- persisted layout state treated as Replay or evidence truth.

## Delivery Consequence

R5 does not repeat an ETH/RTH product-definition phase. R5.2 verifies the real
NQ/ES source timestamp and calendar facts, then implements the pure Session
Hours/calendar policy and inherited cursor/eligibility fixtures. Later R5
slices add atomic projection and the compact selector.

R6 inherits the multi-pane and multi-instrument interaction matrix after the
Session Hours gate. R7 inherits the Replay transport interaction matrix. A
future Settings step inherits the transactional modal rules. Human review is
still required when the real browser interaction or visuals change, but it
validates the implementation rather than reopening already-settled semantics.
