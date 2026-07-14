# Session - Step 412 Settings Session And ICT Day Separators

Date: 2026-07-13

## Completed

- closed Step 411 after human visual acceptance;
- checked official Lightweight Charts primitive/Vertical Line examples;
- upgraded Settings to schema v4 with day-separator modes, colors, and styles;
- extracted one shared DST-aware New York wall-clock helper for Go-to and
  Session Calendar;
- added Session Calendar boundary and bar-to-logical-coordinate mapping;
- mounted one batch primitive per chart pane;
- kept Chart Engine independent of Session Calendar through a focused bridge;
- covered DST, HTF, weekend gap, transaction, persistence, and hard reload.

## Commits

- `d4e4f1cd docs(v6): close canvas view acceptance`
- `e3fe0e21 feat(v6): version day separator settings`
- `afa78206 feat(v6): resolve DST-aware day separators`
- `572d6b5c feat(v6): render session day separator overlays`
- final Step 412 browser/governance commit
- `1eeca731 fix(v6): align separators to chart wall clock`
- `26455014 perf(v6): keep separator wall-clock mapping off DST solver`

## Verification

- `node v6/tests/settings-day-separators-model-step412-smoke.js`
- `node v6/tests/session-calendar-day-separators-step412-smoke.js`
- `node v6/tests/day-separator-overlay-model-step412-smoke.js`
- `node v6/tests/day-separator-primitive-step412-smoke.js`
- `node v6/tests/settings-day-separator-bridge-step412-smoke.js`
- `node v6/tests/chart-engine-adapter-smoke.js`
- `node v6/tests/chart-engine-browser-smoke.js`
- `node v6/tests/settings-day-separators-browser-step412-smoke.js`
- adjacent Settings browser tests
- `node v6/tests/chart-browser-regression-pack.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

## Next

The user passed the corrected `00:00` and `18:00` visual matrix after the wall-
clock coordinate fix. Step 412 is closed; implement Step 413 Symbol
Presentation.

## Visual Correction

The first visual pass showed the ICT line at `04:00` instead of `00:00`.
V6 market bars carry New York wall-clock fields in naive UTC epoch values, but
the separator initially sent the absolute EDT instant (`04:00Z`) into that
axis. The correction separates New York calendar semantics from chart-axis
encoding. It also removes the absolute DST solver from the synchronous Chart
Data path; the unchanged Manual Next `160ms` gate now passes at `123.6ms`, and
the complete chart pack passes `28/28`.

The corrected visual revalidation passed.
