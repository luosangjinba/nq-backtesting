# Step 288 Plan - Live Record Lifecycle / Review Workflow

Date: 2026-06-14

Branch: `feature/journal-order-recording-redesign`

Prerequisite:

- Step 285 cloned the Order Setups object surface into independent Live Records.
- Step 286 added Live Record chart-first creation, writes, evidence linking, renderer, hit-test, and selection.
- Step 287 polished Live Records to behave visually like an Order Setups sibling.
- Follow-up fix guarded Live Record end updates so empty execution elements are not polluted.

## Goal

Turn Live Records from a chart-editable object into a complete journal workflow object.

Step 288 should make the lifecycle explicit and usable:

- create a Live Record as planned, active, submitted/filled, cancelled, closed, or reviewed;
- close or cancel a Live Record without deleting it;
- write post-trade review fields in the Live Record detail;
- see lifecycle state clearly in Calendar rows and detail headers;
- filter/open records by lifecycle state during review;
- optionally attach the Live Record to an Order Setup as execution/review evidence;
- preserve the current clone-first UI model and avoid a standalone `Live Orders` panel.

## Non-Goals

- No broker/order-routing integration.
- No external fill import.
- No automated PnL, position sizing, commissions, or statistics dashboard.
- No new standalone Live Orders workspace or table.
- No migration away from the current independent `liveRecords` store.
- No broad generic abstraction between Order Setup and Live Record modules.
- No secondary chart Live Record creation unless needed to fix a regression.

## Product Boundary

Order Setups remain the trade thesis / plan object.

Live Records become the live execution / journal object. A Live Record may remain standalone, but when linked to an Order Setup it should behave as that setup's execution evidence rather than replacing the setup.

The main workflow should be:

1. Create Bullish/Bearish Live Record from chart.
2. Set execution elements and evidence from the chart.
3. Advance lifecycle state as the trade develops.
4. Close/cancel the record.
5. Add review notes/result.
6. Mark reviewed when post-trade review is complete.

## Lifecycle Semantics

Initial status:

- New chart-created Live Records should default to `active` or keep `draft` only if we deliberately decide that "created but not in trade" is the default. Step 288.1 must freeze this choice before code changes.

Allowed statuses already exist:

- `draft`
- `planned`
- `active`
- `submitted`
- `filled`
- `cancelled`
- `closed`
- `reviewed`

Step 288 should not add statuses unless the audit proves the existing set is insufficient.

Expected transition actions:

- Set Planned
- Set Active
- Mark Submitted
- Mark Filled
- Cancel
- Close
- Mark Reviewed
- Reopen / Back To Active, only if needed for correction

## Substeps

### Step 288.1 - Freeze Lifecycle And Review Boundary

Audit current Live Record store/actions/panel/calendar/chart action behavior and freeze:

- default status for newly chart-created Live Records;
- allowed lifecycle transitions;
- which actions belong in Calendar row menu, Detail header, and chart context menu;
- review fields to expose now;
- which status labels should affect rendering, row summaries, and filtering.

Acceptance:

- Session doc records lifecycle semantics and transition table.
- TODO/session updated with the frozen boundary.
- No runtime code changes except docs.

### Step 288.2 - Normalize Lifecycle Helpers And Status Metadata

Add focused lifecycle helpers around existing `LIVE_RECORD_STATUSES`:

- status label formatter;
- terminal status guard (`cancelled`, `closed`, `reviewed`);
- review-needed guard;
- transition validation helper;
- default creation status helper.

Keep helpers in the Live Record domain and avoid changing Order Setup behavior.

Acceptance:

- Existing Live Record normalization remains compatible.
- Invalid status input still normalizes safely.
- Focused smoke covers status metadata and allowed transitions.

### Step 288.3 - Add Lifecycle Actions

Add Live Record lifecycle action functions:

