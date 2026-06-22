# Clear Handoff: 2026-06-22

## Current Branch

- Branch: `feature/comparison-window-mvp`
- Latest commit before handoff: `fd27de3 Migrate old sliding geometry to left side`
- Worktree status before this handoff note: clean.

## Current Product State

Comparison Window is the active replacement surface for old Split.

Current intended layout:

- Comparison Window is on the left.
- Main chart remains on the right.
- Comparison right boundary is draggable.
- Dragging the boundary clips the visible Comparison area.
- Comparison chart internals stay full-width/left-aligned and should not rescale because the boundary moved.
- Main chart native right-side price scale should remain visible.
- Comparison boundary has its own read-only comparison price-axis strip.

Persistence migration rules:

- Legacy `floating` layout is forced to `sliding`.
- Replay History comparison layout is forced to `sliding`.
- Old right-side sliding geometry such as `x=34,width=66` is migrated by pinning `visibleWindow.x=0`.
- User should not need to clear browser localStorage for the left-side orientation to apply.

## Important Recent Commits

- `fd27de3 Migrate old sliding geometry to left side`
- `0bb888f Place comparison window on left side`
- `148348f Show primary price axis beside sliding comparison`
- `a37aba4 Migrate comparison window to sliding layout`
- `200efe0 Document sliding comparison window`

## Verification Already Run

Latest focused verification passed:

```bash
node v4/tests/comparison-window-browser-smoke.js
node v4/tests/comparison-window-store-smoke.js
node v4/tests/comparison-window-persistence-smoke.js
node v4/tests/replay-history-comparison-smoke.js
git diff --check
```

The Node module type warning is existing noise and was not introduced by the latest change.

## Clear Resume Checklist

After context clear, resume by:

1. Run `git status --short`.
2. Confirm latest commit is at least `fd27de3`.
3. Start/refresh the app.
4. Verify `Compare` opens Comparison on the left and Main remains on the right.
5. If the UI still appears old, inspect the served file/version first, not localStorage first:
   - confirm the browser is loading this branch;
   - hard refresh or restart the local static server if needed;
   - then inspect `localStorage["v4:comparison-window:workspace"]`.

## Likely Next Step

If user confirms the left-side sliding layout works, proceed to a real-use audit:

- NQ 1H main + NQ 1H comparison render;
- NQ/ES cross-instrument render;
- 1M/1H cross-timeframe render;
- right-boundary drag;
- context menu create PDA/Segment;
- Drawing Sync/No Sync behavior;
- Replay History restore.

