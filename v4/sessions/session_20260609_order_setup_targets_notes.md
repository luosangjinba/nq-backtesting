# 2026-06-09 - Order Setup Targets, Notes, and Context Menu Follow-up

Goal:

- Close recent Order Setup chart workflow refinements after Fib level controls.
- Reduce chart note visual interference while keeping per-note guide visibility.
- Expand Order Setup target semantics and keep Result review synchronized with
  the execution targets actually present on the setup.

Completed:

- Chart Notes:
  - Added per-note guide visibility controls so notes default to a cleaner
    chart view without dashed guide lines, range fill, or range side lines.
  - Synchronized chart double-click guide toggling with the Inspector Chart
    Notes checkbox.
  - Range notes now show both start and end times in the Inspector.
  - Refined selected-note feedback from heavy border treatment to a red center
    anchor dot.
  - Restyled chart note labels with no fill, dark-gold border/text, and a
    split time/note layout separated by a thin vertical divider.
- Economic Events / Order Setup details:
  - Added a one-note detail page for each Economic Event.
  - Added a Summary note field to each Order Setup detail page.
- PDA / range drawing:
  - Updated OB and Breaker endpoint logic so bullish ranges use first-bar high
    to last-bar low, while bearish ranges use first-bar low to last-bar high.
  - Adjusted visual colors: Bullish FVG to soft yellow, IFVG to soft purple,
    and Range Note to a lighter gray.
  - Removed Escape as a shortcut for leaving Replay mode, preserving Escape for
    canceling pending Fib/OB draft start workflows.
- Order Setup context menu:
  - Added Shift-only `Set All End Here` before the individual end commands.
    This updates entry, stop loss, and target ends together; MSS end is
    intentionally excluded.
  - Added MSS (`Market Structure Shift`) as an Order Setup line element with
    the same placement pattern as entry/stop/target and gray line styling.
  - Moved long target commands into a third-level Targets submenu so the
    second-level Order Setup menu stays usable.
  - Reworked nested submenu positioning and open/close behavior so second- and
    third-level menus are not clipped by the chart frame and do not disappear
    merely because the pointer leaves the submenu area.
- Target semantics:
  - Expanded target labels to:
    - `Target Internal 1`
    - `Target Internal 2`
    - `Target Internal 3`
    - `Target Swing Point`
    - `Target External 1`
    - `Target External 2`
    - `Target External 3`
  - Replaced prior `Target External The Best` wording with
    `Target External 3`.
  - Updated Result Review target options so the Result dropdown only exposes
    target outcomes that exist in the current setup execution target list.
  - If a saved result points to a target no longer present in execution, the
    Inspector shows that stale target as a disabled selected option instead of
    silently changing the saved result.
  - Changed Target Progress execution action options to:
    `None / Fruit / Neutral / Best`.

Commits:

- `3c60baf feat(v4): add economic event notes`
- `35c0781 feat(v4): add order setup summary note`
- `4a39aba feat(v4): add chart note guide toggles`
- `c6720eb style(v4): refine chart note label design`
- `f652409 style(v4): use soft purple for IFVG`
- `23ae676 fix(v4): use endpoint prices for OB ranges`
- `df37095 feat(v4): expand order setup target menu`
- `57d0a73 fix(v4): keep context submenus open`
- `47e4c29 fix(v4): sync result targets with execution`

Verification:

- Targeted `node --check` runs for modified Order Setup, chart note, PDA, and
  Inspector modules were run during the individual changes.
- Targeted smoke tests included:
  - `node v4/tests/order-setup-smoke.js`
  - `node v4/tests/order-review-types-smoke.js`
  - Fib level smoke tests for the level-control follow-up
- `git diff --check` passed for the recent changes before commit.

Current status:

- Local `main` is ahead of `origin/main` by three commits:
  - `df37095 feat(v4): expand order setup target menu`
  - `57d0a73 fix(v4): keep context submenus open`
  - `47e4c29 fix(v4): sync result targets with execution`
- Workspace still contains unrelated untracked local/runtime files; they were
  intentionally left out of commits.
