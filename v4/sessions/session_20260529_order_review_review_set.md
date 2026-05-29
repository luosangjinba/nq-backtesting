# V4 Order Review Review Set Cleanup

## Branch
- `feature/order-review-cleanup`

## Objective
- Rebuild the Order Setup infrastructure around the concept that one Order Setup is one Review Set.
- Keep the existing `OrderReview` / `orderReviews` persistence schema compatible during the first migration pass.

## Step 96 Completed
- Updated `v4/docs/ORDER_REVIEW_DESIGN.md` with the Review Set boundary.
- Updated `v4/TODO.md` with Phase 8F implementation steps.

## Decisions
- A Review Set is the chart-facing and interaction-facing container for one planned or reviewed trade idea.
- The existing `OrderReview` record remains canonical storage for now.
- `Review Set` is an adapter/infrastructure abstraction, not a new persisted schema in the first pass.
- Linked `PDA / Segment / Composite / SMT` objects remain references only.
- Calendar, locate, active selection, visibility, focus, and renderer grouping should move toward the Review Set adapter.
- Future schema rename or export format changes require a separate compatibility pass.

## Next Step
- Step 97: add a Review Set adapter over `getOrderReviews()`.

## Step 97 Completed
- Added `v4/src/order/order-review-set.js`.
- The adapter exposes:
  - `getReviewSets()`
  - `getReviewSetById()`
  - `getReviewSetTimeRange()`
  - `locateReviewSet()`
- The adapter maps one existing `OrderReview` to one `order-setup` Review Set without changing localStorage or Review JSON.
- Inspector Order Review locate now routes through `locateReviewSet()` while keeping the existing user-facing action name.

## Next Step
- Step 98: migrate active Order Setup semantics toward active Review Set while keeping existing active id compatibility.

## Step 98 Completed
- Updated `v4/src/order/order-review-active.js` so the internal active state is `activeReviewSetId`.
- Added Review Set active APIs:
  - `getActiveReviewSetId()`
  - `getActiveReviewSet()`
  - `setActiveReviewSet()`
  - `clearActiveReviewSet()`
  - `createChartReviewSet()`
  - `updateActiveReviewSet()`
  - `linkRefToActiveReviewSet()`
- Kept existing Order Review active APIs as compatibility wrappers.
- `order-review-active:changed` now emits both Review Set fields and legacy Order Review fields.
- Updated chart right-click Order Setup actions to write through active Review Set APIs.
- Updated Inspector active setup operations to use active Review Set APIs while preserving existing panel option names.

## Next Step
- Step 99: reorganize the Inspector Order Reviews panel around Review Set summaries and keep detailed editing collapsed.

## Step 99 Completed
- Updated `v4/src/ui/inspector/order-review-panel.js` so the Inspector section is now titled `Review Sets`.
- Each row derives a Review Set view from the existing `OrderReview`.
- Default row content is now compact:
  - title
  - updated meta
  - setup / entry / risk / targets / result / refs summary
  - Set Active / Locate / Delete actions
- Result and note controls moved into a collapsed `Quick Review` section.
- Full setup / entry / result editing remains in collapsed `Advanced Edit`.
- Added compact action and quick-edit styles in `v4/style.css`.

## Next Step
- Step 100: move Calendar object grouping and locate/open behavior onto the Review Set adapter.

## 2026-05-29 Planning Update - Setup Set Tree
- User clarified the desired setup workflow from zero:
  - mark reversal time
  - mark entry as one combined time + price annotation
  - mark target1 / target2 / target3 / final target
  - record what happened before reversal without forcing every setup to contain 1H segment or PDA
  - allow complete explanation sets such as 1H segment, PDA, 30m body touch FVG CE, 1m sweep EQL, SMT, or other manual event sets
  - keep regime / bias as notes because they are not reliably chart-markable
- Decision: a setup should be modeled as a large set containing:
  - `orderElements`
  - `explanationElements`
- Tree direction:
  - `Setup Set`
  - `orderElements`: reversal, entry(time+price), stopLoss, targets[], result
  - `explanationElements`: refs[], manualEvents[], note
- Added Phase 8G Steps 103-110 to `v4/TODO.md`.
- Recommended next implementation step is Step 103: write the Setup Set boundary into the design document before changing runtime code.