- set status;
- close active / close by id as real status update, not only clearing active id;
- cancel record;
- mark reviewed;
- reopen if accepted in Step 288.1;
- clear active remains available as a view-state action.

All mutations must use `recordHistory()`.

Acceptance:

- Calendar/detail actions can mutate status without deleting records.
- Active record state stays consistent when a record becomes terminal.
- Undo/redo restores lifecycle status and active state where applicable.

### Step 288.4 - Detail Header Lifecycle Controls

Update Live Record Detail to expose lifecycle controls in the top area:

- current status badge;
- compact action buttons for the next likely lifecycle transitions;
- closed/cancelled/reviewed metadata in the header line;
- status change feedback.

Acceptance:

- Detail header does not become a large form.
- Terminal records remain readable and can still be reviewed.
- Status controls do not affect Order Setup detail.

### Step 288.5 - Review Fields In Detail

Extend the Live Record detail review section with a compact review workflow:

- result status;
- result note;
- execution review note;
- mistake/discipline category if it fits existing `reasons` or result shape;
- reviewed checkbox/action mapped to lifecycle `reviewed`.

Prefer using existing `result.note`, `reasons[]`, and `summary` before adding new fields. If a new field is unavoidable, document why and normalize it.

Acceptance:

- User can close a record, write review notes, set result, and mark reviewed from Detail.
- Existing Step 285-287 records still render and normalize.
- Smoke covers review edits and status changes.

### Step 288.6 - Calendar Row Lifecycle Workflow

Update Calendar Live Records rows:

- status badge/summary reflects lifecycle state;
- row menu includes lifecycle actions in a compact order;
- terminal statuses are visible without hiding the row;
- reviewed records are distinguishable but not removed.

Acceptance:

- Live Records group still sits directly under Order Setups.
- Row density remains close to Order Setup rows.
- Calendar actions mutate only Live Records.

### Step 288.7 - Lifecycle-Aware Chart Menu And Hit Menu

Update chart context behavior:

- replace ambiguous `Close Active Live Record` wording if it only clears active;
- add lifecycle status actions where they belong;
- prevent terminal records from being accidentally chart-written unless Step 288.1 allows reopening/editing;
- hit menu exposes Set Active/Open/Review-friendly actions without clutter.

Acceptance:

- Clear active and close trade are no longer semantically confused.
- Chart writes to terminal records are either guarded or explicitly allowed with clear feedback.
- Focused chart action smoke covers terminal status behavior.

### Step 288.8 - Link Live Record Review To Order Setup

Polish the optional Order Setup link as a review workflow:

- link active Live Record to active Order Setup;
- unlink;
- show linked setup label in Live Record Detail and Calendar row;
- if practical, show linked Live Records from the Order Setup detail as execution evidence.

Do not make Live Record require an Order Setup.

Acceptance:

- Linking/unlinking does not mutate Order Setup execution fields.
- Linked Live Record remains its own persisted object.
- User can navigate from Live Record to linked Order Setup and back if the existing routes allow it.

### Step 288.9 - Calendar / Archive Filtering For Review

Add lightweight review workflow filtering:

- Calendar Day Details can filter or visually group open/closed/reviewed Live Records;
- Archive/search surfaces include Live Records if there is an existing low-risk pattern;
- reviewed records are not hidden by default.

Keep this scoped; do not build a dashboard.

Acceptance:

- User can find records needing review without scanning every row manually.
- Existing Calendar object counts remain correct.
- No standalone Live Orders panel appears.

### Step 288.10 - Review JSON / Persistence Audit

Audit and, if necessary, extend Review JSON export/import for Live Records:

- preserve lifecycle status;
- preserve review notes/result/reasons;
- preserve linked Order Setup id;
- preserve instrument-scoped separation;
- reject or skip mismatched instrument data consistently with existing archive behavior.

If full Review JSON support is too large, record the exact gap and make this substep a design/guard pass only.

Acceptance:

