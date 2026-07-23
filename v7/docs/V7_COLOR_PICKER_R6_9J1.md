# V7 Color Picker — R6.9j1

## Decision

V7 owns the user-facing color picker. `vanilla-colorful@0.7.2` is exact-pinned
and used only for the optional precise saturation/hue/alpha editor. It does not
own Settings state, persistence, popup lifecycle, palette, recent colors, or
Save/Cancel semantics. This keeps the small dependency replaceable and avoids
coupling the long-lived Workstation Settings contract to a widget library.

## Ownership

- `core.workstation-settings/color-value` normalizes colors to `#RRGGBBAA`;
- `core.workstation-settings/color-history-store` owns one global, bounded,
  non-transactional recent-color record;
- `ui.replay-workspace/color-picker-control` owns DOM, palette, opacity,
  precise-editor expansion, focus, outside-click, and Escape behavior;
- `ui.replay-workspace/workstation-settings-dialog` owns the draft and records
  touched colors only after its Settings Save is accepted;
- the chart adapter remains the sole writer of native series presentation.

## Durable Contracts

Workstation Settings schema version 3 stores all six candle colors as lowercase
eight-digit hex-alpha. Version-2 six-digit values migrate by appending `ff`.
The separate recent record has schema `v7.color-history`, version 1, and keeps
at most eight normalized, deduplicated values in most-recent-first order.

Recent history is a convenience, not Settings authority. Its write failure is
ignored after a successful Settings transaction; it cannot undo the accepted
chart presentation. Draft edits, Cancel, close, Escape, backdrop dismissal, and
rejected Settings Saves never update history.

## Acceptance

The focused harnesses cover schema migration, normalization, deduplication,
bounded persistence, reconstruction, draft isolation, cross-Session restore,
real Lightweight Charts alpha mapping, and pixel fixtures for the Settings
dialog and expanded color picker.
