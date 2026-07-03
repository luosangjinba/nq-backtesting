# Step 491 - V5 Workstation Decision Backlog

Date: 2026-07-03

Status: completed

## Goal

Consolidate recent conversation decisions into stable V5 plan/spec
documentation so future implementation work does not depend on chat memory.

## Plan

- [x] Add a routing spec for recent workstation decisions.
- [x] Update the V5 spec index and documentation index.
- [x] Update TODO and roadmap rules so future plans reference the documented
      decisions.
- [x] Point detailed specs back to the new routing document where useful.
- [x] Run documentation checks and commit.

## Decisions Captured

- V5 is open-source/local-first, not SaaS-first.
- New chart/workstation plans must check Lightweight Charts docs and
  awesome-tradingview references before custom implementation.
- Multi-pane layout keeps one active pane, one shared TF control, pane-local TF
  by default, and sync only through modeled toggles.
- Every real chart pane should keep equivalent chart chrome: OHLC, TF, price
  axis, time axis, reset view, active-pane state, and crosshair behavior.
- Split-pane sizing uses responsive ratios and minimum pane walls, not fixed
  pixel layout state.
- Replay runtime remains the cursor/reveal owner; bar-data runtime remains the
  only bars requester; chart runtime remains the only chart writer.
- Rapid replay stepping should stay responsive through coalesced commands,
  reveal-before-persist behavior, and append/update paths when safe.
- Reset view restores both latest replay time/follow state and price visibility.
- Settings and UI polish flow through draft state, active-pane scope, semantic
  tokens, and browser/screenshot checks.
- V4 may be used as behavior/performance reference, but V5 must keep its own
  runtime ownership model.

## Files Updated

- `v5/docs/specs/workstation-decision-backlog.md`
- `v5/docs/specs/README.md`
- `v5/docs/INDEX.md`
- `v5/docs/V5_PHASE_ROADMAP.md`
- `v5/docs/specs/layout-split-panes-contract.md`
- `v5/docs/specs/workstation-visual-system.md`
- `v5/TODO.md`
- `v5/sessions/README.md`

## Non-Goals

- No runtime code changes.
- No new chart, layout, replay, Settings, or deployment implementation.
- No dependency changes.

## Checks

- Passed: `git diff --check`
