# V6 Workspace Cleanup Phase Roadmap - Step 418

Date: 2026-07-14

## Status

This roadmap decomposes the accepted workspace-placeholder cleanup into
independently executable phases and steps. It is an execution plan, not
authorization to implement Semantic Drawing, Orders, Indicators, Session
Settings, or the three-mode product architecture.

The controlling documents are:

- `V6_WORKSPACE_PLACEHOLDER_INVENTORY_STEP418.md`;
- `V6_WORKSPACE_PLACEHOLDER_CLEANUP_DECISION_STEP418.md`;
- `V6_WORKSPACE_PLACEHOLDER_CLEANUP_PLAN_STEP418.md`.

If this roadmap conflicts with the cleanup decision, the cleanup decision wins.

## Global Execution Rules

- Execute phases in order unless a later phase is explicitly re-planned.
- Every numbered step ends with its own commit.
- Do not combine placeholder cleanup with active feature work or broad visual
  redesign.
- Removing production UI does not authorize deleting its owner/domain contract.
- Update or retire tests that preserve obsolete placeholder presence in the
  same step that removes the corresponding markup.
- Run the step-specific tests plus `git diff --check` before every commit.
- Run the phase regression gate after the last step in each phase.
- Stop when a supposedly empty control has an active command/event consumer or
  mounted owner that was not recorded in the inventory.
- Stop when chart, Replay, Go-to, Settings, Journal, layout, pane input, or
  persistence behavior changes.
- Semantic Drawing review proceeds independently. No cleanup step may define
  its future toolbar, palette, context menu, plugin API, or artifact model.

## Phase 0 - Baseline And Cleanup Harness

### Goal

Freeze the current functional surface and make obsolete-placeholder removals
testable without relying only on screenshots.

### Step 419 - Freeze Functional-Surface Baseline

Status: completed on 2026-07-14.

- record selectors and user flows that must survive all cleanup phases;
- cover top Journal, Replay panel, Settings, timeframe, layouts/sync, Go-to,
  pane actions, Reset View, Replay transport, and chart pointer input;
- distinguish state-disabled functional controls from disabled placeholders;
- capture single-pane and multi-pane baseline dimensions needed to detect chart
  regressions.

Commit intent: `test(v6): freeze workspace cleanup baseline`

Implemented by
`v6/tests/workspace-cleanup-functional-baseline-step419-browser-smoke.js`.
The browser baseline protects functional workflow panels and controls,
single/two-Pane chart geometry, Pane maximize/restore and Reset, layout sync,
Replay transport, state-disabled Previous/Restart semantics, and chart pointer
input without asserting that placeholder rails must survive.

### Step 420 - Establish Placeholder Absence Harness

Status: completed on 2026-07-14.

- add or adapt one focused cleanup harness that can assert removed production
  selectors are absent;
- keep domain contract tests independent from production-button presence;
- record the expected removal families without changing production markup.

Commit intent: `test(v6): establish workspace cleanup harness`

Implemented by
`v6/tests/workspace-placeholder-absence-harness-step420-smoke.js` and its
step-indexed cleanup manifest. The manifest remains at completed-through Step
419 until the first production-removal commit. Contract smoke tests for Session
Settings, Indicators, Drawing/Action History, Screenshot Export, and
Account/Trading no longer assert that their disabled production selectors
exist.

Phase 0 is complete. Its two harnesses now separately protect functional
survival and planned placeholder absence.

### Phase 0 Gate

- `node v6/tests/app-shell-browser-smoke.js`
- `node v6/tests/product-baseline-screenshot-smoke.js`
- `node v6/tests/workspace-placeholder-cleanup-decision-step418-smoke.js`
- the new functional baseline and placeholder harnesses;
- `git diff --check`.

No visual acceptance is required because Phase 0 does not alter production UI.

## Phase 1 - Unambiguous Clone Artifacts

### Goal

Remove duplicate or undefined FXReplay-clone artifacts with the smallest
ownership and layout risk.

### Step 421 - Remove Top Clone Artifacts

Status: completed on 2026-07-14.

- remove generic top Search;
- remove static `NQ-2018` layout-name text;
- remove dedicated CSS and obsolete parity assertions for those entries;
- preserve active symbol, timeframe, layout/sync, Settings, Replay, and Journal.

Commit intent: `refactor(v6): remove top clone artifacts`

Removed the generic Search button and static/session-derived layout-name text,
including their dedicated CSS and session-dashboard write path. The cleanup
manifest is advanced through Step 421; active symbol, timeframe, layout/sync,
Settings, Replay, and Journal remain protected by the Step 419 baseline.

### Step 422 - Remove Duplicate Right-Rail Artifacts

Status: completed on 2026-07-14.

- remove the disabled duplicate Journal entry;
- remove the undefined Watch/spark entry;
- preserve the functional top Journal entry;
- update right-rail spacing and placeholder tests.

