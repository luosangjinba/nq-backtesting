# V4 Structure Sets Focus Session

## Branch
- `main`

## Goal
- Make `Structure Sets` behave as a temporary drawing-set focus tool instead of a chart selection shortcut.
- Preserve the original chart display state until the same Structure Sets item is clicked again.
- Support focusing multiple segment/composite drawing sets at the same time.

## Previous Behavior
- Clicking a Structure Sets row called segment/composite selection.
- The selected structure and linked PDA became visible/highlighted through existing selection-driven display logic.
- Clicking blank canvas cleared selection, so hidden objects returned to hidden and highlight disappeared immediately.

## Implementation
- `v4/src/segment/drawing-set-list.js`
  - Added an independent in-memory active drawing-set key set.
  - Clicking a row now toggles that key instead of selecting the segment/composite.
  - First click still calls `viewport.locateTimestampRange()`; second click only clears that row's focus.
  - Multiple rows can remain active at the same time.
  - Active focus is cleared on `bars:cleared`.
- `v4/src/display/overlay-visibility.js`
  - Merges active drawing-set visibility into shared overlay visibility for secondary overlays.
  - Active drawing-set segment/composite ids are additive on top of Display Mode.
  - Linked PDA responses with `displayMode !== hidden` are temporarily visible and highlighted.
- `v4/src/segment/segment-renderer.js`
  - Primary chart renders active drawing sets even when Display Mode would otherwise hide them.
  - Active Structure Sets use amber highlight; normal chart selection remains white.
- `v4/src/pda/pda-renderer.js`
  - Primary chart renders and highlights PDA linked to active Structure Sets.
- `v4/src/segment/secondary-segment-renderer.js`
  - Secondary split-screen overlay mirrors active drawing-set segment/composite highlight.
- `v4/src/pda/secondary-pda-renderer.js`
  - Secondary split-screen PDA overlay now uses resolver highlight ids for active Structure Sets.
- `v4/src/ui/inspector-sidebar.js` and `v4/style.css`
  - Structure Sets rows render an `active` visual state and `aria-pressed`.

## Behavior
- Click Structure Sets row once:
  - temporarily shows the selected segment/composite set,
  - highlights it on chart,
  - highlights the row in Inspector,
  - temporarily shows/highlights its linked non-hidden PDA responses,
  - locates its time range.
- Click the same row again:
  - removes only that row's temporary focus.
- Click blank canvas:
  - clears ordinary chart selection,
  - does not clear Structure Sets focus.
- Click multiple rows:
  - all selected drawing sets remain focused until toggled off individually.

## Persistence
- No Review JSON schema change.
- No localStorage state added.
- Focus state is view-only and current-session only.

## Verification
- `find v4/src -name '*.js' -print0 | xargs -0 -n1 node --check`
- `git diff --check`
- `google-chrome --headless=new --disable-gpu --virtual-time-budget=8000 --dump-dom http://127.0.0.1:8001/index.html`

## Notes
- This preserves existing chart selection semantics for direct canvas clicks.
- Segment isolate still has higher priority than normal Display Mode and Structure Sets focus.
