# Session 2026-07-14 - Step 432 Compact Replay Status Verification

## Outcome

Completed automated semantic and responsive verification for compact Replay
status. Human visual acceptance remains the Phase 5 closing gate.

## Coverage

- initial preparing state;
- ready, playing, paused, complete, and restarted real Transport flows;
- future-protection visibility and versioned diagnostic state;
- `1024x720`, `1440x900`, and `1920x1080`;
- single, two-Pane, and three-Pane layouts;
- Replay Transport clearance above the status row;
- Replay domain/runtime, Restart, Session, Go-to, history loading, layout, App
  Shell, and product screenshot regressions.

## Correction

The layout test found that `min-height: 30px` still produced a 35px content-box
row after padding. The status row now uses border-box sizing and tighter
vertical padding, keeping the rendered height within 32px.

The Pane status-background regression now asserts zero alpha rather than an
irrelevant RGB triplet carried by a fully transparent configured color.

## Human Visual Gate

Confirm that `Replay ready` and `Future data hidden` are readable but quiet,
remain on one line, and do not compete with or overlap the floating Replay
Transport in representative single-, two-, and three-Pane layouts.

## Next

After visual acceptance, close Phase 5 and execute Step 433 cleanup-residue and
obsolete-test consolidation.
