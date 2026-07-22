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
time value. The GoTo UI only edits a draft and dispatches Save. Session Store
is the only durable writer and stores the accepted settings under the explicit
Replay Session record together with Pane Layout in workspace schema version 3.

Saving settings does not move Replay, acquire bars, reproject Panes, or issue a
Workspace transaction. The existing Replay Navigation target resolver reads
the latest accepted schedule when the next Quick GoTo command is dispatched.
Different Replay Sessions therefore retain independent settings without
creating another Replay owner.

Older uninitialized and Pane-layout-only records remain readable. Their first
layout or navigation-settings save upgrades the workspace envelope and fills
the missing half with its default value.

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
- Session Store evidence binds per-Session save/restore, layout preservation,
  schema upgrade, and isolation;
- Replay Navigation evidence binds dynamic schedule replacement without a
  second runtime or cursor;
- the real-Chrome Replay Pane Workspace Harness binds eight actions, five
  shortcuts, Reset/Discard/Save, immediate schedule use, zero-revision Save,
  non-blocking range-end feedback, and fixed `1440×900` output;
- this browser-visible slice stops for explicit human interaction and visual
  review before Exact GoTo begins.
