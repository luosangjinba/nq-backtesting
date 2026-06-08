# 2026-06-08 - Time Overlay No-op Guard Hotfix

Problem:

- Editing Daily Time Review detail fields could make the UI pause for several
  seconds before another input could receive focus.
- Console showed repeated `time-overlays:changed` handler errors ending in
  `RangeError: Maximum call stack size exceeded`.

Root cause:

- The event loop was synchronous and recursive:
  `time-overlays:changed -> refreshSelection() -> renderDailyTimeReviewDetail()
  -> setCalendarDateContext() -> updateTimeOverlaySettings({ selectedDate })
  -> time-overlays:changed`.
- `updateTimeOverlaySettings()` emitted `time-overlays:changed` even when the
  normalized `selectedDate` and all other settings were unchanged.
- Rendering the Daily Time Review detail therefore rewrote the same date and
  immediately re-entered the same render path.

Fix:

- Added a no-op guard in `time-overlays/time-overlay-store.js`.
- `updateTimeOverlaySettings()` now builds the normalized next settings first.
- If the normalized next settings are identical to the current settings, it
  returns the current settings without emitting `time-overlays:changed`.
- This preserves real overlay changes while stopping redundant same-value
  updates from recursively refreshing the Inspector.

Verification:

- `node --check v4/src/time-overlays/time-overlay-store.js`
- `node --check v4/src/ui/inspector-sidebar.js`
- `node v4/tests/calendar-visibility-smoke.js`
- `node v4/tests/order-setup-smoke.js`
- Inline smoke verified setting the same `selectedDate` twice emits only one
  `time-overlays:changed` event.
- Full `for f in v4/tests/*.js; do node "$f" || exit 1; done` passed.

Notes:

- This hotfix is intentionally scoped to the store-level no-op behavior.
- It does not change Time Overlay persistence, selected-date semantics, or
  Calendar/Daily Time Review rendering behavior for actual setting changes.
