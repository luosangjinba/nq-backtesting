# Session 2026-07-13 - Step 402 Go-to Semantic Correction

## Trigger

The user supplied FXReplay reference screenshots showing that the right-rail
`Go to` control navigates replay to configured day/session anchors and opens a
New York-time Custom Settings modal. This contradicted the loaded-window date
locator interpretation selected in Step 398 and implemented in Step 402.

## Rollback commits

- `45c27be3 Revert "test(v6): close loaded date locator acceptance"`
- `ef5f7d68 Revert "feat(v6): add active-pane loaded date locator"`
- `1c8ad5db Revert "feat(v6): define loaded-window date locator domain"`

The rollback used auditable revert commits and restored the original inert menu.

## Re-audit result

- Go-to is session-global Replay progression, not active-pane viewport movement.
- It intentionally advances cursor/reveal and rematerializes visible panes.
- V5's arbitrary datetime chart-navigation implementation is not a semantic or
  ownership template for this feature.
- Lightweight Charts offers final time-scale display APIs, not session schedule
  calculation or replay orchestration.
- Manual Next contains reusable gap/materialization behavior, but its large
  coordinator must be split behind a shared boundary before Go-to wiring.

## Decision

The binding correction and Step 403-407 implementation sequence are recorded in
`v6/docs/V6_GOTO_REPLAY_NAVIGATION_PLAN_STEP402.md`.

Next is pure schedule/preference work only. UI and replay orchestration remain
unmodified until their owners and shared materialization boundary are ready.
