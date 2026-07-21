# Session — R6.4 Shared Replay Navigation Runtime

Date: 2026-07-21
Status: automated complete; no browser-visible change

## Boundary

Activated `core.replay-navigation-runtime` as a thin action/target router. It
does not reproduce V6's command/event coordinator. Workspace Transaction
Runtime remains the sole coordinator; Replay Runtime remains the sole cursor,
reveal, and playback owner; source traversal is injected; R6.3 remains the
complete Pane-set materialization path.

Replay Contract/Runtime now issue inert exact forward/backward/retain target
proposals. Workspace Transaction Runtime may await cancellable proposal
resolution and performs a currency check before Pane acquisition. Existing
synchronous proposal ports remain compatible.

## V6 Behavior Re-Derivation

Retained behavior:

- Previous is a complete replacement at the rewound cursor, never a rendered
  candle deletion;
- Autoplay uses the same eligible-source Next and cannot backlog overlapping
  work;
- GoTo targets every visible Pane and forward jumps preserve the complete
  revealed interval;
- quick GoTo uses five New York anchors and skips weekend/holiday candidates
  by checking nearby real source data;
- manual/default Viewport intent is passed through unchanged;
- failure pauses and preserves the last accepted state.

V6's command/event orchestration and UTC-like wall timestamp encoding are not
copied. V7 bars are already normalized to real instants, so New York candidates
are DST-aware real instants.

## Contract

- response-plan schema v2 binds the exact active Replay range;
- Manual Next/Previous and quick GoTo resolve only through the Session primary
  instrument's cancellable source-traversal port;
- exact GoTo and Restart/Back-to use their requested exclusive cutoff directly;
- exact GoTo at the current cursor is a no-op with no Pane request or
  transaction;
- every other action invokes one complete Pane-set transaction;
- mixed Pane instruments/TFs retain one proposal and one visible commit;
- primary-instrument Projection provenance supplies shared Replay
  `visibleThrough`; empty comparison Panes do not stall;
- overlaps return `navigation-in-flight` without queuing;
- any non-committed terminal result pauses playback and preserves accepted
  Replay/workspace/chart state;
- R6.4 exposes one Autoplay step but creates no timer or cadence loop.

## Evidence

- `node v7/tests/replay-navigation-runtime-harness.js` passes Manual
  Next/Previous, one-step Autoplay, Restart/Back-to, exact forward/backward/noop
  GoTo, all five quick anchors, DST, weekend skipping, mixed NQ/ES and
  `1m`/`4h`, comparison-Pane absence, complete range/replacement intent,
  overlap suppression, failure pause/preservation, and 20 negative/race
  controls;
- Replay Contract/Runtime, R6.2 response, R6.3 materialization, Workspace
  Transaction, architecture, module-host, source-quality, and full non-browser
  Harness gates pass;
- `git diff --check` passes.

## Continuation

R6.5 mounts the real one-to-many Pane browser composition and Replay/GoTo
surfaces over these owners. It changes interaction and visuals, so it must stop
for the combined manual acceptance gate. Economic Calendar remains a later
optional business module.
