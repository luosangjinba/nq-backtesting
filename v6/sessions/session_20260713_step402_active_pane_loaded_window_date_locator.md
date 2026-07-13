# Session 2026-07-13 - Step 402 Active-Pane Loaded-Window Date Locator

## Scope

Close the remaining post-entry date-range navigation gap with a visible active-
pane Go-to-time control over already-loaded chart bars only.

## Commits

- `35f120c0 feat(v6): define loaded-window date locator domain`
- `5307d2f1 feat(v6): add active-pane loaded date locator`
- Step 402 browser acceptance and documentation closeout: this commit.

## Result

- One shared locator domain handles every timeframe by reading the active
  pane's materialized bar timeline.
- The nearest real bar is selected by binary search and centered through Chart
  Viewport's manual-intent public boundary.
- Negative latest offsets are supported for legitimate navigation to older
  loaded bars, without weakening default-wall validation.
- The visible right-rail form uses explicit UTC input and reports loaded-window
  rejection without starting a fetch.
- Bar Data, Replay, source bars, and inactive-pane viewport state remain outside
  locator ownership.

## Verification

- Domain/runtime/input smokes passed.
- Locator browser acceptance passed.
- Right utility rail regression passed.
- App shell browser smoke passed.
- Chart viewport runtime smoke passed.
- `git diff --check` passed.

## Next

Run Step 403 human visual acceptance across representative low, fixed high, and
session-calendar timeframes, then decide whether missing-window loading is a
real next need or should remain deferred.