Commit intent: `refactor(v6): remove duplicate right rail artifacts`

Removed the disabled right-rail Journal duplicate and undefined Watch/spark
entry, including their now-unused SVG icon definitions. The functional top
Journal surface and Go-to remain protected. The cleanup manifest is advanced
through Step 422.

Phase 1 implementation is complete. Automated and screenshot gates show no top
toolbar or right-rail overlap; final user visual acceptance may be combined
with the next running workstation review if desired.

### Phase 1 Gate

- top-toolbar and right-utility browser smoke tests after updating their
  obsolete expectations;
- functional top Journal open/close flow;
- Settings, layout, Go-to, Replay transport, and chart-entry smoke tests;
- supported desktop toolbar-overflow check;
- `git diff --check`.

Human visual checkpoint:

- top toolbar has no unexplained gap or overlap;
- right rail remains aligned;
- chart area and floating Replay transport remain stable.

## Phase 2 - Session Settings Empty Family

### Goal

Remove the interactive-looking Session Settings shell without deleting its
future capability boundary.

### Step 423 - Remove Session Settings Production Entry

Status: completed on 2026-07-14.

- remove the right-rail Session Settings trigger;
- remove panel markup, disabled fields, Template, and Apply controls;
- preserve the `session-settings` owner contract and pure contract tests;
- replace production-selector presence assertions with cleanup absence
  assertions.

Commit intent: `refactor(v6): remove session settings placeholder`

Removed the right-rail trigger and the complete disabled panel family,
including its fields, Template, and Apply controls. Cleanup tests now require
the production selectors to be absent, while the independent
`session-settings` owner contract remains covered. Dedicated panel styling and
reservation-only test consolidation remain intentionally scoped to Step 424.

### Step 424 - Consolidate Session Settings Styling And Tests

Status: completed on 2026-07-14.

- remove dedicated panel CSS only after confirming no shared selector consumer;
- retire reservation/regression tests whose sole purpose was keeping the panel
  visible;
- retain owner-boundary tests that do not depend on production markup;
- verify Chart Settings and Go-to Custom Settings remain distinct.

Commit intent: `test(v6): consolidate session settings cleanup`

Removed the orphan `rail-bottom-actions` and Session Settings panel style
family after confirming that no production selector consumed it. Retired the
two panel reservation/regression tests whose only responsibility was the old
shell; the generic cleanup harness now verifies both markup and CSS absence.
The independent owner contract, Chart Settings, and Go-to Custom Settings all
remain covered and green.

Phase 2 is complete.

### Phase 2 Gate

- `node v6/tests/session-settings-contract-smoke.js`
- updated Session Settings absence/cleanup harness;
- Chart Settings browser smoke;
- Go-to browser regression pack;
- right-utility, app-shell, and product-baseline browser smoke tests;
- `git diff --check`.

Human visual checkpoint:

- no blank right-rail slot remains;
- Chart Settings and Go-to Custom Settings are unchanged.

## Phase 3 - Reserved Top And Side Tool Shells

### Goal

Remove the largest inert reservation surfaces while preserving all owner
contracts and leaving future entry design open.

### Step 425 - Remove Reserved Top-Toolbar Controls

Status: completed on 2026-07-14.

- remove symbol search and comparison symbol placeholders;
- remove Indicators, Undo/Redo, ETH/session hours, Screenshot, Theme, and
  Fullscreen placeholders;
- retain indicators, drawing/action-history, screenshot/export, and other
  owner contracts;
- update top-toolbar CSS and obsolete selector assertions.

Commit intent: `refactor(v6): remove reserved top toolbar controls`

Removed Symbol Search, Compare, Indicators, Undo, Redo, session-hours/ETH,
Screenshot, Theme, and Fullscreen placeholders together with their orphan
account/text/redo styling. The cleanup manifest is advanced through Step 425;
top-toolbar coverage now protects the remaining functional controls and
requires all nine placeholder selectors to stay absent. Indicators,
drawing/action-history, screenshot/export, comparison-symbol, and other owner
contracts remain intact.

### Step 426 - Remove Traditional Left Drawing Rail

Status: completed on 2026-07-14.

- remove Cursor, Trend Line, Horizontal Line, Rectangle, Measure, and Text
  production buttons as one shell family;
- reclaim left chart space and update chart-host sizing;
- retain the read-only drawing/action-history contract pending Semantic Drawing
  review;
- add an explicit regression that no traditional Drawing entry is restored by
  cleanup work.

Commit intent: `refactor(v6): remove inert drawing rail`

Removed the Cursor, Trend Line, Horizontal Line, Rectangle, Measure, and Text
production buttons as one family, deleted their orphan styling and four unused
SVG definitions, and moved the chart surface into the reclaimed left grid
column. Browser coverage now requires traditional Drawing entries to remain
absent while allowing Pane-local Maximize/Reset controls for any active layout.
The drawing/action-history contract remains intact and no future Semantic
Drawing entry surface or plugin API was selected.

