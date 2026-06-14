# Step 287 Plan - Live Record UI Parity Polish

Date: 2026-06-14

Branch: `feature/journal-order-recording-redesign`

Prerequisite:

- Step 285 cloned the Order Setups object surface into independent Live Records.
- Step 286 added primary chart menu parity, chart-first writes, evidence linking, chart rendering, hit-test/selection, focused smoke, and browser verification.
- Follow-up fix split Live Record chart creation into `Create Bullish Live Record Here` and `Create Bearish Live Record Here`.

## Goal

Make the Live Record user experience feel like a near clone of Order Setups in the actual UI.

This step is not about adding new Journal product scope. It is a parity and polish pass over the surfaces already built:

- Calendar row and group behavior;
- Detail panel layout and density;
- chart right-click menu wording/order/grouping;
- chart renderer labels/colors/active/selected state;
- Live Record element menu behavior;
- browser screenshot-level verification.

## Non-Goals

- No standalone `Live Orders` panel.
- No broker/order-routing/fill import/PnL/statistics.
- No Review JSON archive support for Live Records.
- No secondary chart Live Record parity unless a regression is found.
- No broad generic abstraction between Order Setup and Live Record modules.
- No new data model fields unless required to display existing fields correctly.

## Design Standard

Order Setups is the visual and interaction reference.

Live Records may use different text labels where the concept is genuinely live/execution-specific, but layout density, menu hierarchy, row affordances, detail card rhythm, hit-menu behavior, and chart element readability should feel like the same product family.

## Substeps

### Step 287.1 - UI Parity Audit

Perform a real browser/DOM audit against Order Setups:

- Calendar empty and populated group;
- Calendar row content, status dot, count badge, action menu;
- Detail header, Display, Summary, Anchor, Execution, Reasons, Result;
- chart context menu normal and Shift variants;
- chart element hit menu;
- chart renderer labels, colors, active state, selected state.

Acceptance:

- Session doc records concrete parity gaps with file-level targets.
- No runtime behavior change.

### Step 287.2 - Calendar Row Parity Polish

Tighten Live Record rows against Order Setup rows:

- summary ordering and labels;
- bullish/bearish display consistency;
- hidden state and status dot semantics;
- action menu order and naming;
- empty/populated group density.

Acceptance:

- Live Records group still appears directly after Order Setups.
- Row text is compact and useful after chart-first writes.
- Existing Calendar browser smoke remains green.

### Step 287.3 - Detail Header And Core Panels Polish

Align the Live Record detail top sections:

- header title/meta line;
- Display panel controls;
- Summary textarea sizing;
- Anchor field naming;
- Active/Visible/Updated metadata.

Acceptance:

- Live Record Detail visually matches Order Setup Detail density.
- Hidden/selected state remains readable.
- No Order Setup detail regression.

### Step 287.4 - Execution / Result Detail Polish

Make chart-written Live Record execution state easier to read:

- Entry / MSS / Stop / Targets row labels;
- end-time metadata;
- selected/hidden state;
- result exit timestamp/price/status;
- empty execution state.

Acceptance:

- Detail updates immediately after chart actions.
- Smoke covers chart-written execution/result display.

### Step 287.5 - Reasons / Evidence Link Polish

Align Live Record Reasons with Order Setup Reasons:

- reason card title/category layout;
- ref row label formatting;
- linked object type labels;
- duplicate link behavior visibility if practical.

Acceptance:

- Linked PDA/Segment/Composite/SMT/Chart Note refs are readable in Live Record Detail.
- Existing evidence de-dupe tests stay green.

### Step 287.6 - Context Menu Parity Polish

Refine Live Record chart menu hierarchy:

- creation actions at top: bullish/bearish;
- active Live Record label placement;
- separators matching Order Setup menu;
- write actions order;
- target submenu labels;
- Shift end-action layout;
- evidence link group placement;
- disabled states and status messages.

Acceptance:

- Live Record menu reads as a sibling of Order Setup menu.
- No click falls through to unrelated handlers.
- Browser/focused smoke covers bullish and bearish creation.

### Step 287.7 - Chart Renderer Visual Polish

Tune chart element visuals:

- anchor marker label and position;
- entry/stop/target/result labels;
- active record emphasis;
- selected element emphasis;
- hidden record/element rendering;
- color choices that distinguish Live Record while staying close to Order Setup.

Acceptance:

- Live Record elements are visible and not confused with Order Setup elements.
- Active/selected states are obvious.
- Renderer still clears cleanly on bars cleared/instrument changes.

