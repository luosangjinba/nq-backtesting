# V7 Quick GoTo Settings And Range Feedback — R6.9e

Status: implemented; awaiting human interaction and visual review (2026-07-22)

## Delivered Surface

The Workspace `Go to` menu now exposes the eight fixed forward actions defined
by R6.9d:

- Next Day Open (`Y`);
- Next Session (`Z`);
- Asian Session (`I`);
- London Session (`L`);
- New York Session (`N`);
- SB New York AM;
- SB New York PM;
- SB London.

The three Silver Bullet actions deliberately have no keyboard shortcut. V7
does not implement star-based visibility, Next News Event, Price, Future Date,
or Days to skip.

`Custom Settings…` opens one focused seven-time dialog. All values are exact
New York `HH:mm` wall times. `Next Session` has no editable field because it is
derived from the next Asian, London, or New York anchor. Reset changes the
draft to defaults; Discard restores the last accepted settings; Save validates
and applies the schedule immediately.

## Ownership And Persistence

`core.replay-navigation-settings` owns the immutable, branded, versioned seven-
time value. The GoTo UI only edits a draft and dispatches Save.
`core.replay-navigation-preference-store` is the sole durable writer and stores
one workstation-wide value outside every Replay Session record.

Saving settings does not move Replay, acquire bars, reproject Panes, or issue a
Workspace transaction. The existing Replay Navigation target resolver reads
the latest accepted schedule when the next Quick GoTo command is dispatched.
Every current and future Replay Session therefore uses the same latest settings
without creating another Replay owner.

Each configured time is the unrevealed key moment, not the end of a candle to
show. Quick GoTo commits an exclusive cutoff at that wall time after primary-
source eligibility is confirmed. Consequently `15:00` displays through
`14:59` on `1m` data, and no Pane may reveal the `15:00` bar before the next
Replay step.

Older uninitialized, Pane-layout-only, and schema-3 records remain readable.
If the global record is absent, the most recently updated valid schema-3 value
seeds it once. Current schema 4 stores Pane Layout only; deleting a Session
cannot reset the global schedule.

## Range-End Feedback

When no later eligible anchor exists within the Replay Session range, the
existing `rejected/goto-target-unavailable-in-range` result is presented as an
inline, non-blocking message naming the action and the New York range end. The
Workspace stays `ready`; Replay remains paused at its accepted cursor; Pane and
Replay revisions do not change; and no generic transaction error replaces the
visible charts.

## Deliberate Boundary

The existing Exact date/time item remains temporarily inside the menu only to
avoid removing accepted behavior during this slice. R6.9e does not redesign
it. The next bounded slice gives Exact GoTo a separate Workspace-level entry,
Session-range highlighting and disabled out-of-range dates through the shared
Calendar Surface.

Economic Calendar remains a later independent business module. It may reuse
calendar primitives and emit the same Exact GoTo intent, but it cannot own the
Replay cursor or become required by navigation.

## Gate

- the Replay Navigation Settings Harness binds exact fields, defaults,
  branding, versioned serialization, restoration, and seven negative controls;
- the Replay Navigation Preference Store Harness binds global save/restore,
  legacy migration, corruption fallback, and failed-write atomicity;
- Session Store evidence binds legacy schema-3 readability and current
  Pane-layout-only schema 4;
- Replay Navigation evidence binds dynamic schedule replacement without a
  second runtime or cursor and binds the exclusive pre-anchor cutoff for all
  eight actions;
- the real-Chrome Replay Pane Workspace Harness binds eight actions, five
  shortcuts, Reset/Discard/Save, immediate schedule use, zero-revision Save,
  cross-Session inheritance, Session-deletion independence, non-blocking
  range-end feedback, and fixed `1440×900` output;
- this browser-visible slice stops for explicit human interaction and visual
  review before Exact GoTo begins.
