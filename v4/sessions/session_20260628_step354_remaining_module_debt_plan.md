# Step 354 - Remaining Module Debt Split Plan

## Goal

Continue the module-debt cleanup after Step 353 before resuming FX Replay
implementation.

The Step 353 follow-up audit found no clearly unreferenced `v4/src` JavaScript
modules and no broad runtime debug noise. The remaining risk is large files
with mixed responsibilities: store normalization, Inspector coordination,
chart context-menu actions, Inspector feature panels/actions, root CSS, and one
very large browser smoke.

## Non-Goals

- Do not implement FX Replay behavior in Step 354.
- Do not change persisted schema shapes except by preserving existing
  compatibility/normalization behavior behind new module boundaries.
- Do not delete `legacy` fields or names mechanically; most current `legacy`
  hits are compatibility paths or old replay mode boundaries.
- Do not move all CSS in one commit.
- Do not force browser smoke into the local smoke suite unless explicitly
  decided; keep local suite fast and headless-browser independent.

## Audit Baseline

Current branch: `refactor/v4-module-boundaries`

Latest relevant verification:

- `python3 v4/scripts/smoke_all.py --suite local`
- `node v4/tests/live-record-smoke.js`
- `node v4/tests/comparison-window-browser-smoke.js`
- `git diff --check`

Audit findings:

- No rough-unreferenced `v4/src/**/*.js` modules.
- Runtime `console.log` is limited to `logger.js` debug output; other log hits
  are tests.
- `temp/tmp` hits are atomic writes or test temp directories.
- `legacy` hits are compatibility schema, legacy replay mode, or old
  secondary-to-pane migration behavior.
- Largest remaining runtime files:
  - `time-reaction/daily-time-review-store.js` 920 lines.
  - `ui/inspector-sidebar.js` 859 lines.
  - `ui/inspector/time-reaction-actions.js` 854 lines.
  - `order/order-setup-chart-actions.js` 811 lines.
  - `live-record/live-record-chart-actions.js` 805 lines.
  - `order/order-review-store.js` 776 lines.
  - `ui/inspector/live-record-panel.js` 771 lines.
  - `ui/inspector/time-reaction-panel.js` 693 lines.
  - `segment/segment-review-metrics.js` 687 lines.
  - `ui/inspector/live-record-actions.js` 650 lines.
  - `ui/inspector/segment-panel.js` 632 lines.
  - `ui/inspector/order-review-reason-actions.js` 632 lines.
  - `pda/pda-renderer.js` 610 lines.
  - `pda/manual-annotation.js` 569 lines.
  - `ui/replay-controls.js` 545 lines.
  - `comparison/comparison-context-menu.js` 543 lines.
  - `live-record/live-record-store.js` 540 lines.
  - `review/review-archive-import-prepare.js` 514 lines.
  - `ui/inspector/order-review-panel.js` 501 lines.
- CSS/test debt:
  - `style.css` 3722 lines after the comparison-window extraction.
  - `data-maintenance.html` 527 lines, currently static layout plus inline page
    CSS.
  - `tests/comparison-window-browser-smoke.js` 1933 lines.
  - `tests/live-record-smoke.js` 1016 lines.

## Step Plan

### Step 354.1 - Split Daily Time Review store

`time-reaction/daily-time-review-store.js` mixes constants, schema
normalization, legacy migration, selectors/content detection, and store
mutation.

Target modules:

- `time-reaction/daily-time-review-types.js`
- `time-reaction/daily-time-review-normalize.js`
- `time-reaction/daily-time-review-selectors.js`

Final responsibility:

- `daily-time-review-store.js` owns in-memory state, persistence-facing load/save
  functions, mutation functions, and event emission.
- New modules own pure constants, schema normalization, legacy migration helpers,
  and read-only selectors.

Automated checks:

- `node v4/tests/daily-time-review-store-smoke.js`
- `node v4/tests/daily-time-review-archive-smoke.js`
- `python3 v4/scripts/smoke_all.py --suite local`
- `git diff --check`

Manual check:

- Open a Daily Time Review in Inspector, edit a section, reload/sync, and confirm
  existing saved content still appears.

Commit message:

- `Split daily time review store`