## Step 103 Completed
- Updated `v4/docs/ORDER_REVIEW_DESIGN.md` with the Setup Set tree boundary.
- Defined `Setup Set` as the full annotation package for one trade idea.
- Split the tree into:
  - `orderElements`: reversal, entry(time+price), stopLoss, targets[], result
  - `explanationElements`: refs[], manualEvents[], note
  - `metadata`
- Clarified that explanation elements are flexible and do not require every setup to contain 1H segment or PDA.
- Clarified that complete explanation sets can include Segment, Composite, PDA, SMT, 30M FVG CE touch, 1M EQL sweep, or other manual event sets.
- Clarified that existing objects are referenced only and must not be copied or mutated by the Setup Set.
- Added compatibility mapping from the current `OrderReview` fields into the future Setup Set tree.
- Marked Step 103 complete in `v4/TODO.md`.

## Next Step
- Step 104: add a Setup Set adapter derived from current `OrderReview` records, with a node probe for reversal, entry, stop, targets, refs, and notes.

## Step 104 Completed
- Added `v4/src/order/setup-set.js`.
- The adapter derives a Setup Set tree from the existing `OrderReview` schema without changing localStorage or Review JSON.
- Exposed:
  - `createSetupSetFromOrderReview()`
  - `getSetupSets()`
  - `getSetupSetById()`
  - `getSetupSetTimeRange()`
  - `locateSetupSet()`
- Derived tree:
  - `orderElements.reversal`
  - `orderElements.entry`
  - `orderElements.stopLoss`
  - `orderElements.targets[]`
  - `orderElements.result`
  - `explanationElements.refs[]`
  - `explanationElements.manualEvents[]`
  - `explanationElements.notes[]`
- Verified with a node probe covering reversal, entry, stop, targets, refs, notes, range, and locate callback.

## Next Step
- Step 105: update chart right-click actions to create and set order elements on the active Setup Set.

## Step 105 Completed
- Updated `v4/src/order/order-setup-chart-actions.js`.
- The chart right-click Order Setup menu now exposes order-element actions:
  - `Create Bullish Setup Here`
  - `Create Bearish Setup Here`
  - `Set Reversal Here`
  - `Set Entry Here`
  - `Set Stop Loss Here`
  - `Set Target1 Here`
  - `Set Target2 Here`
  - `Set Target3 Here`
  - `Set Final Target Here`
- `Set Entry Here` now writes entry timestamp, timeframe, and price in one action.
- Legacy handlers for `Set Setup Event`, `Set Entry Time`, and `Set Entry Price` remain supported for compatibility, but are no longer shown in the menu.
- Verified with node checks and a probe that create/reversal/entry/stop/targets are reflected in the derived Setup Set tree.

## Next Step
- Step 106: add chart right-click actions for explanation elements, including manual explanation events.

## Step 106 Completed
- Added `manualEvents` support under `setupThesis` normalization in `v4/src/order/order-review-store.js`.
- `manualEvents` are cloned, normalized, saved through localStorage, and remain compatible with Review JSON.
- Updated chart right-click Order Setup actions:
  - existing PDA / Segment / Composite / SMT links remain refs
  - added `Add Manual Explanation Event Here`
- Manual explanation event first version records:
  - timestamp
  - timeframe
  - eventType
  - optional price
  - note
- The right-click action prompts for type and note, while timestamp/timeframe/price come from the chart click context.
- Updated user guides to explain when to use manual explanation events.
- Verified with node checks and a probe that a manual event is persisted and appears in `explanationElements.manualEvents[]`.

## Next Step
- Step 107: render Setup Set order elements as one grouped chart annotation set.

## Step 107 Completed
- Updated `v4/src/order/order-review-renderer.js` to consume `getSetupSets()` instead of raw `getOrderReviews()`.
- Renderer now uses the Setup Set tree:
  - `orderElements.reversal`
  - `orderElements.entry`
  - `orderElements.stopLoss`
  - `orderElements.targets[]`
  - `orderElements.result`
- Reversal renders as a local price helper label, not a full-height vertical line.
- Entry, stop, target1/2/3/final target, risk zone, and exit render as one grouped set of primitives per Setup Set.
- Active setup is rendered with slightly stronger entry/target line width and brighter entry/target colors.
- Marked Step 107 complete in `v4/TODO.md`.

## Next Step
- Step 108: refit the Inspector summary/edit sections around the Setup Set tree and expose manual explanation events.

## Step 108 Completed
- Updated `v4/src/ui/inspector/order-review-panel.js` to derive rows from `createSetupSetFromOrderReview()`.
- Default Inspector row now summarizes the Setup Set tree:
  - reversal
  - entry
  - stop
  - targets
  - result
  - explanation element count