- LocalStorage persistence keeps lifecycle/review fields across reload.
- Review JSON behavior is explicitly tested or explicitly documented as deferred.
- No `orderReviews` schema migration is required.

### Step 288.11 - Focused And Browser Verification

Expand tests for the complete lifecycle workflow:

- create Live Record;
- set entry/stop/target/result;
- transition through active/filled/closed/reviewed or the frozen equivalent path;
- edit review notes;
- link/unlink Order Setup;
- Calendar row status/menu behavior;
- terminal record chart-write guard if implemented;
- reload persistence;
- no standalone `Live Orders` panel.

Acceptance:

- `live-record-smoke` passes.
- `live-record-chart-actions-smoke` passes.
- `live-record-browser-smoke` covers lifecycle/review flow.
- `order-setup-smoke` passes.
- `git diff --check` passes.

### Step 288.12 - Documentation And Closeout

Update handoff docs and user-facing docs if needed:

- lifecycle semantics;
- primary workflow;
- what Live Record is and is not;
- relation to Order Setup;
- known non-goals and deferred items.

Acceptance:

- TODO marks Step 288 complete only after tests and browser verification.
- Session doc records exact files changed and verification results.
- Worktree is clean after final commit.

## Suggested Execution Order

Execute Step 288.1 through Step 288.12 sequentially.

Each implementation substep should be committed separately. Step 288.1 is documentation/design only. If Review JSON support in Step 288.10 is larger than expected, split it into a follow-up step rather than mixing archive migration with lifecycle UI.

## Risk Notes

- The word "Close" currently means clearing active state in parts of the chart menu. Step 288 must separate "clear active selection" from "close the trade record".
- Terminal statuses can conflict with chart-first editing. The plan must choose whether closed/reviewed records are editable or require reopen.
- Review fields should not recreate a large form or standalone journal panel.
- Linking Live Records to Order Setups should remain evidence-level linking, not a hidden mutation of setup execution data.
- Review JSON support may touch broader archive code; keep it scoped and test instrument isolation.

## Step 288.1 Completion - Lifecycle And Review Boundary Frozen

Completed on 2026-06-14.

Audit inputs:

- `v4/src/live-record/live-record-types.js`
- `v4/src/live-record/live-record-active.js`
- `v4/src/live-record/live-record-chart-actions.js`
- `v4/src/live-record/live-record-store.js`
- `v4/src/live-record/live-record-set.js`
- `v4/src/ui/inspector/live-record-actions.js`
- `v4/src/ui/inspector/live-record-panel.js`
- `v4/src/calendar/calendar-review-index.js`
- `v4/tests/live-record-smoke.js`
- `v4/tests/live-record-chart-actions-smoke.js`
- `v4/tests/live-record-browser-smoke.js`

Frozen lifecycle semantics:

- New chart-created Live Records will default to `active`. The current `draft` default remains the normalizer fallback for imported/legacy/malformed data, but chart-first creation represents a live journal action and should become active immediately.
- `draft` and `planned` are pre-trade states.
- `active`, `submitted`, and `filled` are open/live states.
- `cancelled`, `closed`, and `reviewed` are terminal states for chart writing.
- `reviewed` means post-trade review is complete. It is terminal, but the user may reopen to correct a record.
- Reopen returns the record to `active`.

Allowed transition table for Step 288:

| From | Allowed next statuses |
| --- | --- |
| `draft` | `planned`, `active`, `cancelled` |
| `planned` | `active`, `submitted`, `cancelled` |
| `active` | `submitted`, `filled`, `cancelled`, `closed`, `reviewed` |
| `submitted` | `filled`, `cancelled`, `closed` |
| `filled` | `closed`, `reviewed` |
| `cancelled` | `active` |
| `closed` | `reviewed`, `active` |
| `reviewed` | `active` |

Terminology decisions:

