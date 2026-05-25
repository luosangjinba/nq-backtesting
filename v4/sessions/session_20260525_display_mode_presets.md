# V4 Display Mode Presets Session

## Branch
- `research/v4-review-notes-design`

## Goal
- Reduce visual clutter from overlapping PDA, segment, and composite objects.
- Avoid a matrix of independent visibility toggles by using a small preset model.

## Presets
- `All`
  - Render all PDA, all atomic segments, and all composite moves.
- `Structure Only`
  - Render all atomic segments and composite moves.
  - Hide all PDA.
- `Selected PDA`
  - Render all atomic segments and composite moves.
  - Render PDA linked to the selected segment or selected composite move only.
- `Recent Workspace`
  - Render latest N segments and latest N composite moves.
  - Composite visibility also includes its child segments and target segment.
  - Selected segment/composite is additive even if it is outside latest N.
  - Render PDA linked to the visible/selected structures.

## Implementation
- Added `v4/src/display/display-mode.js`.
- Display mode is view-only and persisted to browser localStorage key `v4:display-mode:NQ`.
- It is not written into PDA annotations, market segments, composite moves, or Review JSON.
- Toolbar now has one `Display` preset select and one shared `N` input.
- Renderer and hit-test both use the same display mode predicates:
  - `shouldRenderPda`
  - `shouldRenderSegment`
  - `shouldRenderSegmentGroup`
- `Recent` ordering uses segment `end.timestamp`; composite ordering uses the latest child segment end timestamp.
- Segment isolate remains higher priority than display mode.

## Verification
- `node --check v4/src/display/display-mode.js`
- `node --check v4/src/ui/toolbar.js`
- `node --check v4/src/pda/pda-renderer.js`
- `node --check v4/src/pda/pda-hit-test.js`
- `node --check v4/src/segment/segment-renderer.js`
- `node --check v4/src/segment/segment-hit-test.js`
- `node --check v4/src/app.js`
- `bash -n v4/start.sh`

## Notes
- No PDA type-level filter was added.
- No Review JSON schema change.