- Added an `Explanation Elements` compact block that lists:
  - linked refs
  - manual explanation events
  - notes
- Manual events now appear in the Inspector default view, so cases like `1H respect previous FVG` can be reviewed without opening the full advanced form.
- Added compact CSS for explanation rows in `v4/style.css`.
- Marked Step 108 complete in `v4/TODO.md`.

## Next Step
- Step 109: move Calendar / Locate grouping to Setup Set and ensure locate flash covers the setup core range.

## Step 109 Completed
- Updated `v4/src/ui/inspector/calendar-panel.js` to group setup rows from `getSetupSets()`.
- Calendar setup badges now use Setup Set `primaryTimestamp`.
- Calendar day rows now label the group as `Setup Sets`.
- Setup Set calendar rows use the Setup Set `range`, derived from reversal / entry / result, instead of recomputing raw `OrderReview` timestamps.
- Calendar `Open` now supports `order-setup` rows by setting the target Setup Set active and returning to the default Inspector view.
- Locate continues to use the object range embedded in the calendar row, now sourced from Setup Set core range.
- Marked Step 109 complete in `v4/TODO.md`.

## Next Step
- Step 110: compatibility and interaction acceptance pass for the Setup Set migration.

## Step 110 Completed
- Ran full static check:
  - `node --check` for every `v4/src/**/*.js`
  - `git diff --check HEAD`
- Ran store / compatibility probe:
  - create `OrderReview`
  - export through `getOrderReviews()`
  - reload through `loadOrderReviews()`
  - derive Setup Set via `getSetupSetById()`
  - verified reversal, entry, targets, refs, manual event, notes, and core range
- Ran Calendar render probe:
  - setup badge present
  - `Setup Sets` group present
  - setup row supports Open
  - locate start comes from Setup Set range
- Ran headless Chrome smoke:
  - page loaded
  - injected compatible `orderReviews` localStorage payload
  - loaded 932 1M bars for 2012-01-09
  - verified Review Sets, Setup Set, Explanation Elements, manual event text, Calendar Setup Sets, and chart canvases
  - no runtime exceptions
- V4 API health check returned `{"status":"ok","version":"4.0"}`.

## Next Step
- Review current branch, then decide whether to commit Step 110 and merge this cleanup branch.

## Context Handoff Before New
- Current branch: `feature/order-review-cleanup`.
- Latest commit: `8661496 docs(v4): record setup set acceptance pass`.
- Tracked working tree state before this handoff update was clean; only unrelated untracked files were present:
  - `__pycache__/`
  - `tmp/`
  - `trading_data.duckdb`
  - `v3/plans/`
- Current purpose of this branch:
  - Clean up Order Review around the idea that one order setup is a set.
  - Keep existing persistence compatibility (`OrderReview`, `orderReviews`, localStorage key `v4:order-reviews:NQ`).
  - Add runtime adapters so UI, chart renderer, and Calendar can reason in Setup Set terms.
- Important implemented files:
  - `v4/src/order/order-review-set.js`
  - `v4/src/order/setup-set.js`
  - `v4/src/order/order-review-active.js`
  - `v4/src/order/order-review-store.js`
  - `v4/src/order/order-setup-chart-actions.js`
  - `v4/src/order/order-review-renderer.js`
  - `v4/src/ui/inspector/order-review-panel.js`
  - `v4/src/ui/inspector/calendar-panel.js`
  - `v4/src/ui/inspector-sidebar.js`
  - `v4/docs/ORDER_REVIEW_DESIGN.md`
  - `v4/docs/USER_GUIDE.zh-CN.md`
  - `v4/docs/USER_GUIDE.en.md`
- Setup Set tree boundary:
  - `orderElements`: reversal, entry(time+price), stopLoss, targets[], result
  - `explanationElements`: refs[], manualEvents[], notes[]
  - `metadata`: ids, direction, instrument, timeframe, source schema
- Current right-click Order Setup workflow:
  - Create Bullish/Bearish Setup Here
  - Set Reversal Here
  - Set Entry Here, which sets time and price together
  - Set Stop Loss Here
  - Set Target1/2/3 Here
  - Set Final Target Here
  - Link PDA/Segment/Composite/Latest SMT To Active Setup
  - Add Manual Explanation Event Here
