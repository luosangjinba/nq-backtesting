# V6 Workspace Placeholder Cleanup Plan - Step 418

Date: 2026-07-14

## Purpose

Execute the accepted placeholder cleanup without mixing product architecture,
runtime changes, or unrelated visual redesign. Every production batch is a
separate commit and can be reverted independently.

## Batch 1 - Clone Artifacts And Duplicate Entries

Remove:

- generic top Search;
- static `NQ-2018` layout name;
- disabled duplicate right-rail Journal;
- undefined right-rail Watch/spark.

Expected impact:

- `workstation-shell.js` markup;
- top/right toolbar CSS spacing;
- top-toolbar and right-utility parity tests;
- baseline screenshots.

Gate:

- functional top Journal still opens;
- Settings, layout menu, Go-to, and Session Settings remain reachable for their
  current state;
- no top/right toolbar overlap.

## Batch 2 - Session Settings Empty Panel

Remove the right-rail Session Settings entry, panel markup, disabled fields,
Template/Apply actions, and dedicated CSS. Preserve the Session Settings owner
contract documentation and domain tests after removing only production-selector
assertions.

Gate:

- Chart Settings and Go-to Custom Settings remain distinct and functional;
- no Session or Replay state changes;
- right rail collapses cleanly.

## Batch 3 - Reserved Tool Entries

Remove current production entries for:

- symbol search, comparison, Indicators, Undo/Redo, ETH/session hours,
  Screenshot, Theme, and Fullscreen;
- complete left Drawing rail;
- right-rail Object tree, Order, and News.

Preserve owner/domain contracts for future architecture work. Remove historical
tests only where they assert visible disabled selectors; keep semantic contract
and ownership assertions.

Gate:

- chart expands into reclaimed side space;
- multi-pane hosts, resize handles, pane actions, and pointer input remain
  correct;
- timeframe, layout, Settings, Replay, Journal, and Go-to remain reachable;
- supported desktop resolutions have no toolbar overflow.

## Batch 4 - Bottom Account/Trading Chrome

Remove Buy/Sell/Qty, Balance/Realized/Unrealized, and Analytics placeholder
markup plus dedicated CSS. Preserve account/trading owner contracts. Re-evaluate
Replay transport bottom positioning after the chart reclaims the bottom edge.

Gate:

- transport drag bounds and persisted position remain valid;
- footer and chart do not overlap transport;
- chart height and resize behavior update correctly;
- account/trading domain contracts remain owner-only and inactive.

## Batch 5 - Consolidation And Visual Acceptance

- remove orphan CSS and obsolete placeholder-only tests;
- update app-shell, product-baseline, multi-pane, and supported-resolution
  screenshot expectations;
- run chart, Replay, Go-to, Settings, Journal, layout, transport, and session-
  entry regression packs;
- perform human visual acceptance on single/two/three Pane layouts.

## Explicit Exclusions

- no changes to three-mode product architecture;
- no Trade Plan, Drawing, Order, News, Indicator, or analytics implementation;
- no runtime/contract deletion merely because an entry disappears;
- no dashboard cleanup in this workstation-scoped plan;
- no redesign of active controls beyond spacing required by reclaimed areas.

## Recommended Start

Begin with Batch 1 only. It contains unambiguous duplicate/clone artifacts,
has the smallest ownership risk, and provides a visual checkpoint before larger
rails and bottom chrome are removed.
