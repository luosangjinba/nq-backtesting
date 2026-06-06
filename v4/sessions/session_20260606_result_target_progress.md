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
