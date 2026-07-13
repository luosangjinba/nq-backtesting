# Session 2026-07-13 - Step 409 Settings Transaction And Durability Selection

## Trigger

The user confirmed the Step 408 fixed-timeframe alignment visual recheck passed
and requested the next recommended step with a commit per substep.

## Audit

- Step 407/408 is formally closed.
- Phase 7 still requires Settings parity and persistence before Phase 8/9.
- Current Settings changes dispatch immediately; Cancel/close/Escape cannot
  discard them.
- Settings is memory-only, and no production consumer subscribes to its update
  events.
- Current visible/hidden fields do not form an honest working preference
  surface.
- Lightweight Charts already supplies time-axis and crosshair formatter hooks.
- awesome-tradingview contains no application Settings/persistence/time-input
  plugin that replaces V6 ownership.

## Decision

Selected Step 409 - Settings Transaction And Durable Preference Foundation.
It will establish a panel-local draft, atomic OK, discard semantics, a
versioned durable Settings owner, and real-consumer gating. It will reuse the
existing persistence boundary rather than add raw panel storage.

Step 410 will then add the global 12/24-hour presentation preference and shared
time formatter across chart, Go-to, Session, replay, and Journal.

## Verification

- `node v6/tests/next-settings-parity-selection-step409-smoke.js`
- `node v6/tests/global-time-format-settings-roadmap-smoke.js`
- `git diff --check`

## Next

Implement Step 409 in bounded commits, beginning with the versioned Settings
record and injected persistence/hydration boundary before changing modal UI.