- Manual explanation events are for valid reasons not already represented by Segment/PDA/SMT/Composite, for example:
  - 1H respected previous FVG
  - 30M body touched FVG CE
  - 1M swept EQL
- Renderer now consumes Setup Sets and renders the order elements as one grouped chart set; it does not use full-height reversal vertical lines.
- Inspector now defaults to a compact Review Sets / Setup Set tree summary; detailed edit sections stay collapsed.
- Calendar now groups order rows as Setup Sets, uses Setup Set primary timestamp for badges, and locates by Setup Set core range rather than natural-day start.
- Validation already passed:
  - full `node --check` over `v4/src/**/*.js`
  - `git diff --check HEAD`
  - store compatibility probe
  - Calendar render probe
  - headless Chrome smoke on `http://127.0.0.1:8001/index.html`
  - V4 API health returned `{"status":"ok","version":"4.0"}`
- TODO was updated so Phase 8F Step 100-102 are marked complete as covered by Phase 8G / Step 110.

## Recommended Next Step After New
1. Run `git status --short --branch`.
2. Commit this handoff doc/TODO update if not already committed.
3. Review current branch against `main`.
4. If review is clean, merge `feature/order-review-cleanup` into `main`.

## 2026-05-29 Context Menu Cleanup
- Updated chart right-click menu to use TradingView-style flyout submenus instead of long expanded `<details>` sections.
- Flyout categories now include:
  - Order Setup
  - PDA
  - SMT
  - 1H Segments / active segment actions
  - Point Sets / active point set actions
  - Time Overlays
  - Objective Gaps
  - Clear
  - hit-specific Link PDA / Composite actions
- Submenus automatically open left when the menu is close to the right edge of the chart.
- Destructive / bulk clear actions were grouped under Clear:
  - Clear PDA
  - Clear 1H Segments
  - Clear Killzones
- Commits:
  - `859eb27 feat(v4): use flyout chart context menus`
  - `a4d7996 refactor(v4): group destructive chart menu actions`

## 2026-05-29 Undo / Redo Planning
- User asked whether undo/redo can support all operations.
- Decision: implement global undo/redo for research-object mutations, not for temporary view state.
- Undoable scope:
  - PDA annotations
  - 1H Segments
  - Composite Moves
  - SMT records
  - Order Reviews / Setup Sets
  - Time Overlays, including event times and killzones
  - Clear/bulk destructive operations
- Non-undoable scope:
  - chart zoom / scroll / locate
  - Replay cursor and playback state
  - hover / selection / sidebar tab / context menu open state
  - pick mode temporary state
  - data load range and timeframe switching
- Recommended implementation:
  - add `history/history-manager.js`
  - capture one snapshot containing PDA, segments, segment groups, SMT, order reviews, and time overlay settings
  - restore snapshots via existing store `load*` APIs
  - add explicit `loadTimeOverlaySettings()` to `time-overlay-store.js`
  - wrap user-facing writes in `recordHistory(label, mutator)`
  - bind `Ctrl/Cmd+Z`, `Ctrl/Cmd+Shift+Z`, and `Ctrl+Y`
  - keep native input undo while input/textarea/select/contenteditable is focused
- Added Phase 8H Step 111-117 to `v4/TODO.md`.

## Current Next Step
- Implement Phase 8H Step 111-113 first:
  - define snapshot shape
  - add history manager
  - add time overlay load API
  - initialize global keyboard handling without wrapping all operations yet

## 2026-05-29 Global Undo / Redo Implemented
- Added `v4/src/history/history-manager.js`.
- Snapshot contains:
  - PDA annotations, excluding draft annotations
  - 1H segments
  - segment group state, including Composite draft ids and target id
  - SMT records
  - Order Reviews / Setup Sets
  - Time Overlay settings
- Restore uses existing store load APIs plus new restore helpers:
  - `loadSegmentGroupState()`
  - `loadTimeOverlaySettings()`
- Added toolbar Undo / Redo buttons:
  - `↶` Undo
  - `↷` Redo
  - disabled when no corresponding history entry exists
  - tooltips show the next undo/redo label
- Added shortcuts:
  - `Ctrl/Cmd+Z` undo
  - `Ctrl/Cmd+Shift+Z` redo
  - `Ctrl+Y` redo
  - input / textarea / select / contenteditable keep native browser undo