- `Clear Active Live Record` means only clear the active selection/view state.
- `Close Live Record` means set `status=closed`.
- `Cancel Live Record` means set `status=cancelled`.
- `Mark Reviewed` means set `status=reviewed`.
- Existing "Close Active Live Record" chart menu text must be renamed because it currently only clears active state.

Field decisions:

- Reuse `summary` for the short journal summary.
- Reuse `result.status` and `result.note` for outcome and post-trade result notes.
- Reuse `reasons[]` for execution/review rationale and discipline notes; do not add a broad new review form in Step 288 unless a later substep proves it is necessary.
- Keep `orderSetupId` as the optional link to an Order Setup. A Live Record remains standalone by default.

Entry point decisions:

- Detail header gets compact lifecycle controls.
- Calendar row menu gets status actions and keeps density close to Order Setup rows.
- Chart menu gets `Clear Active Live Record` for view state, and status actions only where they do not clutter primary chart writing.
- Terminal records cannot receive chart write actions until reopened. This prevents accidental post-review edits from right-click writes.

Non-goals reaffirmed:

- No standalone `Live Orders` panel.
- No broker/fill import/PnL/statistics.
- No required Order Setup parent.
- No broad shared abstraction with Order Setup modules.

Next step: Step 288.2 adds lifecycle helpers and status metadata around these frozen semantics.

## Step 288.2 Completion - Lifecycle Helpers Added

Completed on 2026-06-14.

Implemented:

- Added `v4/src/live-record/live-record-lifecycle.js`.
- Centralized Live Record status labels.
- Added `getLiveRecordDefaultChartStatus()` returning `active` for chart-created records.
- Added open/terminal status guards.
- Added `needsLiveRecordReview()` for closed/filled records that are not reviewed.
- Added transition table helpers:
  - `getLiveRecordAllowedNextStatuses()`
  - `canTransitionLiveRecordStatus()`

Verification:

- Extended `v4/tests/live-record-smoke.js` to cover default chart status, labels, open/terminal guards, needs-review semantics, and transition validation.
- Ran `node v4/tests/live-record-smoke.js`.

Note:

- This substep intentionally does not yet change chart creation or action behavior. Step 288.3 wires the helpers into mutation actions.

Next step: Step 288.3 adds lifecycle mutation actions and connects chart-created records to the frozen default status.

## Step 288.3 Completion - Lifecycle Actions Added

Completed on 2026-06-14.

Implemented:

- Added `v4/src/live-record/live-record-lifecycle-actions.js`.
- Added `setLiveRecordLifecycleStatus()`.
- Added wrappers:
  - `closeLiveRecord()`
  - `cancelLiveRecord()`
  - `markLiveRecordReviewed()`
  - `reopenLiveRecord()`
- Lifecycle mutations validate the frozen transition table from Step 288.1.
- Lifecycle mutations are wrapped in `recordHistory()`.
- Terminal statuses clear active Live Record selection when the affected record is active.
- `createLiveRecordFromAnchor()` now defaults chart-created records to `active` via `getLiveRecordDefaultChartStatus()`.

Verification:

- Extended `v4/tests/live-record-smoke.js` to cover invalid transitions, close/cancel/review/reopen actions, active clearing on terminal status, and chart-created default `active` status.
- Ran `node v4/tests/live-record-smoke.js`.
- Ran `node v4/tests/live-record-chart-actions-smoke.js`.

Next step: Step 288.4 exposes compact lifecycle controls in the Live Record Detail header.

## Step 288.4 Completion - Detail Lifecycle Controls Added

Completed on 2026-06-14.

Implemented:

- Live Record Detail header now shows the lifecycle status next to the instrument.
- Header metadata shows `Needs Review` for records that are closed/filled but not reviewed.
- Header renders compact transition buttons from the lifecycle transition table.
- Button labels use review-friendly text such as `Close`, `Cancel`, `Mark Reviewed`, and `Reopen`.
- Inspector action controller handles `live-record-status` and delegates to lifecycle actions.

