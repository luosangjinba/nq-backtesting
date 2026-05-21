# V4 Inspector Sidebar MVP Session

## Branch
- `feature/v4-inspector-sidebar`
- Follow-up persistence work was split into `feature/v4-pda-local-storage`.
- Both branches were merged back to `main`.

## Goal
- Start Phase 4 with the smallest usable selection-to-sidebar chain.
- Do not add editing yet.
- Keep the sidebar generic enough to reuse beyond PDA later.

## Completed
- Added store helpers in `v4/src/pda/pda-store.js`:
  - `getAnnotationById(id)`
  - `updateAnnotation(id, patch)`
  - `replaceAnnotation(id, nextAnnotation)`
  - `deleteAnnotation(id)`
- Added `v4/src/pda/pda-selection.js`.
  - Tracks current selected PDA as `{ kind: 'pda', id, type }`.
  - Emits `pda:selected` and `pda:selection-cleared`.
  - Left click on chart selects a hit PDA.
  - Blank chart click clears selection.
  - Escape clears selection.
- Added `v4/src/pda/pda-hit-test.js`.
  - Liquidity line hit-test uses price-line pixel tolerance and rendered line span.
  - Range hit-test uses rendered rectangle bounds.
  - EQH/EQL hit-test uses reference line and point-set marker positions.
  - Draft point-set annotations are ignored.
- Added `v4/src/ui/inspector-sidebar.js`.
  - Dynamically creates `#inspector-sidebar`.
  - Opens when a PDA is selected.
  - Close button hides the sidebar without deleting selection.
  - Shows read-only fields for point, range, and point-set annotations.
- Updated page layout:
  - `v4/index.html` now has a `#workspace` wrapper and `#chart-area`.
  - The inspector is appended to `#workspace` as a flex sibling of `#chart-area`.
  - Opening the inspector takes right-side layout width and shrinks the chart area instead of overlaying the canvas.
- Wired selection and inspector initialization in `v4/src/app.js`.
- Added sidebar styling in `v4/style.css`.
- Added selected-PDA visual feedback:
  - `pda-renderer.js` listens to `pda:selected` and `pda:selection-cleared`.
  - Selected PDA labels are prefixed with `●`.
  - Selected line/range/point-set primitives use `#f0f3fa` highlight and slightly stronger stroke/marker sizing.
  - Inspector shows the same `● TYPE` indicator in the selected PDA metadata.
- Added first edit controls:
  - `Delete PDA` removes the selected annotation and clears selection.
  - `Note` writes to `annotation.note`.
  - `Extend` writes to `annotation.display.extendBars`.
- Added display extension support:
  - BSL/SSL line length uses `display.extendBars`, defaulting to 8 bars.
  - Range rectangles extend visually to the right by `display.extendBars`.
  - EQH/EQL point-set reference lines extend visually to the right by `display.extendBars`.
  - Original structural fields such as `startTime` / `endTime` are not rewritten.
  - Hit-test uses the same extended display spans.
- Added EQH/EQL point-set editing:
  - Point rows in the Inspector now include `Remove`.
  - Removing a point rewrites `annotation.points`.
  - EQH reference price recalculates to the highest remaining point.
  - EQL reference price recalculates to the lowest remaining point.
  - Context count is updated after removal.
  - If fewer than two points remain, the entire set is deleted and selection is cleared.
- Added right-click append for selected EQH/EQL:
  - Select a completed EQH/EQL set.
  - Right-click another bar.
  - The menu shows `Add to Selected EQH/EQL`.
  - Adding rewrites the selected annotation points, recalculates reference price, and refreshes the Inspector.
  - Duplicate timestamps are rejected with a status warning.
- Added browser-local PDA persistence:
  - `v4/src/pda/pda-persistence.js` saves non-draft PDA annotations to `localStorage`.
  - Storage key is `v4:pda-annotations:NQ`.
  - App startup restores saved annotations through `loadAnnotations()`.
  - Draft annotations, hover state, selection state, and replay state are not persisted.
  - Inspector empty state includes `Clear Saved PDA` for clearing the browser-local draft.

## Current Behavior
- After marking a PDA, left-click near the rendered PDA selects it.
- Inspector opens on the right and displays:
  - common PDA metadata
  - contexts
  - validation where present
  - point/range/point-set details based on annotation shape
- Clicking blank chart space or pressing Escape clears the selection.
- Closing the sidebar only hides the panel; it does not delete annotations.
- The sidebar does not cover the chart canvas; it pushes the chart area left by occupying layout width.
- The selected chart PDA is visibly linked to the Inspector without adding blocking overlays.
- Sidebar edits update the in-memory PDA store and redraw immediately.
- EQH/EQL point removal redraws the point-set line, markers, spread, and Inspector fields immediately.
- Appending a point to the selected EQH/EQL set keeps the same selected annotation active.
- Manual PDA annotations survive a page refresh in the same browser profile.
- Local persistence is a working-draft layer only, not the formal research database.

## Not Included
- No database persistence.
- No YAML/export workflow yet.

## Verification
- `node --check v4/src/pda/pda-store.js`
- `node --check v4/src/pda/pda-selection.js`
- `node --check v4/src/pda/pda-hit-test.js`
- `node --check v4/src/ui/inspector-sidebar.js`
- `node --check v4/src/pda/pda-persistence.js`
- `node --check v4/src/pda/pda-renderer.js`
- `node --check v4/src/chart/primitives.js`
- `node --check v4/src/app.js`
- `git diff --check`
- Headless Chrome load check for `http://127.0.0.1:8001/v4/index.html`

## Next
- Design export/import or YAML review archive once local draft persistence is stable.
- Consider a small undo action for the last point edit if manual grouping becomes frequent.

## Merge Notes
- `feature/v4-inspector-sidebar` ends at `03b71d1 feat(v4): append points to selected EQH EQL`.
- `feature/v4-pda-local-storage` adds:
  - `be5fc94 docs(v4): document local PDA persistence plan`
  - `fbd2a49 feat(v4): persist PDA annotations locally`
- `main` merge commits:
  - `d85d1b4 merge: v4 inspector sidebar`
  - `315497f merge: v4 PDA local storage`
- Current recommended next branch: `feature/v4-pda-export-import`.

## Persistence Decision
- First persistence layer will be browser `localStorage`.
- It is treated as working-draft persistence, mainly to prevent losing manual PDA work on refresh.
- Do not create a database schema yet.
- Do not write to DuckDB / v2 `pda_registry` from V4 in this step.
- Do not persist draft annotations, hover state, selection state, or replay state.
- YAML/export is reserved for future review archive workflows.
- Database persistence is reserved for future confirmed research assets, multi-device use, statistics, and querying.
