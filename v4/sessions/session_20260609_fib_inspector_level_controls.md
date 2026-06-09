# 2026-06-09 - Step 276 Fib Inspector Level Controls

Goal:

- Add per-instance Fib level controls in the Inspector.
- Let each Fib annotation control which levels render, the level values, and
  the line colors.
- Keep the first version scoped to the current Fib instance; do not add a
  global template save/apply system yet.

Branch:

- `feature/v4-fib-inspector-level-controls`

Completed:

- Added `v4/src/pda/fib-levels.js` with Fib level defaults, normalization,
  update helpers, visible-level filtering, and ratio bounds.
- New Fib annotations now receive a full level preset instead of only the old
  seven fixed lines.
- Legacy Fib annotations are normalized so old short `levels[]` data still
  works and can be edited from the Inspector.
- Inspector Fib detail now renders editable level rows with:
  - visible checkbox
  - ratio input
  - color input/swatch
  - Reset Levels action
- Renderer, hit-test, flash geometry, segment/reaction metrics, and archive
  import paths now use normalized visible Fib levels.
- Ratio edits are validated to the range `-12` to `12`; invalid edits show an
  error and restore the previous valid value.
- Edited rows preserve their row identity during normalization, so changing the
  first default row from `1` to another value does not re-add another `1`.
- Context-menu submenus now reposition inside the chart container so nested
  menus do not get clipped by the bottom edge.
- Default Fib preset was finalized to:
  - checked: `1/0.79/0.705/0.62/0.5/0.236/0`
  - unchecked: `-0.272/-0.62/-1/-1.5/-2/-2.5/-3/-3.5/-4/1.5/2/2.5/3.5/4/4.5/5/6`

Commits:

- `1f295a5 feat(v4): define fib level model`
- `9aefcfb feat(v4): add fib level preset helpers`
- `b302264 feat(v4): create fibs with full level preset`
- `02932a3 fix(v4): normalize legacy fib levels`
- `7ef33ed feat(v4): render editable fib levels`
- `89facb8 feat(v4): update fib levels from inspector`
- `bb0f4d0 fix(v4): avoid redundant fib level history`
- `91db9c1 feat(v4): reset fib levels from inspector`
- `3e566ae test(v4): verify fib level visibility controls`
- `5851d64 fix(v4): validate editable fib ratios`
- `8c33c89 fix(v4): preserve edited fib level rows`
- `21038ae fix(v4): keep context submenus within chart`
- `2931854 fix(v4): update default fib target levels`

Verification:

- `node --check v4/src/pda/fib-levels.js`
- `node v4/tests/fib-levels-smoke.js`
- Full `v4/tests/*.js` smoke run passed.
- `git diff --check`

Notes:

- The workspace still contains unrelated untracked local/runtime files; these
  were intentionally excluded from commits.
- No global Fib template persistence has been implemented.