- Wrapped chart right-click writes:
  - PDA marks
  - Order Setup create/update/link/manual event
  - Time Lines and Killzones
  - finished PDA range/fib and point-set changes
  - Segment finish/clear/link
  - Composite draft/create/clear
  - Clear PDA / Clear Segments / Clear Killzones
- Wrapped Inspector writes:
  - PDA edit/delete/point removal
  - Segment edit/delete/PDA responses/reaction evidence
  - Composite edit/delete/draft
  - SMT note/delete
  - Order Review create/edit/delete/ref changes/pick time/pick price
- Wrapped PDA and Review JSON import as single undoable transactions.
- Validation:
  - full `node --check` over `v4/src/**/*.js`
  - `git diff --check`
  - Node snapshot probe covering PDA, Segment, Composite draft/group, SMT, Order Review, and Killzone undo/redo
  - headless Chrome smoke on `http://127.0.0.1:8001/index.html`; toolbar rendered Undo/Redo buttons disabled initially and page started without runtime failure
- Phase 8H Step 111-117 marked complete in `v4/TODO.md`.

## Current Next Step
- Manually exercise browser workflows with real chart data:
  - create order setup from chart and undo/redo each order element
  - clear PDA / segments / killzones and undo
  - edit Inspector notes and confirm one undo step per change
  - import a Review JSON and undo the full import

## 2026-05-29 Branch Review Fixes
- Code review found three undo/redo coverage gaps after the global history implementation:
  - manual SMT creation was not recorded in history
  - objective NDOG/NWOG show/hide actions were not recorded in history
  - NWOG replay range sync updated PDA annotations during replay, creating view-driven persisted state changes outside history
- Fixed SMT creation by wrapping manual Liquidity SMT and FVG SMT creation in `recordHistory()`.
- Fixed objective gap toggles by wrapping NDOG/NWOG add/remove operations in `recordHistory()`.
- Moved NWOG replay range behavior out of store mutation:
  - `objective-gaps.js` no longer writes `startTime/endTime` on replay changes
  - `pda-renderer.js` computes objective NWOG render bounds from replay-visible bars at render time
- Validation:
  - `node --check v4/src/smt/manual-smt.js`
  - `node --check v4/src/pda/objective-gaps.js`
  - `node --check v4/src/pda/pda-renderer.js`
  - full `node --check` over `v4/src/**/*.js`
  - `git diff --check`
- Commit:
  - `b68f3f7 fix(v4): cover smt and objective gaps in history`

## 2026-05-29 BSL/SSL Default Extend Fix
- User reported BSL/SSL lines were too long.
- Root cause:
  - liquidity-line fallback default was 8 bars
  - when an annotation had `D high` / `D low` context but no explicit extend setting, `pda-extend.js` inferred the source timeframe from context
  - this made the implicit fallback behave like 8 daily bars, displaying as 192 bars on 1H and 48 bars on 4H
- Fix:
  - implicit fallback extend now uses the current chart timeframe
  - only explicit extend values saved on the annotation use source-timeframe / duration conversion
- Probe result:
  - implicit fallback: 1H = 8, 4H = 8
  - explicit `extendBars: 8`, `extendTimeframe: D`: 1H = 192, 4H = 48
- Validation:
  - `node --check v4/src/pda/pda-extend.js`
  - full `node --check` over `v4/src/**/*.js`
  - `git diff --check`
- Commit:
  - `46ef4bc fix(v4): keep default liquidity extend local to chart timeframe`

## 2026-05-29 Main Merge Closeout
- Merged `feature/order-review-cleanup` into `main`.
- Merge commit:
  - `3a5af8c Merge branch 'feature/order-review-cleanup'`
- Current branch after merge:
  - `main`
- Current tracked working tree after merge was clean before this documentation update.
- Untracked local files remain intentionally untouched:
  - `__pycache__/`
  - `tmp/`
  - `trading_data.duckdb`
  - `v3/plans/`
- `main` is ahead of `origin/main`; push was not performed in this handoff.

## Next Step
- Run a real browser regression pass on `main`:
  - right-click flyout menus
  - setup creation and order element updates
  - PDA/Segment/Composite/SMT linking
  - global Undo / Redo buttons and shortcuts
  - BSL/SSL default line length on 1H and 4H
- Then decide whether to push `main` to the remote.

## 2026-05-29 Phase 9 Step 89 Calendar Navigator
- Added a top-toolbar `Calendar` button and a lightweight month popover.
- The popover supports:
  - previous month
  - next month
  - single-day selection
  - today marker
  - selected-day highlight
