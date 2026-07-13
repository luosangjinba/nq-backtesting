# Step 406 - Replay Navigation Menu, Shortcuts And Custom Settings

Status: completed; Step 407 human visual acceptance remains required.

## Outcome

The reserved right-rail Go-to surface is now active for the first five replay-
navigation actions:

- Next Day Open (`Y`);
- Next Session (`Z`);
- Asian Session (`I`);
- London Session (`L`);
- New York Session (`N`).

The shell dispatches `replayNavigation.navigate` with the current chart-surface
visible pane ids. It renders busy, completed, and rejected feedback from the
Step 405 coordinator without calculating anchors, requesting bars, mutating
Replay, or writing chart state.

## Shortcut scope

Shortcuts run only while the workstation is visible and no visible dialog owns
input. They ignore:

- editable inputs, selects, textareas, and contenteditable elements;
- modifier chords and repeated keydown events;
- hidden workstation/dashboard state;
- visible modal dialogs.

A browser gate exposed that the existing Session Settings dialog retains a
layout rectangle inside a closed `<details>` element. Visibility detection now
explicitly excludes dialogs inside closed details; otherwise every Go-to
shortcut would have remained suppressed.

## Custom Settings

The focused `replay-navigation-settings.js` DOM controller owns presentation
draft state only. It reads and saves through the Step 403 preference commands.

- all four inputs are labeled as New York wall-clock time;
- values use strict `HH:mm` validation;
- `HH:mm` remains the canonical command/persistence value. A future global
  Settings `timeFormat` preference may change the controls' presentation, but
  Go-to must not own or persist a separate 12/24-hour choice;
- Reset to defaults changes the draft but does not persist;
- Save validates and persists the whole draft;
- Discard, close, backdrop click, and Escape restore the persisted snapshot;
- focus wraps within the modal and returns to the Go-to trigger on close;
- Silver Bullet remains deferred.

## Existing-capability check

The official Lightweight Charts time-scale API remains limited to time/logical
range reads and writes. It does not own application menus, keyboard scope,
trading-session schedules, or preference drafts. Step 406 therefore stays in a
shell controller and uses the existing Replay Navigation contracts rather than
adding chart-engine code.

References:

- https://tradingview.github.io/lightweight-charts/docs/api/interfaces/ITimeScaleApi
- https://github.com/tradingview/awesome-tradingview

## Verification

- `node v6/tests/replay-navigation-control-step406-smoke.js`
- `node v6/tests/replay-navigation-settings-step406-smoke.js`
- `node v6/tests/replay-navigation-control-step406-ownership-smoke.js`
- `node v6/tests/replay-navigation-ui-step406-browser-smoke.js`
- `node v6/tests/replay-navigation-runtime-step405-smoke.js`
- `node v6/tests/replay-navigation-preferences-step403-smoke.js`
- `node v6/tests/right-utility-rail-browser-smoke.js`
- `node v6/tests/app-shell-browser-smoke.js`
- `node v6/tests/visible-kline-latency-regression-pack-step257-smoke.js`
- `node v6/tests/chart-browser-regression-pack.js`
- `git diff --check`

The Step 406 browser gate uses real NQ data. It persists a custom New York
anchor of `08:45`, verifies Friday-to-Monday keyboard navigation, and confirms
Replay cursor, latest Chart Data bar, and supplied visible pane ids agree. It
also captures a non-empty browser screenshot and asserts modal/viewport bounds.

## Required visual acceptance

Automated geometry and screenshot gates cannot judge spacing, hierarchy,
readability, or whether the interaction feels like the supplied FXReplay
reference. Step 407 must therefore include human visual acceptance.

The human matrix should cover:

1. menu placement, labels, shortcut hints, and status feedback;
2. Custom Settings layout at the user's normal browser resolution;
3. all five actions on `1m`, representative fixed HTF, `1D`, `1W`, and `1M`;
4. drag-created manual viewport intent before navigation;
5. multi-pane agreement and no-future behavior;
6. weekend/replay-end rejection and rapid repeated input.

## Next recommendation

Run Step 407 Browser And Human Acceptance. First extend the automated matrix
for every action, anchor boundary, replay-end, double input, persisted reload,
timeframe family, multi-pane, no-future, viewport preservation, and visible
latency. Then keep the app/API running and ask the user to complete the visual
matrix above. Do not start a new product feature until that gate passes.
