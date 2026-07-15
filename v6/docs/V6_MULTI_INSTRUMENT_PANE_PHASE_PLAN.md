# V6 Multi-Instrument Pane Phase Plan

## Decision

V6 should support different instruments in different visible chart panes when
the instruments belong to the active Replay Session. This directly supports
SMC/ICT intermarket comparison such as NQ/ES SMT divergence.

The capability must use one shared Replay clock and pane-local instrument
intent. It must not create a Replay runtime, cursor, session, or order timeline
per pane.

This plan records the accepted delivery shape. It does not preempt Step 469
human acceptance or the Step 470 modularity audit, and it does not authorize
arbitrary out-of-session instruments.

## Product Contract

- A Session owns an ordered, non-empty `symbols` asset set and one primary
  `symbol`.
- Every pane owns its own `instrument` and `displayTimeframe` intent.
- All panes observe the same Replay cursor and visible-through boundary.
- A pane may select only an instrument present in the active Session's assets.
- Symbol sync off changes only the targeted pane; symbol sync on fans the
  source instrument to the other visible panes.
- Missing bars do not stall Replay. Each pane may display only bars whose
  source time is at or before the shared cursor.
- Orders, observations, evidence, screenshots, and drillback descriptors must
  retain the instrument that produced their chart context.

The primary Session symbol remains the default pane instrument and the initial
Replay source-clock authority. A later change to clock authority requires a
separate product and architecture decision.

## Existing Readiness

The current foundation already provides:

- pane records with independent `instrument` and `displayTimeframe` fields;
- `pane.setSymbolIntent` and pane-scoped symbol events;
- explicit layout symbol-sync preference and fan-out planning;
- pane-intent reload orchestration;
- Bar Data windows and cache identity that include instrument and timeframe;
- Replay materialization paths that prefer `pane.instrument` over the Session
  fallback symbol;
- active-pane toolbar and pane-local status presentation boundaries.

The remaining work is therefore a bounded product completion rather than a new
chart or Replay ownership model.

## Phase A - Contract And Gap Semantics

Define and test the canonical multi-instrument rules before adding UI.

Deliverables:

- a pure domain policy that validates pane instruments against
  `session.symbols`;
- an explicit shared-wall-clock rule for missing or differently aligned bars;
- a documented primary-symbol clock authority;
- provenance requirements for instrument-bearing validation artifacts;
- rejection behavior for empty, unsupported, or out-of-session symbols.

Gate:

- policy tests cover NQ/ES, out-of-session rejection, a missing timestamp, and
  no-future behavior;
- no Session, Replay, Bar Data, or Chart owner is bypassed;
- no per-pane Replay state is introduced.

## Phase B - Runtime Enforcement And Pane Reload

Make existing pane-local symbol intent safe under a real active Session.

Deliverables:

- resolve the active Session asset set at the command/orchestration boundary;
- reject invalid pane symbol intent before it reaches Bar Data;
- reload only the targeted pane when symbol sync is off;
- retain the existing coordinated fan-out when symbol sync is on;
- preserve Replay cursor, reveal state, playback state, and every unaffected
  pane's viewport intent;
- keep instrument/timeframe cache identity isolated.

Gate:

- main=NQ and secondary=ES materialize from one shared cursor;
- changing secondary ES to NQ does not replace main-pane data when sync is off;
- sync-on fan-out updates every visible target exactly once;
- Play, Pause, Next, Previous, Restart selection, and Go-to retain one Replay
  owner and the no-future invariant.

## Phase C - Active-Pane Instrument UI

Expose the capability without making the top toolbar a state owner.

Deliverables:

- an active-pane instrument control backed by Session Assets;
- pane headers that continue to show pane-local instrument and timeframe;
- accessible keyboard, focus, escape, and outside-click dismissal behavior;
- clear disabled or empty behavior when no eligible Session asset exists;
- symbol-sync wording that distinguishes same-symbol multi-timeframe use from
  intermarket comparison.

Gate:

- selecting ES while the secondary pane is active changes only secondary when
  symbol sync is off;
- switching active panes updates the control without issuing a symbol command;
- the selector never offers assets outside `session.symbols`;
- menus do not obscure persistent workstation controls after focus moves away.

## Phase D - Workspace Persistence And Re-entry

Persist presentation intent separately from Replay and validation source truth.

Deliverables:

- a versioned workspace/layout projection for pane instrument, timeframe,
  layout mode, active pane, and sync preferences;
- safe fallback to the Session primary symbol when a stored instrument is no
  longer in the Session asset set;
- deterministic restoration after hard reload and Session re-entry;
- copy-session behavior that does not accidentally inherit stale pane state.

Gate:

- a mixed NQ/ES layout survives hard reload with the same pane identities;
- Replay resumes at the persisted Session cursor independently of layout
  restoration;
- removed assets fall back safely without corrupting stored Session data;
- persistence migration and repository tests pass from the previous schema.

## Phase E - Validation Provenance And Drillback

Close the loop from multi-instrument observation to raw chart context.

Deliverables:

- verify or extend instrument provenance on evidence, trade-plan references,
  simulated execution context, screenshots, and journal links;
- restore the correct pane instrument before evidence drillback navigation;
- disclose when an artifact's instrument is no longer available in the current
  Session asset set;
- preserve immutable source facts even if the current workspace layout differs.

Gate:

- an ES observation captured beside an NQ primary pane drills back to ES at the
  original timeframe and timestamp;
- campaign statistics retain stable raw-source identity;
- drillback cannot reveal future bars or silently substitute the primary
  symbol.

## Phase F - Browser Acceptance And Performance

Validate the complete workflow under real chart timing.

Required scenarios:

- NQ 1m plus ES 1m;
- NQ 1m plus ES 5m;
- two- and three-pane layouts with symbol sync both off and on;
- missing-bar and session-boundary behavior;
- Play, manual Next/Previous, Restart rewind, Go-to, hard reload, and evidence
  drillback;
- rapid active-pane and instrument switching without stale data winning a race.

Gate:

- canonical, exhaustive Node, static architecture, and focused browser suites
  pass;
- visible-candle latency remains within the existing accepted budget;
- no pane displays a bar later than the shared Replay cursor;
- no stale request replaces data after a newer pane intent;
- human acceptance confirms that NQ/ES comparison is clear without explaining
  internal runtime concepts.

## Explicit Non-Goals

- independent Replay cursors or playback controls per pane;
- multiple Sessions mounted in one workstation;
- placing orders against an arbitrary comparison instrument without an explicit
  trading-context decision;
- synthetic spreads, overlays, ratios, or merged price scales;
- automatic SMT detection;
- unrestricted symbol search outside the Session asset set;
- weakening the shared-owner or visible-latency gates.

## Delivery Order

Complete the phases in order. Phase A is the first selectable implementation
slice after the active milestone gates permit new chart-foundation work. Each
phase should close as an independently verified commit; do not combine the UI,
persistence migration, and validation drillback into one step.