### Step 354.2 - Continue Inspector sidebar coordinator split

`inspector-sidebar.js` still imports many domains and owns controller
composition, open-object coordination, back-target handling, and chart click
calendar follow logic.

Target modules:

- `ui/inspector/inspector-controller-registry.js`
- `ui/inspector/inspector-open-object-coordinator.js`
- `ui/inspector/inspector-calendar-back-target.js`

Final responsibility:

- `inspector-sidebar.js` initializes shell, creates coordinators, subscribes
  global events, and exposes public open/refresh functions only.

Automated checks:

- `node v4/tests/inspector-shell-boundary-smoke.js`
- `node v4/tests/inspector-selection-router-boundary-smoke.js`
- `node v4/tests/inspector-action-router-boundary-smoke.js`
- `node v4/tests/inspector-calendar-panel-boundary-smoke.js`
- `python3 v4/scripts/smoke_all.py --suite local`
- `git diff --check`

Manual check:

- Select PDA, Segment, SMT, Order Setup, Live Record, Daily Time Review,
  Economic Event, Calendar day, and Entry Context Catalog objects; Back
  navigation and Calendar selected date should remain correct.

Commit message:

- `Split inspector sidebar coordinators`

### Step 354.3 - Split Order Setup chart actions

`order-setup-chart-actions.js` mixes menu rendering, active setup mutation,
hit-menu actions, element edits, source metadata, and status messages.

Target modules:

- `order/order-setup-chart-menu.js`
- `order/order-setup-hit-actions.js`
- `order/order-setup-chart-mutations.js`

Final responsibility:

- `order-setup-chart-actions.js` exports the existing public API and delegates
  to menu/action/mutation modules.

Automated checks:

- `node v4/tests/order-setup-smoke.js`
- `node v4/tests/context-menu-position-smoke.js`
- `python3 v4/scripts/smoke_all.py --suite local`
- `git diff --check`

Manual check:

- Right-click chart, create Order Setup, set entry/MSS/SL/targets, hit-test an
  existing setup element, and confirm active setup status/actions still work.

Commit message:

- `Split order setup chart actions`

### Step 354.4 - Split Live Record chart actions

`live-record-chart-actions.js` mixes menu rendering, active record mutation,
execution element mutation, lifecycle/status actions, hit actions, and linked
refs.

Target modules:

- `live-record/live-record-chart-menu.js`
- `live-record/live-record-hit-actions.js`
- `live-record/live-record-chart-mutations.js`

Final responsibility:

- `live-record-chart-actions.js` exports the existing public API and delegates
  menu/action/mutation work.

Automated checks:

- `node v4/tests/live-record-chart-actions-smoke.js`
- `node v4/tests/live-record-smoke.js`
- `python3 v4/scripts/smoke_all.py --suite local`
- `git diff --check`

Manual check:

- Right-click chart, create Live Record, set entry/SL/targets/result, use hit
  actions, and verify Inspector detail updates.

Commit message:

- `Split live record chart actions`

### Step 354.5 - Split Inspector Time Reaction domain

`ui/inspector/time-reaction-actions.js` and `time-reaction-panel.js` are large
feature modules with multiple Daily Time Review sections mixed together.

Target modules:

- `ui/inspector/time-reaction-bias-actions.js`
- `ui/inspector/time-reaction-opening-actions.js`
- `ui/inspector/time-reaction-reaction-actions.js`
- `ui/inspector/time-reaction-summary-actions.js`
- Matching section view helpers for panel rendering.

Final responsibility:

- Existing action/panel files remain compatibility facades and section
  composition points.

Automated checks:

- `node v4/tests/time-reaction-panel-smoke.js`
- `node v4/tests/daily-time-review-store-smoke.js`
- `node v4/tests/daily-time-review-archive-smoke.js`
- `python3 v4/scripts/smoke_all.py --suite local`
- `git diff --check`

Manual check:

- Edit every Daily Time Review section from Inspector and confirm refs,
  categories, notes, and summaries persist.

Commit message:

- `Split time reaction inspector domain`

### Step 354.6 - Split Inspector Live Record domain

`ui/inspector/live-record-panel.js` and `live-record-actions.js` are large
feature modules mixing display sections, lifecycle, execution, reasons, linked
refs, and result editing.