- Date selection behavior:
  - target time is fixed to `09:30`
  - if the target timestamp is already inside the current display bars, it calls `locateTimestampRange()`
  - if the target timestamp is outside the current display bars, it loads target date +/- 3 calendar days with the current toolbar timeframe, updates the toolbar start/end inputs, then locates `09:30`
- First version intentionally does not:
  - write selected date into Time Overlay state
  - filter Time Markers / Killzones
  - show setup badges or object lists in the toolbar popover
  - implement date ranges, This Week, or Next Week shortcuts
- Files changed:
  - `v4/src/ui/calendar-navigator.js`
  - `v4/src/ui/toolbar.js`
  - `v4/style.css`
  - `v4/TODO.md`
- Validation:
  - `node --check v4/src/ui/calendar-navigator.js`
  - `node --check v4/src/ui/toolbar.js`
  - full `node --check` over `v4/src/**/*.js`
  - `git diff --check`
  - headless Chrome smoke: opened Calendar popover on January 2012, selected `2012-01-09`, auto-loaded `2012-01-06 00:00` to `2012-01-12 23:59`, and status reached `Calendar: 2012-01-09 09:30`; only favicon 404 appeared in browser log

## Next Step
- Browser-test the Calendar button on `main`:
  - open/close popover
  - navigate previous/next month
  - click an already-loaded date and confirm viewport locate
  - click an unloaded date and confirm auto-load + locate
- Then continue Phase 9 Step 90: Calendar Review Index.

## 2026-05-29 Phase 9 Plan Revision - Date Range Calendar
- User pointed out that the new Calendar Navigator overlaps with the always-visible `开始` / `结束` toolbar inputs.
- Decision: before building Calendar Review Index / Day Details, consolidate loading-range selection into a single Date Range Calendar control.
- Added Step 89A to `v4/TODO.md`.
- New UI direction:
  - toolbar should show one `Date Range` control instead of separate always-visible start/end inputs plus a separate Calendar button
  - Date Range control displays the current loaded range
  - clicking it opens a two-month calendar popover similar to common date-range pickers
  - selecting start/end dates loads that range
  - `Load Week` and single-day jump to `09:30` remain available as explicit shortcut actions
  - precise `YYYY-MM-DD HH:mm` start/end inputs move into advanced/manual fields inside the popover
- Rationale:
  - `Date Range` decides what data is loaded
  - calendar day actions decide where to navigate
  - Replay jump remains the precise replay-position jump tool
  - removing duplicate top-level controls keeps the toolbar cleaner before adding object badges/details

## Next Step
- Implement Step 89A before Step 90.

## 2026-05-29 Phase 9 Step 89A Date Range Calendar
- Created branch `feature/v4-date-range-calendar` from `main`.
- Replaced the always-visible `开始` / `结束` toolbar inputs with one visible `Date Range` control.
- Kept hidden `startInput` / `endInput` fields as the compatibility state source for existing load code and API request formatting.
- Reworked `v4/src/ui/calendar-navigator.js` into a Date Range picker:
  - two-month calendar layout
  - start/end range selection
  - highlighted active date, range start, range end, and in-range days
  - `Load Range` action
  - `Load Week` action around the active date
  - `Jump 09:30` action
  - advanced manual `YYYY-MM-DD HH:mm` start/end fields inside the popover
- Updated `v4/style.css` for the larger date-range popover and range states.
- Marked Step 89A complete in `v4/TODO.md`.
- Validation:
  - `node --check v4/src/ui/calendar-navigator.js`
  - `node --check v4/src/ui/toolbar.js`
  - full `node --check` over `v4/src/**/*.js`
  - `git diff --check`
  - headless Chrome smoke: toolbar visible text shows only Date Range, hidden fields remain `type=hidden`, two-month popover opens, selecting `2012-01-09` to `2012-01-12` loads `2012-01-09 00:00` to `2012-01-12 23:59`

## Next Step
- Manual browser pass for Step 89A:
  - range select forward and backward
  - Load Week
  - Jump 09:30 inside and outside loaded range
  - manual time range input
- Then continue Step 90: Calendar Review Index.

## 2026-05-29 Phase 9 Step 90 Calendar Review Index
- Added `v4/src/calendar/calendar-review-index.js`.
- Extended `v4/src/calendar/calendar-types.js` with Calendar object types for existing time overlay rows.
- Calendar Review Index now derives day-indexed groups from existing stores:
  - Setup Sets / Order Setups
  - SMT
  - PDA
  - 1H Segments
  - Composite Moves
  - existing Killzones / Time Lines are preserved in the same day details pipeline