### Step 427 - Remove Reserved Right-Rail Tools

Status: completed on 2026-07-14.

- remove Object tree, Order, and News placeholders;
- collapse the right utility rail completely if no functional entry remains;
- retain Orders and other owner/domain contracts;
- update chart-host width, pane resize, and pointer-boundary expectations.

Commit intent: `refactor(v6): remove reserved right rail tools`

Removed Object tree, Order, and News placeholder entries together with three
now-unused SVG definitions and the orphan icon-only rail style. The right rail
was deliberately retained because Go-to is a functional accepted surface; it
is now the rail's sole entry and remains vertically centered. Orders and other
owner/domain contracts remain intact. Phase 3 production cleanup is complete.

### Phase 3 Gate

- updated top-toolbar, left-rail, and right-rail cleanup harnesses;
- drawing/action-history, indicators, screenshot/export, and account/order
  contract smoke tests;
- single-, two-, and three-pane layout browser smoke tests;
- pane resize, maximize, Reset View, chart drag/wheel, and chart pointer tests;
- timeframe, Settings, Replay, Journal, and Go-to browser smoke tests;
- `git diff --check`.

Human visual checkpoint at supported desktop resolutions:

- chart correctly occupies reclaimed left/right space;
- no empty rails, borders, or padding remain;
- pane actions and price/time scales are not clipped;
- future Semantic Drawing entry remains visibly undecided.

## Phase 4 - Bottom Account And Trading Chrome

### Goal

Remove Buy/Sell/Qty and account/analytics placeholders, then deliberately
reflow the real Replay surfaces into the reclaimed space.

### Step 428 - Remove Bottom Trading And Account Placeholders

Status: completed on 2026-07-14.

- remove Buy, Sell, Qty, Balance, Realized, Unrealized, and Analytics markup;
- remove dedicated placeholder CSS and obsolete presence assertions;
- retain account/trading, Orders, session-summary, and analytics contracts;
- do not alter session account facts stored outside the removed workstation
  chrome.

Commit intent: `refactor(v6): remove bottom trading placeholders`

Removed Buy, Sell, Qty, Balance, Realized, Unrealized, and Analytics markup and
the complete dedicated style family. The generic cleanup harness now protects
both markup and CSS absence. Account/trading, Orders, session-summary, and
analytics contracts remain intact, as do Replay transport, the status surface,
and session account facts outside the removed workstation chrome. Grid-row
reflow and transport-bound recalculation remain deliberately scoped to Step
429.

### Step 429 - Reflow Chart And Replay Transport

Status: completed on 2026-07-14.

- reclaim bottom workspace height;
- recalculate floating Replay transport drag bounds and default placement;
- verify persisted transport positions are clamped into the new viewport;
- prevent overlap among chart scales, transport, and remaining status surface.

Commit intent: `fix(v6): reflow chart after bottom cleanup`

Collapsed the workstation grid from eight rows to seven, moved the remaining
status surface to row 7, and changed the default Replay transport offset from
118px to 58px. The transport position controller now treats the visible status
bar top minus an 8px clearance as its effective vertical boundary for drag and
persisted-position restore. Browser coverage verifies the new grid, default
non-overlap, restored clamp, and supported desktop sizes. Phase 4 is complete.

### Phase 4 Gate

- account/trading and Orders contract smoke tests;
- bottom-chrome cleanup/absence harness;
- Replay transport controller, browser, drag, focus, keyboard, and persistence
  smoke tests;
- chart resize, app-shell, product-baseline, and multi-pane smoke tests;
- `git diff --check`.

Human visual checkpoint:

- chart gains the expected vertical space;
- Replay transport remains reachable and draggable;
- no empty bottom frame or account readout remains.

## Phase 5 - User-Facing Replay Status

### Goal

Preserve authoritative Replay state while replacing the full-width engineering
footer with concise, user-facing status.

### Step 430 - Freeze Replay Status Presentation Contract

Status: completed on 2026-07-14.

- classify which states require visible user communication: loading, ready,
  exceptional/error, and active no-future protection;
- classify internal session ID, raw revealed/total counts, hidden-bar counts,
  and duplicate Play/Pause copy as diagnostics rather than permanent chrome;
- define a stable machine-readable diagnostic surface for tests without
  requiring every value to be visibly rendered;
- approve exact user-facing copy and placement before implementation.

Commit intent: `docs(v6): define compact replay status presentation`

The accepted contract replaces seven engineering badges with one compact
lifecycle message plus an optional `Future data hidden` assurance. Internal
session/time/count/runtime values remain available through a versioned
`data-v6-replay-diagnostics` JSON snapshot rather than visible text. Placement
stays in the Step 429 bottom row, Replay Runtime remains authoritative, and
Step 431 is constrained to presentation implementation.

