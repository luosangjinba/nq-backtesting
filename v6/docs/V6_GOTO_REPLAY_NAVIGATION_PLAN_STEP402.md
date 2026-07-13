# Step 402 - Go-to Replay Navigation Semantic Correction And Plan

Status: accepted plan; implementation not started.

## Correction

The former loaded-window date locator interpretation was wrong and its three
implementation commits were reverted.

The right-rail `Go to` surface means forward replay navigation:

- Next Day Open (`Y`);
- Next Session (`Z`);
- Asian Session (`I`);
- London Session (`L`);
- New York Session (`N`);
- Custom Settings.

It is session-global replay progression, not active-pane viewport inspection.
It intentionally advances the Replay cursor/reveal boundary and rematerializes
every visible pane at its own display timeframe.

An arbitrary date/time chart inspector may be evaluated later under another
name and surface. It must not be smuggled back into this `Go to` menu.

## Evidence and reuse decision

- The user-supplied FXReplay screenshots are the interaction reference.
- V6 already reserves the correct menu labels and shortcut hints in its shell.
- V5's datetime-input Go-to changes chart viewing position and does not match
  this semantic; its ownership model and implementation are not reusable.
- Lightweight Charts 5.2 supplies final time/logical range APIs only. The
  official API and awesome-tradingview ecosystem do not provide a trading-
  session scheduler/navigation plugin.
- Existing V6 manual-next gap scanning and cursor materialization contain useful
  behavior, but the large runtime must not be copied into a second coordinator.

References:

- https://tradingview.github.io/lightweight-charts/docs/api/interfaces/ITimeScaleApi
- https://github.com/tradingview/awesome-tradingview

## First-slice semantics

Default anchors are expressed in `America/New_York` wall-clock time:

| Action | Default | Resolution |
| --- | ---: | --- |
| Asian Session | `19:00` | next valid configured Asian anchor |
| London Session | `02:00` | next valid configured London anchor |
| New York Session | `09:30` | next valid configured New York anchor |
| Next Day Open | `18:00` | next valid configured day-open anchor |
| Next Session | derived | earliest valid Asian/London/New York anchor |

Rules:

- every action is strictly forward from the current Replay cursor;
- conversion is DST-correct for `America/New_York`;
- a schedule domain generates candidate anchors; Bar Data verifies a nearby
  real source bar so holidays/weekends are not modeled by a duplicate calendar;
- an anchor with no nearby source bar is skipped in favor of the next candidate;
- search is bounded by attempt count and replay end time;
- no target may exceed the replay session end;
- playback pauses before a successful jump;
- only bars at or before the resolved source cursor may be materialized;
- current manual/default viewport intent rules remain in force after data
  materialization;
- all visible panes share the replay cursor but retain pane-local timeframe,
  symbol intent, and viewport intent.

Silver Bullet settings and shortcuts are deferred. They are not needed to make
the visible menu in the supplied reference functional.

## Ownership

### Shell

- renders menu/modal, draft values, validation, busy/error state, and scoped
  keyboard shortcuts;
- dispatches replay-navigation and preference commands only;
- never calculates session dates, requests bars, sets Replay cursor, or writes
  chart series/ranges.

### Replay Navigation Schedule Domain

- owns action kinds, default anchors, HH:mm validation, DST-aware candidate
  generation, strict-forward ordering, and Next Session selection;
- is pure and has no DOM, command bus, Bar Data, Replay, or chart dependency.

### Replay Navigation Preferences

- owns the four first-slice configurable anchors, reset-to-default behavior,
  validation, snapshot, and local persistence boundary;
- remains separate from presentation-only chart settings.

### Replay Navigation Coordinator

- pauses playback, reads Replay state and visible panes, resolves candidates,
  asks Bar Data for bounded source windows, selects the real source cursor, and
  invokes one shared cursor-materialization boundary;
- emits completed/rejected diagnostics;
- does not write chart series or call Lightweight Charts.

### Existing owners

- Replay remains the sole cursor/reveal owner.
- Bar Data remains the sole bar requester/cache owner.
- Chart Data/Projection materializes no-future pane records.
- Chart Viewport reapplies each pane's existing intent.
- Chart Surface remains the sole Lightweight Charts writer.

## Required structural correction before feature wiring

Manual Next currently combines gap scanning, cursor advancement, multi-pane
source loading, display projection, and Chart Data append work. Go-to must not
duplicate that orchestration.

Extract the smallest reusable `replay-cursor-materialization` boundary first.
Manual Next and Go-to must call that boundary through an explicit API. The
extraction must preserve current Next/Play latency and session-gap behavior.

## Execution plan

### Step 403 - Schedule Domain And Preferences Contract

- implement action/default/preference contracts;
- implement DST-aware pure candidate generation;
- add weekend/holiday-as-missing-data, DST transition, equal-anchor, replay-end,
  invalid-time, and reset tests;
- define persistence adapter boundary without UI or replay mutation.

Commit after domain tests and `git diff --check` pass.

### Step 404 - Shared Cursor Materialization Boundary

- extract reusable forward source-bar resolution and pane materialization from
  Manual Next;
- keep Bar Data, Replay, Chart Data, Projection, and Viewport ownership intact;
- run existing manual-next, auto-play, replay-gap, HTF, multi-pane, and latency
  regression packs before commit.

Commit only if behavior is unchanged.

### Step 405 - Replay Navigation Coordinator

- implement bounded candidate-to-real-bar resolution;
- pause playback and advance Replay exactly once on success;
- rematerialize every visible pane with no future leakage;
- expose explicit success/rejection diagnostics and in-flight suppression.

Commit after runtime and real-service tests pass.

### Step 406 - Menu, Shortcuts And Custom Settings

- activate the existing right-rail menu;
- implement `Y/Z/I/L/N` only when chart/workstation focus permits and no text
  field or modal owns keyboard input;
- add a focused settings modal with New York-time labels, defaults, Discard,
  Save, close, and Reset to defaults;
- keep Silver Bullet controls deferred.

Commit after controller/accessibility tests pass.

### Step 407 - Browser And Human Acceptance

- verify each action from cursor positions before/after every anchor;
- verify DST, weekend/holiday gaps, replay-end rejection, double-click/in-flight
  suppression, and persistence restore;
- verify `1m`, representative fixed HTF, `1D`, `1W`, `1M`, and multi-pane all
  land on the same Replay cursor with correct pane materialization;
- verify no future bars, manual/default viewport preservation, and visible
  latency diagnostics;
- perform human comparison with the supplied screenshots.

Commit the regression gate and documentation closeout separately.

## Stop conditions

Stop implementation if any proposed shortcut:

- treats Go-to as an active-pane-only chart movement;
- calls `REPLAY_COMMANDS.SET_CURSOR_TIME` directly from shell;
- requests bars outside Bar Data;
- duplicates Manual Next materialization logic;
- computes New York anchors with fixed UTC offsets;
- reveals source/target bars after the resolved cursor;
- resets manual viewport intent as a side effect;
- adds Silver Bullet or a generic market-calendar framework before the first
  five actions pass acceptance.
