# V6 Blind Trial Coordinator — Step 464

Status: complete (2026-07-15)

## Scope

Step 464 adds the command/event coordinator that starts and resumes a persisted
validation trial against Replay's published no-future state. It adds no UI,
observation, trade plan, execution, outcome, Analytics, Semantic Drawing, or
operating-mode behavior.

## Ownership

- Replay remains the only owner of session, cursor, reveal, and playback state.
- Validation Repository remains the only durable writer of trial records.
- Blind Trial Coordinator reads `REPLAY_COMMANDS.GET_STATE`, invokes repository
  methods, and publishes workflow results.
- The coordinator imports neither Replay implementation/domain nor chart,
  viewport, Bar Data, adapter, DOM, or shell modules.
- It never loads, advances, rewinds, pauses, plays, or navigates Replay.

## Public Contract

Commands:

- `blindTrial.start({ trialId })`;
- `blindTrial.resume({ trialId })`;
- `blindTrial.getState()`.

Events:

- `blindTrial:started`;
- `blindTrial:resumed`;
- `blindTrial:rejected`.

The runtime state is transient workflow state. The trial and its provenance are
durable repository truth.

## Start Invariants

Starting a blind trial requires:

- an existing pending trial;
- an active parent campaign;
- a loaded, non-ended Replay session;
- canonical `sessionId`, `cursorTime`, `cursorIndex`, and `revealedCount` from
  Replay's public state;
- `revealedCount === cursorIndex + 1`;
- `visibleThroughTime === cursorTime`.

The repository binds these values and moves the trial from pending to active in
one transaction. A reserved `replaySessionId`, when present, must match.

## Resume Invariants

Resume reloads an active trial from the repository and reads current Replay
state. It rejects when:

- the trial is absent or not active;
- Replay is absent or ended;
- the loaded Replay session differs from the stored trial session;
- current Replay cursor precedes the stored start visible-through boundary.

Resume never rewrites the original start provenance and never moves Replay to a
stored position. This preserves both evidence integrity and Replay ownership.

## Closeout Evidence

- provenance/domain and transactional repository gates: passed;
- coordinator command/event and static ownership gates: passed;
- production runtime contribution and app-shell startup gates: passed;
- real Chromium IndexedDB close/reopen/resume gate: passed;
- canonical named suite: 14/14 passed;
- exhaustive offline Node suite: 398/398 passed;
- static architecture audit: 55/55 passed;
- exhaustive catalog before this closeout harness: 780/780 classified.

Step 465 may persist one generic prospective observation and evidence snapshot
through a separate owner. It must consume the active trial and published Replay
provenance without adding chart overlays or Semantic Drawing writes.