- Order Setup day ownership follows the Step 90 priority through the Setup Set tree:
  - entry timestamp
  - reversal / setup primary event timestamp
  - result / exit timestamp
- Updated `v4/src/ui/inspector/calendar-panel.js` so the Inspector Calendar consumes `getCalendarReviewIndex()`, `getCalendarDayGroups()`, and `getCalendarObjectDateKeys()` instead of reading every store directly.
- Validation:
  - `node --check v4/src/calendar/calendar-review-index.js`
  - `node --check v4/src/calendar/calendar-types.js`
  - `node --check v4/src/ui/inspector/calendar-panel.js`
  - node probe covering one date with Order Setup, SMT, PDA, two Segments, one Composite, Killzone, and Time Line
  - full `node --check` over `v4/src/**/*.js`
  - `git diff --check`
  - headless Chrome smoke: Date Range load for `2012-01-09` to `2012-01-12` succeeded, Inspector Calendar rendered six object groups, and chart canvases rendered
- Marked Step 90 complete in `v4/TODO.md`.

## Next Step
- Run full JS syntax and browser smoke after Step 90.
- Then continue Step 91: Calendar Day Details UI refinement.

## 2026-05-29 Follow-up: Replay Sync and Date Range Usability
- After merging `feature/v4-date-range-calendar` back to `main`, inserted two usability fixes before continuing Step 91.
- Split Replay sync:
  - `v4/src/ui/secondary-chart-controller.js` now renders secondary chart data replay-aware.
  - Replay Bar On slices the secondary chart to the bucket matching the primary `cursorTimestamp`, so the readonly secondary chart no longer shows future bars.
  - Replay Bar Off / Close restores the full loaded secondary data.
  - `v4/src/chart/secondary-chart-manager.js` `showSecondaryEndOfData()` now accepts the previous logical range and previous data count, matching the primary replay anchoring behavior.
  - This fixes the 1M primary / 1H secondary case where secondary latest bars became progressively thinner and drifted right before settling.
- Date Range Calendar usability:
  - `v4/src/ui/calendar-navigator.js` records successful loads into local `v4.dateRangeHistory`.
  - History records store `start`, `end`, `timeframe`, and `loadedAt`.
  - History ranges are de-duplicated, newest-first, limited to 8, and can be loaded, removed one by one, or cleared.
  - Date Range popover now includes `<<` / `>>` year navigation while keeping `<` / `>` month navigation.
  - `v4/style.css` adds history range list styling and a five-column calendar header.
- Validation:
  - `node --check v4/src/ui/secondary-chart-controller.js`
  - `node --check v4/src/chart/secondary-chart-manager.js`
  - `node --check v4/src/ui/calendar-navigator.js`
  - full `node --check` over `v4/src/**/*.js`
  - `git diff --check`
  - headless Chrome smoke verified:
    - Replay On secondary data slices from full count to replay count and restores on close.
    - 1M primary / 1H secondary replay keeps secondary right anchor stable after entering the first 1H bucket.
    - Date Range history appears after load, can reload the range, remove one item, and clear all.
    - `>>` changes May/June 2026 to May/June 2027, `<<` returns and then changes to May/June 2025.

## Next Step
- Commit the Replay sync and Date Range usability changes.
- Continue Phase 9 Step 91: Calendar Day Details UI refinement.

## 2026-05-29 Phase 9 Step 91 Calendar Day Details UI
- Reviewed the existing Calendar panel state:
  - Calendar Review Index was already feeding day groups.
  - Existing rows already supported Locate/Open.
  - Missing pieces were clearer Day Details structure, default group expansion, and compact readable row summaries.
- Updated `v4/src/ui/inspector/calendar-panel.js`:
  - Day Details groups now render as native `details` sections.
  - Group order remains fixed: Order Setups, SMT, PDA, Segments, Composite, Killzones / Time Lines.
  - Order Setups is open by default; other groups are collapsed by default.
  - Rows are structured into time, short object type chip, summary, and action buttons.
  - Locate/Open data attributes are preserved.
- Updated `v4/style.css`:
  - Added compact group headers with count pills.
  - Added structured row layout with fixed time/type columns and ellipsized summaries.