Verification:

- Extended `v4/tests/live-record-smoke.js` to verify status rendering, transition buttons, and close/review status updates from Detail actions.
- Ran `node v4/tests/live-record-smoke.js`.

Next step: Step 288.5 polishes the Detail review fields without adding a large standalone review form.

## Step 288.5 Completion - Detail Review Fields Added

Completed on 2026-06-14.

Implemented:

- Added normalized `result.executionReviewNote`.
- Live Record Detail Result panel now includes:
  - result status;
  - result note;
  - execution review note;
  - reviewed checkbox.
- Reviewed checkbox marks the record `reviewed` when checked.
- Unchecking a reviewed record reopens it to `active`.
- Discipline/mistake information continues to use existing `reasons[]` categories, especially `discipline`, instead of adding another large review form.

Verification:

- Extended `v4/tests/live-record-smoke.js` to cover result normalization, Detail rendering, execution review editing, and reviewed toggle behavior.
- Ran `node v4/tests/live-record-smoke.js`.

Next step: Step 288.6 adds lifecycle status and actions to Calendar Live Record rows.

## Step 288.6 Completion - Calendar Lifecycle Rows Added

Completed on 2026-06-14.

Implemented:

- Calendar Live Record summaries now show lifecycle terminal statuses such as `Closed` and `Reviewed`.
- Calendar summaries show `Needs Review` for closed/filled records that have not been reviewed.
- Calendar Live Record row menu now renders lifecycle transition actions using the same transition table as Detail.
- Calendar lifecycle menu labels use review workflow wording such as `Close`, `Mark Reviewed`, and `Reopen`.

Verification:

- Extended `v4/tests/live-record-smoke.js` to render Calendar panel rows, assert lifecycle action buttons, and verify closed/reviewed summary text.
- Ran `node v4/tests/live-record-smoke.js`.

Next step: Step 288.7 separates chart `Clear Active` wording from actual lifecycle close and guards terminal records from chart writes.

## Step 288.7 Completion - Chart Lifecycle Guard Added

Completed on 2026-06-14.

Implemented:

- Renamed chart menu view-state action from `Close Active Live Record` to `Clear Active Live Record`.
- Added Live Record lifecycle status actions to the chart menu and hit menu.
- Terminal active records disable chart write menu rows.
- `patchActiveFromChart()` rejects writes to terminal records with a reopen-first status message.
- Synthetic hit-menu rows without a stored record continue to render safely.

Verification:

- Updated `v4/tests/live-record-smoke.js` for the new `Clear Active` wording and lifecycle chart menu actions.
- Extended `v4/tests/live-record-chart-actions-smoke.js` to close a record, force it active for guard coverage, assert chart writes fail, and reopen it.
- Ran `node v4/tests/live-record-smoke.js`.
- Ran `node v4/tests/live-record-chart-actions-smoke.js`.

Next step: Step 288.8 polishes the optional Live Record to Order Setup review link workflow.

## Step 288.8 Completion - Linked Setup Workflow Polished

Completed on 2026-06-14.

Implemented:

- Live Record Detail now includes a compact `Linked Order Setup` panel.
- The panel shows:
  - linked setup label;
  - missing setup label when the stored id no longer resolves;
  - `Open Setup` when a linked setup exists;
  - `Link Active Setup`;
  - `Unlink Setup`.
- Calendar Live Record summary now includes a short linked setup id when the linked setup exists.
- Live Records remain standalone by default; linking does not mutate Order Setup execution fields.

Verification:

- Extended `v4/tests/live-record-smoke.js` to cover the linked setup panel, Open Setup action rendering, link/unlink, and Calendar linked setup summary.
- Ran `node v4/tests/live-record-smoke.js`.

Next step: Step 288.9 adds lightweight review filtering/search support without introducing a standalone Live Orders panel.
