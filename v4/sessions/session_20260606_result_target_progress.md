# 2026-06-06 - Step 264 Result Target Progress

Goal:

- Keep `Result` as the highest/final market outcome for an order setup.
- Add a derived target ladder so `Target 3` also makes `Target 1` and
  `Target 2` visible as reached, and `Target 2` also makes `Target 1` visible
  as reached.
- Allow trade execution notes per target so partial profit-taking is visible
  without weakening the final `Result` meaning.

Plan:

1. Step 264.1: Add a reusable target progress model derived from setup
   targets, entry, stop loss, and `resultReview.result`.
2. Step 264.2: Show Target Progress in the Order Setup Inspector Result panel,
   including each target's hit state, price, points, R, and execution action.
   Persist only user execution actions under `resultReview.targetActions`.
3. Step 264.3: Reflect hit / partial / final state in chart target labels and
   run validation.

Execution rules:

- Each sub-step gets its own commit.
- Existing unrelated workspace dirt must not be staged.
- The existing `Result` enum and auto-exit behavior should remain compatible.

Result:

- Step 264.1 committed in `648b2b1`: added `order/target-progress.js` and
  exposed `orderElements.targetProgress` from setup sets. The model derives
  reached/final/points/R for Target 1-3 from entry, stop loss, setup targets,
  and `resultReview.result`.
- Step 264.2 committed in `693d757`: normalized and persisted
  `resultReview.targetActions`, added Inspector Target Progress rows under
  Result, and allowed per-target execution action selection:
  None / Partial / Final / Manual Exit.
- Step 264.3: chart target labels now include target progress state such as
  `Target1 - Hit`, `Target2 - Partial`, or `Target3 - Final`.

Verification:

- Target progress module smoke verified Target 2 implies Target 1 reached and
  Target 3 pending.
- Explicit `None` target action overrides the default final action.
- `node --check` passed for touched order modules.
- `git diff --check` passed for touched files.
- Headless Chrome loaded `http://127.0.0.1:8001/index.html` without boot
  failure.
