# V7 R5.4 Atomic Workspace Replacement — 2026-07-20

## Outcome

Completed the headless registered timeframe/Session Hours replacement path over
the existing Workspace Transaction Runtime. Replacement keeps source cursor
truth separate from mode-specific visible-through.

## Boundary

Added `core.workspace-replacement-runtime`, Replay retention proposals, and
explicit Projection provenance for Session Hours mode and source-level
visible-through. No UI, toolbar, real provider, persistence, multi-pane, or
playback timer was added.

## Evidence

- ETH→RTH cursor `03:01` retained with visible-through `16:14` on the prior day;
- RTH `1h` last candle `15:30` remains distinct from source visible-through
  `16:14`;
- acquisition failure preserves the exact accepted Workspace/Replay/chart
  references and revisions;
- slow-old/fast-new acquisition and presentation reorder cases commit only the
  newest complete identity;
- 11 replacement negative controls plus Replay, Projection, Session Hours,
  fixed-timeframe, Workspace Transaction, browser, architecture, and source
  quality regression gates;
- `git diff --check`.

This headless step changes no browser interaction or visuals, so automated
acceptance applies. R5.5 is the next human-reviewed compact control slice.
