# Step 314: Comparison Window Context Menu Usability

Date: 2026-06-22
Branch: feature/comparison-window-mvp
Status: completed

## Context

During real UI testing of the Comparison Window, the right-click menu exposed several usability defects:

- the menu could appear to be unresponsive when it was hidden behind the chart canvas or clipped near the right/bottom edge;
- after adding compact-window scrolling, the `Order Setup Evidence` submenu was clipped by the scroll box;
- the submenu HTML existed but did not always initialize the shared PDA submenu hover/focus behavior.

This step fixes menu presentation only. It does not add new PDA, Segment, or Order Setup workflows.

## Goals

- Keep the Comparison Window context menu visible and clickable above the chart canvas.
- Keep the main menu inside the comparison chart viewport in compact floating-window layouts.
- Allow long menus to scroll without losing access to lower actions.
- Let `Order Setup Evidence` open like a TradingView-style floating submenu instead of being clipped by the parent menu box.
- Add browser coverage for menu reachability and submenu visibility.

## Non-goals

- Do not remove Split.
- Do not change active Order Setup evidence semantics.
- Do not migrate deferred advanced PDA workflows such as Fib, Breaker range drafts, or EQH/EQL Point Sets.

## Implementation

- `comparison-context-menu.js`
  - Adds chart-bound positioning for the comparison menu.
  - Applies max-height and `is-scroll-constrained` when the window is compact.
  - Initializes shared PDA submenu hover/focus behavior after each render.
  - Positions comparison submenu panels as fixed overlays within the comparison chart bounds, so parent menu scrolling does not clip them.

- `style.css`
  - Gives `.comparison-context-menu` an explicit z-index above the chart canvas.

- `comparison-window-browser-smoke.js`
  - Verifies the menu is present and reachable with `elementFromPoint`.
  - Verifies compact-window scroll constraint and vertical fit.
  - Verifies OB Last Bar stays disabled when right-clicking without a comparison bar.
  - Verifies `Order Setup Evidence` opens and the submenu panel itself is topmost/clickable.

## Verification

Passed:

- `git diff --check`
- `node v4/tests/comparison-window-browser-smoke.js`
- `node v4/tests/context-menu-position-smoke.js`

Known warning:

- Node still prints the existing `MODULE_TYPELESS_PACKAGE_JSON` warning for ESM-style smoke tests. This is test-environment noise and does not affect the result.

## Result

The Comparison Window context menu is now usable in compact floating layouts. The main menu scrolls when needed, while submenu panels float outside the scroll box and remain clickable.
