# V5 Session Handoff - Step 419 Remaining Settings Planning

Date: 2026-07-01

## Status

Step 419 is complete.

## Goal

Lock the remaining FXReplay Settings parity plan before implementing more
controls, so future Settings work stays inside V5 runtime ownership boundaries.

## Plan

Step 420 is the next implementation candidate and should stay limited to pure
time and label presentation:

- time-scale date format options;
- day-of-week label display;
- current symbol label display mode where V5 already owns the visible label;
- previous-day-close and high/low labels only if they can be rendered from
  existing display bars without additional bar requests;
- plus button visibility only if it maps to existing chart affordances without
  changing replay or bar-data state.

Step 421 is the later advanced chart-engine presentation step:

- price scale visibility/mode;
- scale placement;
- lock price-to-bar ratio;
- no-overlapping-label behavior;
- countdown to bar close;
- watermark;
- session breaks.

Deferred:

- Template dropdown save/apply behavior waits for presentation settings
  persistence design.
- Pane button visibility and pane-specific settings wait for split-pane
  ownership and active-pane sync planning.
- Any Settings item requiring additional historical bars must be planned through
  bar-data/replay ownership first.

## Invariants

- UI dispatches commands and subscribes to events.
- Presentation runtime owns Settings state and normalization.
- Chart runtime and chart-engine adapter own chart presentation application.
- Replay runtime remains the only owner of replay cursor and reveal state.
- Bar data runtime remains the only owner of `/v4/bars` requests and cache.
- Settings draft edits must remain route-local until `Ok`.

## Changes

- Updated `v5/TODO.md` with Step 419 and the Step 420/421 split.
- Updated `v5/docs/specs/chart-presentation-settings.md` with the remaining
  Settings parity staging rules.
- Updated specs and session indexes.

## Verification

- `git diff --check`

## Next Candidate

Step 420 - Time And Label Presentation.
