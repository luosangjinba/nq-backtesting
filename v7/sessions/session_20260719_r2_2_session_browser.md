# V7 R2.2 Professional Session Browser — 2026-07-19

## Trigger

R2.1 passed human review, opening the first browser-visible vertical slice.

## Boundary Decision

`adapter.session-browser-ui` is the sole writer below its supplied DOM root. It
renders immutable Session view models and dispatches create/activate commands
through the public Session Store. Hash navigation is a replaceable browser
adapter and never becomes an active-Session persistence key.

The app composition root supplies localStorage, NQ/ES display configuration,
opaque identity allocation, time, and navigation. Concrete instrument ids live
only in composition. Session Store and UI code do not branch on them.

The customer surface provides a professional dark workstation shell, Session
list, Create Session dialog, and selected-Session summary. Loading, empty,
unavailable, stale, error, and ready states are defined together. No fake chart,
Replay, order, Journal, campaign, indicator, or plugin control exists.

Hard refresh in R2.2 proves only Session list and selected metadata persistence.
Full workspace/pane/cursor/viewport restoration remains R7.

## Automated Gate

Passed all 15 V7 harnesses before commit. Focused real-Chrome evidence creates
distinct Alpha/Beta Sessions, opens A, opens B, hard-refreshes B, reopens A,
checks persisted activation generation `2/2`, and proves no active/current key.
Four exact fixed `1440x900` visual fixtures cover empty, dialog, two-Session
ready, and selected-B-after-refresh states. The view-model harness covers all
six specified visible states and two negative controls. `git diff --check` is
also required immediately before commit.

## Human Review

First review rejected on 2026-07-20: the instrument choices occupied a permanent
card grid, and reopening Create Session retained the prior draft. The corrective
slice replaces the grid with a multi-select dropdown and resets name,
instruments, dates, validation, and dropdown state on every open. Real-Chrome
evidence must create A, reopen, and prove the complete default draft before B.

Second review requested a stricter empty state on 2026-07-20. Instruments,
Start, and End now initialize empty instead of supplying convenience defaults;
the reopen assertion proves the same complete empty draft before Session B.

After that review passed, Start and End moved behind a focused replaceable
date-time-control boundary. The native control remains visually stable, while
creation now consumes only reset/read/set APIs. Minute and future second-level
values share one round-trip contract. This step intentionally does not add an
Auto-update end-date control: market-data availability belongs to R3 Bar Data,
not wall-clock or Session Browser state.

Use the running V7 service for interaction and visual review. Confirm hierarchy,
density, focus/dialog behavior, responsive layout, A/B isolation, and refresh.
Automated evidence cannot accept the step. Passing R2.2 opens R3 Bar Data and
Replay Core, which remains headless and chart-independent.