### Step 431 - Implement Compact Replay Status

Status: completed on 2026-07-14.

- update the status view model without changing Replay runtime ownership;
- replace the full-row engineering badges with the approved compact status;
- keep exceptional and no-future assurance states understandable;
- preserve diagnostic inspection for automated tests and development.

Commit intent: `feat(v6): simplify replay status presentation`

The Status Readout model now owns a compact lifecycle/protection projection and
a versioned structured diagnostic snapshot. Production markup contains one
polite lifecycle region and a conditional `Future data hidden` assurance; the
seven engineering badges are removed. Existing Replay gap fixtures inspect the
diagnostic cursor rather than visible English text. Replay Runtime, commands,
events, and transport behavior are unchanged.

### Step 432 - Verify Status Semantics And Layout

Status: automated verification completed on 2026-07-14; mandatory human visual
acceptance remains pending.

- update model/controller/browser tests to assert meaning rather than obsolete
  English engineering strings;
- verify Play/Pause, Next/Previous, Go-to, restart, session entry, loading, and
  no-future flows;
- verify compact status at supported resolutions and pane counts.

Commit intent: `test(v6): verify compact replay status`

The real Transport browser flow now verifies ready, playing, paused, ended,
and restarted compact states plus future-protection visibility and diagnostic
status/counts. A dedicated browser matrix verifies preparing state and compact
status geometry at `1024x720`, `1440x900`, and `1920x1080` across single,
two-Pane, and three-Pane layouts. It exposed the status row's content-box
height inflation; explicit border-box sizing and tighter padding now keep the
actual row within 32px. Replay, Restart, Session, Go-to, history, layout, App
Shell, and screenshot gates pass. Phase 5 remains open until human visual
acceptance is recorded.

### Phase 5 Gate

- status-readout model, controller, and browser smoke tests;
- Replay runtime/domain and transport regression packs;
- session-entry, Go-to, history-loading, and no-future browser smoke tests;
- app-shell and product-baseline screenshots;
- `git diff --check`.

Human visual acceptance is mandatory because wording density and transport/chart
overlap cannot be accepted from unit tests alone.

## Phase 6 - Consolidation And Closeout

### Goal

Remove cleanup residue, run broad regression, and close the workspace-cleanup
decision without starting replacement features.

### Step 433 - Remove Orphan Styling And Obsolete Tests

- audit deleted selectors across markup, CSS, controllers, and tests;
- remove orphan CSS and reservation-only fixtures;
- retain reusable icon primitives, owner contracts, and domain tests only when
  they have an identified non-placeholder consumer or future boundary;
- verify no hidden element is being kept merely to satisfy an old parity test.

Commit intent: `refactor(v6): consolidate workspace cleanup residue`

### Step 434 - Run Full Workspace Regression Matrix

- run chart foundation, Replay, Go-to, Settings, Journal, layout, panes,
  transport, session entry, app-shell, and screenshot regression packs;
- record automated results and any intentionally updated baselines;
- run `git diff --check` and repository boundary tests.

Commit intent: `test(v6): close workspace cleanup regression`

### Step 435 - Human Visual Acceptance And Closeout

- inspect single-, two-, and three-pane layouts;
- inspect supported desktop resolutions;
- verify top, left, right, and bottom reclaimed space;
- verify chart scales, pane controls, Settings, Replay, Journal, Go-to, and
  floating transport remain usable;
- record accepted screenshots and remaining non-cleanup product questions;
- close Step 418 without selecting a Semantic Drawing entry surface.

Commit intent: `docs(v6): close workspace cleanup phases`

### Phase 6 Gate

- all automated regression results recorded as passing or explicitly accepted;
- human visual acceptance recorded;
- no production placeholder from Classes A/B remains;
- no active Class C surface was removed;
- compact Class D Replay status is accepted;
- owner/domain contracts remain intact;
- working tree is clean.

## Commit And Rollback Map

| Phase | Steps | Rollback scope |
| --- | --- | --- |
| 0 | 419-420 | tests/docs only |
| 1 | 421-422 | top/right clone artifacts |
| 2 | 423-424 | Session Settings shell only |
| 3 | 425-427 | reserved top/left/right tools |
| 4 | 428-429 | bottom placeholders and layout reflow |
| 5 | 430-432 | Replay status presentation only |
| 6 | 433-435 | residue, regression evidence, closeout |

Each implementation commit should be revertible without reverting a different
phase. If a step cannot meet that condition, split it before editing production
code.

## Recommended Next Step

Start with Step 419 only. Do not begin deleting markup until Phase 0 proves the
functional-survival and placeholder-absence harnesses can distinguish real
controls from empty shells.