### Step 287.8 - Hit Menu And Element Actions Polish

Polish right-click-on-element behavior:

- hit menu row ordering;
- Set Active vs Select wording;
- hide/delete element status messages;
- delete record safety behavior;
- selection clearing after delete/hide.

Acceptance:

- Element actions mutate only Live Records.
- Selected element state is consistent after hide/delete/delete record.
- Focused smoke covers the action results.

### Step 287.9 - Browser Screenshot / Visual Verification

Add or run browser verification for representative states:

- empty Live Records group;
- bullish Live Record row;
- bearish Live Record row;
- detail with execution/target/result/evidence;
- chart canvas with rendered Live Record elements;
- Live Record element context menu when possible.

Acceptance:

- Browser smoke or documented screenshots verify the parity surfaces.
- No standalone `Live Orders` panel appears.

### Step 287.10 - Closeout

Final audit and documentation:

- run focused Live Record smoke;
- run Order Setup smoke;
- run browser smoke;
- run `git diff --check`;
- update TODO/session with exact outcomes.

Acceptance:

- Step 287 is marked complete only after parity polish and verification pass.
- Worktree is clean after final commit.

## Suggested Execution Order

Execute Step 287.1 through Step 287.10 sequentially.

Each implementation substep should be committed separately. If Step 287.1 finds a larger UI mismatch than expected, split the affected substep before editing runtime code.

## Risk Notes

- Calendar and Detail share styling with Order Setups, so small CSS changes can affect both object families.
- Context menu ordering is easy to regress because Live Record and Order Setup menus are rendered in the same primary chart menu.
- Renderer polish should avoid introducing heavy abstractions or changing Order Setup primitives.
- Browser screenshot checks are useful here because the user-facing goal is visual/interaction parity, not only data correctness.

## Step 287.1 Completion - UI Parity Audit

Completed on 2026-06-14.

Audit inputs:

- `v4/tests/live-record-browser-smoke.js` passed against the current page.
- Compared Calendar row rendering in `v4/src/ui/inspector/calendar-panel.js`.
- Compared Calendar summaries in `v4/src/calendar/calendar-review-index.js`.
- Compared Order Setup Detail and Live Record Detail in:
  - `v4/src/ui/inspector/order-review-panel.js`
  - `v4/src/ui/inspector/live-record-panel.js`
- Compared Order Setup and Live Record chart menus/renderers in:
  - `v4/src/order/order-setup-chart-actions.js`
  - `v4/src/live-record/live-record-chart-actions.js`
  - `v4/src/order/order-review-renderer.js`
  - `v4/src/live-record/live-record-renderer.js`

Concrete parity gaps:

- Calendar row summary: Live Record summary includes status and an `Exit` phrase, while Order Setup summary is tighter. Step 287.2 should keep live-specific result data but make the row scan like Order Setup.
- Calendar row actions: Live Record has extra Set Active / Link Active Setup actions. Step 287.2 should keep these, but order and labels should mirror Order Setup row action rhythm.
- Detail header/core panels: Live Record already reuses compact Order Setup sections, but header metadata says `Active Live Record` and anchor direction uses Bullish/Bearish while header uses Long/Short. Step 287.3 should make direction vocabulary consistent.
- Execution/Result: Live Record rows render execution fields, but empty/hidden/selected state and end-time metadata are more verbose than Order Setup. Step 287.4 should tighten row metadata.
- Reasons/evidence: Live Record ref rows use generic `titleCase(type)` and raw ids. Order Setup has dedicated ref label helpers, source context, and shortened ids. Step 287.5 should clone those formatting helpers locally.
- Context menu: Live Record menu lacks the same divider structure as Order Setup. Evidence links are currently before write actions, while Order Setup places link actions after write/target actions. Step 287.6 should reorder/group with dividers.
- Renderer: Live Record labels include `Live Entry`, `Live Stop`, and `Live Exit`; colors are close but not deliberately paired with Order Setup. Step 287.7 should decide whether to keep `Live` prefixes only where needed and tune colors/labels.
- Hit menu: Live Record element menu repeats Delete Live Record for every hit row and has no clear-active row. Step 287.8 should reduce repeated destructive actions and align wording/order.

Verification:

- `node v4/tests/live-record-browser-smoke.js`

Note: Node still reports the existing typeless package warning for ES module tests.

Next step: Step 287.2 polishes Calendar row parity.