- Validation:
  - `node --check v4/src/ui/inspector/calendar-panel.js`
  - full `node --check` over `v4/src/**/*.js`
  - Node probe with seeded Order Setup, SMT, PDA, two Segments, Composite, Killzone, and Time Line:
    - group order correct
    - 8 object rows rendered
    - Order Setups open by default
    - structured row fields present
    - Locate/Open buttons present
  - Headless Chrome smoke in the page environment:
    - six groups rendered in order
    - only Order Setups default open
    - 8 object rows
    - 24 structured row subfields
    - 8 Locate buttons and 5 Open buttons
- Marked Step 91 complete in `v4/TODO.md`.

## Next Step
- Continue Phase 9 Step 92: object-level operation refinement from Day Details, especially Select + Open and optional Focus behavior.

## 2026-05-29 Phase 9 Step 92 Calendar Object Operations
- Reviewed current Calendar object behavior:
  - PDA / Segment / Composite `Open` already selected the object through existing selection modules.
  - Order Setup `Open` set the active review set, but the synchronous active-change refresh cleared the Calendar return context.
  - SMT was only shown in the SMT panel and did not have a Calendar `Open` action.
  - Locate only emitted a generic status message.
- Updated `v4/src/ui/inspector/calendar-panel.js`:
  - Calendar rows now expose `Open` for SMT as well as Order Setup / PDA / Segment / Composite.
  - Locate buttons include a compact object label for status messages.
- Updated `v4/src/ui/inspector-sidebar.js`:
  - Order Setup Calendar `Open` now restores `calendarReturnContext` after `setActiveReviewSet()` and renders the panel with `Back to Calendar`.
  - Added an SMT selection render path so Calendar `Open` can select an SMT record and show the SMT panel with `Back to Calendar`.
  - Calendar `Locate` continues to only locate/flash and no longer changes the Inspector panel, but status now says `Located <object summary>`.
  - Focus behavior was deliberately left out of this step; Structure Sets focus remains separate and session-only.
- Validation:
  - `node --check v4/src/ui/inspector/calendar-panel.js`
  - `node --check v4/src/ui/inspector-sidebar.js`
  - full `node --check` over `v4/src/**/*.js`
  - headless Chrome smoke with seeded Order Setup / SMT / PDA / Segments / Composite:
    - Calendar Locate status includes object summary.
    - Order Setup Open shows `Back to Calendar` and active order row.
    - Back returns to Calendar with six Open buttons.
    - SMT Open shows `Back to Calendar` and selected SMT row.
- Marked Step 92 complete in `v4/TODO.md`.

## Next Step
- Continue Phase 9 Step 93: full month calendar UI / object overview badges, or review whether current Inspector calendar already covers enough before adding denser month-cell counts.

## 2026-05-29 Phase 9 Step 93 Calendar Month Object Overview
- Reviewed the current month calendar:
  - It already showed an Order Setup red dot.
  - It did not expose other object types until a date was selected.
- Updated `v4/src/ui/inspector/calendar-panel.js`:
  - Month date cells now derive overview counts from the Calendar Review Index.
  - Order Setup keeps the red priority badge.
  - Cells with any calendar object show a compact total count.
  - Cells show colored type dots for:
    - SMT
    - PDA
    - Structure (`Segment + Composite`)
    - Time (`Killzone + Time Line`)
  - Date cell `title` includes per-type counts for quick hover inspection.
  - Empty dates render without count/dots.
- Updated `v4/style.css`:
  - Calendar day cells are slightly taller.
  - Added fixed day number positioning, count pill, and compact dot row.
  - Selected cells keep readable count styling.
- Validation:
  - `node --check v4/src/ui/inspector/calendar-panel.js`
  - full `node --check` over `v4/src/**/*.js`
  - headless Chrome smoke with seeded multi-date fixtures:
    - `2012-01-09` with Order Setup + PDA shows red setup badge, total `2`, PDA dot, and title counts.
    - `2012-01-10` with Segment + Composite shows total `3` and Structure dot.
    - `2012-01-11` with no objects shows no overview.
    - `2012-01-12` with SMT + Killzone shows total `2` and SMT/Time dots.
    - Selecting `2012-01-12` still renders the six Day Details groups and the expected two rows.
- Marked Step 93 complete in `v4/TODO.md`.

## Next Step
- Continue Phase 9 Step 94: selectedDate / overlay linkage, deciding how Calendar selection should filter Time Markers and Killzones without hiding useful context unexpectedly.
