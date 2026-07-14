# Session 2026-07-14 - Step 429 Reflow Chart And Replay Transport

## Scope

Reclaim the vertical space left by Step 428 and ensure Replay transport remains
reachable, draggable, persistent, and clear of the status surface.

## Completed

- collapsed the workstation shell from eight grid rows to seven;
- moved the status surface from row 8 to row 7;
- changed Replay transport default bottom offset from 118px to 58px;
- added an 8px status-bar clearance to transport drag and restore bounds;
- verified out-of-range persisted positions are clamped and re-saved;
- advanced the cleanup completion marker through Step 429;
- retained Replay, chart, viewport, status, and persistence ownership.

## Verification

- `node v6/tests/workspace-placeholder-absence-harness-step420-smoke.js`
- `node v6/tests/bottom-chrome-regression-audit-browser-smoke.js`
- `node v6/tests/replay-transport-position-smoke.js`
- `node v6/tests/replay-transport-position-controller-boundary-smoke.js`
- `node v6/tests/replay-transport-controller-smoke.js`
- `node v6/tests/replay-transport-browser-smoke.js`
- `node v6/tests/replay-transport-focus-keyboard-browser-smoke.js`
- `node v6/tests/replay-transport-position-persistence-browser-smoke.js`

## Next

Step 430 should audit the existing full-width Replay status semantics and
define a compact user-facing status contract. It must preserve authoritative
Replay state and diagnostics access before Step 431 changes presentation.