Target modules:

- `ui/inspector/live-record-panel-header.js`
- `ui/inspector/live-record-panel-execution.js`
- `ui/inspector/live-record-panel-orders.js`
- `ui/inspector/live-record-panel-reasons.js`
- `ui/inspector/live-record-panel-result.js`
- `ui/inspector/live-record-lifecycle-actions.js`
- `ui/inspector/live-record-reason-actions.js`
- `ui/inspector/live-record-execution-actions.js`

Final responsibility:

- Existing panel/action files remain section composition and compatibility
  facades.

Automated checks:

- `node v4/tests/live-record-smoke.js`
- `node v4/tests/live-record-chart-actions-smoke.js`
- `python3 v4/scripts/smoke_all.py --suite local`
- `git diff --check`

Manual check:

- Open Live Record detail, edit lifecycle/display/anchor/execution/orders/reason
  refs/result, and confirm chart + Inspector stay in sync.

Commit message:

- `Split live record inspector domain`

### Step 354.7 - CSS second-stage extraction

`style.css` remains very large. Step 353 established an import pattern with
`styles/comparison-window.css`; continue with one domain per commit-sized
substep.

Extraction order:

1. `styles/toolbar.css`
2. `styles/chart-shell.css`
3. `styles/context-menu.css`
4. `styles/inspector.css`
5. `styles/calendar.css`

Automated checks:

- `node v4/tests/context-menu-position-smoke.js`
- `node v4/tests/comparison-window-browser-smoke.js`
- `node v4/tests/remote-maintenance-responsive-smoke.js` only if maintenance
  layout/styles move.
- `python3 v4/scripts/smoke_all.py --suite local`
- `git diff --check`

Manual check:

- Open app on desktop and narrow viewport; verify toolbar, chart stack, context
  menus, Inspector, Calendar panel, and Comparison pane retain layout.

Commit message:

- `Extract additional CSS domains`

### Step 354.8 - Split comparison browser smoke

`tests/comparison-window-browser-smoke.js` is over 1900 lines and covers too many
workflows in one process.

Target tests:

- `tests/comparison-pane-layout-browser-smoke.js`
- `tests/comparison-context-menu-browser-smoke.js`
- `tests/comparison-overlay-policy-browser-smoke.js`
- `tests/comparison-workspace-browser-smoke.js`
- `tests/comparison-replay-browser-smoke.js`

Final responsibility:

- The old smoke is deleted or becomes a very small aggregator only if useful.
- Shared browser/CDP helpers should be extracted if it avoids copy-paste.

Automated checks:

- Run every new comparison browser smoke.
- `python3 v4/scripts/smoke_all.py --suite local`
- `git diff --check`

Manual check:

- None beyond browser smoke screenshots/behavior already covered unless a new
  helper changes launch/profile behavior.

Commit message:

- `Split comparison browser smoke`

### Step 354.9 - Closeout audit

Record the new baseline after Step 354.

Deliverables:

- Re-run noise scan, rough unreferenced source scan, and large-file audit.
- Extend boundary smoke to protect the new module seams.
- Update TODO/session with completed substeps and remaining defer reasons.

Automated checks:

- `python3 v4/scripts/smoke_all.py --suite local`
- `git diff --check`

Manual check:

- Exercise workflows touched by Step 354: Daily Time Review, Inspector object
  routing, Order Setup chart menu, Live Record chart menu, Live Record
  Inspector, and CSS affected views.

Commit message:

- `Close Step 354 module debt split`

## Recommended Execution Order

1. Step 354.1 first because Daily Time Review store is the largest runtime file
   and the pure normalization/selectors split is low-risk.
2. Step 354.2 next because Inspector sidebar still coordinates many domains.
3. Step 354.3 and 354.4 before Inspector feature panel splits because chart
   action boundaries feed Order/Live Inspector workflows.
4. Step 354.5 and 354.6 after store/action boundaries are cleaner.
5. Step 354.7 after behavior modules are stable, keeping CSS moves isolated.
6. Step 354.8 last because browser smoke split benefits from the stabilized
   comparison/chart modules.
7. Step 354.9 closes the baseline before FX Replay work resumes.
