# Session 2026-06-11 - Primary Instrument Selector Plan

Branch at planning time: `feature/research-databento-data-journal`

## Goal

Make the primary chart an instrument-scoped workspace instead of a hardcoded NQ workspace.

First supported primary instruments:

- `NQ`
- `ES`

Architecture goal:

- Future instruments can be added through data availability and `INSTRUMENT_CONFIG`, but Step 283 does not promise full support for instruments without DB coverage, tick config, roll rules, and workflow-specific logic.

## Why This Is Needed

The API already accepts `instrument`, and the secondary chart can already choose `NQ` or `ES`. The primary chart, however, still assumes NQ across state, persistence, review objects, chart notes, time reaction review, SMT, replay history, and archive behavior.

A partial “just load ES bars on the main chart” change is unsafe because ES-created objects could be saved under NQ storage keys, Calendar rows could mix instruments, and Replay/Archive restore could reopen the wrong instrument.

## Product Boundary

Step 283 should make Main=ES feel like Main=NQ for ordinary review workflows:

- Load ES bars in the primary chart.
- Create and restore PDA.
- Create and restore Segments.
- Create and restore Chart Notes.
- Use Time Reaction / Bias records scoped to ES.
- Create Order Setups scoped to ES.
- Use Calendar locate/open/archive without mixing ES and NQ records.
- Save and restore Replay history with the correct primary instrument.

NQ must remain the default and must not regress.

## Non-Goals

- Do not redesign Journal in this step.
- Do not solve NQ Databento write/roll conflict here.
- Do not make SMT generic across all instrument pairs.
- Do not promise YM/RTY/GC/CL support without DB data and instrument-specific configuration.
- Do not silently migrate or merge NQ and ES review objects.

## Current Hardcoded Areas To Audit

Known NQ assumptions found before implementation:

- Primary chart context defaults to `NQ`.
- PDA / Segment / Chart Notes / Time Reaction / Order Review persistence keys include `NQ`.
- Chart Notes renderer and hit-test have NQ-only filters.
- Calendar visibility filters chart notes by NQ.
- Replay history persistence stores primary instrument as NQ.
- SMT is explicitly `NQ follows ES`.
- PDA projection has NQ primary assumptions.
- Manual PDA/Segment/Order Setup metadata often falls back to NQ.
- Review archive defaults to NQ.

## Implementation Plan

### Step 283.1 - Freeze Boundary

Document the supported product behavior:

- Main selector supports NQ/ES.
- NQ remains default.
- Main instrument is a workspace-level state.
- SMT current rules are valid only for `Main=NQ, Sub=ES`.
- Other instrument expansion requires DB rows, tick config, and workflow-specific rules.

### Step 283.2 - Primary Instrument State

Add a single source of truth for primary instrument.

Expected behavior:

- Toolbar shows `Main: NQ / ES`.
- Changing Main clears selected object and reloads primary bars.
- Chart context reports the current primary instrument.
- Secondary instrument remains independent.

### Step 283.3 - Main Data Loading

All primary data requests must use current Main instrument:

- Toolbar load.
- Calendar jump.
- Replay restore.
- Replay history load.
- Auto-exit time lookup.
- Any helper that fetches bars for primary context.

### Step 283.4 - Instrument-Scoped Stores

Make persisted review data instrument-aware:

- PDA.
- Segments.
- Chart Notes.
- Daily Time Review / Bias / Opening Thesis Review.
- Order Setup / Review JSON.
- Display mode / day object visibility.
- Economic event notes if they are review-context scoped.
- Replay history.

Compatibility requirement:

- Existing NQ localStorage must continue to load.
- New ES data must not write into legacy NQ-only keys unless the key is explicitly migrated to a multi-instrument schema.

### Step 283.5 - Calendar / Inspector / Archive

Calendar and Inspector should show objects for the selected primary instrument.

Archive rules:

- Export includes `instrument`.
- Import preserves source instrument.
- Importing data for a different instrument must not silently merge into the current instrument.

### Step 283.6 - Rendering And Interaction Cleanup

Remove primary-chart NQ hardcodes from rendering and interaction paths:

- PDA projection.
- Chart Notes renderer/hit-test.
- Manual PDA and Segment metadata.
- Order Setup creation.
- Time Reaction actions.
- Calendar visibility actions.

Cross-instrument projection remains time-only unless source and target instrument match.

### Step 283.7 - SMT Guard

Current SMT remains narrow:

- Enabled only when `Main=NQ`, `Sub=ES`, and timeframes match.
- Disabled for `Main=ES` or other combinations with a clear reason.

Generic SMT pair logic is a future task.

### Step 283.8 - Migration And Compatibility

Validate:

- Existing NQ localStorage loads.
- Existing Review JSON imports.
- NQ data remains visible under Main=NQ.
- ES records are isolated under Main=ES.
- Switching Main instruments does not delete or mutate the other instrument’s records.

### Step 283.9 - Browser Regression

Manual/browser smoke coverage:

- Main=NQ baseline.
- Main=ES 1M/5M/1H/D loading.
- PDA creation, locate, hide/show.
- Segment creation, locate, hide/show.
- Chart Notes create/edit/delete.
- Time Reaction / Bias edit and restore.
- Order Setup create/edit/result.
- Calendar locate/open.
- Replay save/restore.
- Archive export/import.
- Split chart with Sub=NQ and Sub=ES.
- SMT enabled/disabled boundaries.

### Step 283.10 - Closeout

Update:

- `v4/TODO.md`
- this session file
- user docs if the Main selector becomes user-facing

Record final support matrix:

- Main=NQ
- Main=ES
- Other configured instruments
- SMT-supported combinations

## Acceptance Criteria

- Main=NQ behavior is unchanged.
- Main=ES can complete a normal review workflow without saving objects into NQ state.
- NQ and ES objects do not appear in each other’s Calendar/Inspector unless explicitly designed as cross-instrument evidence.
- Replay history restores the correct primary instrument.
- Review JSON round-trip preserves instrument.
- SMT is safely disabled outside supported instrument pair(s).

## Step 283.1 Status

Completed. The execution boundary is frozen in this file:

- Main instrument is workspace-level state.
- NQ remains default.
- ES must support ordinary primary-chart review workflows.
- Other instruments require data/config/rules before they are product-supported.
- Current SMT remains limited to `Main=NQ, Sub=ES`.

## Step 283.2 Status

Completed.

Changes:

- Added `v4/src/data/primary-instrument-store.js`.
- Added `DEFAULT_PRIMARY_INSTRUMENT = 'NQ'`.
- Initialized primary instrument state during app startup.
- Toolbar now shows `Main: NQ / ES`.
- Toolbar primary chart loads call `/v4/bars` with the selected Main instrument.
- Primary chart context now reports the selected Main instrument instead of hardcoded NQ.

Remaining for Step 283.3:

- Calendar jump.
- Replay restore and replay history.
- Viewport window navigation.
- Time Reaction timeframe reload.
- Other primary fetch paths that still rely on default `fetchBars(..., 'NQ')`.

## Step 283.3 Status

Completed.

Main data loading now uses the current primary instrument in these paths:

- Toolbar primary load.
- Calendar date range load.
- Calendar resolved 1m window load.
- Viewport previous/next 1m window load.
- Time Reaction primary timeframe reload.
- Replay history checkpoint save.
- Replay history restore.
- PDA objective-gap reference bar fetches.

Notes:

- Secondary chart loads continue to use secondary instrument state.
- Object/context fetches that already pass `context.instrument` were left unchanged.
- `auto-exit-time` already receives an explicit instrument from order/setup context and was not changed in this substep.

## Step 283.4 Status

Completed.

Added:

- `v4/src/storage/instrument-storage.js`

Instrument-scoped persistence now covers:

- PDA annotations: `v4:pda-annotations:<instrument>`
- Market segments and composite moves: `v4:market-segments:<instrument>`
- Chart Notes: `v4:chart-notes:<instrument>`
- Daily Time Review / Bias / Opening Thesis Review: `v4:daily-time-reviews:<instrument>`
- Order Setup / Order Review: `v4:order-reviews:<instrument>`
- Time Overlays: `v4:time-overlays:<instrument>`
- Economic Event Notes: `v4:economic-event-notes:<instrument>`
- Display Mode: `v4:display-mode:<instrument>`

Compatibility:

- NQ keys remain byte-for-byte compatible with existing names such as `v4:pda-annotations:NQ`.
- Switching Main instrument saves the previous in-memory state to the previous instrument key, then loads the new instrument key.
- If the new instrument has no payload, the relevant in-memory store is loaded with an empty/default state so NQ objects do not remain visible on Main=ES.

Replay history:

- Step 283.3 already records primary instrument in replay history items.
- Step 283.5 should filter Calendar/Inspector/History views by current Main instrument where relevant.

## Step 283.5 Status

Completed.

Calendar / Inspector:

- Calendar Time Reaction rows now request `getDailyTimeReviewByDate(date, currentMainInstrument)`.
- Calendar Chart Notes groups use current Main instrument when no review exists.
- Calendar Daily Regime summary requests current Main instrument.
- Calendar day-object visibility bulk actions filter Chart Notes by current Main instrument.

Archive:

- PDA archive export writes current Main instrument.
- Review archive export writes current Main instrument.
- Review archive Daily Regime export filters by current Main instrument.
- Review archive SMT export filters records whose primary instrument equals current Main.
- PDA/Review archive import rejects payloads whose instrument does not match current Main, preventing silent cross-instrument merge.

Replay History:

- Replay History panel lists only records for current Main instrument.
- Replay History clear only clears current Main instrument records.

## Step 283.6 Status

Completed.

Rendering:

- PDA price projection now compares annotation source against current Main instrument instead of hardcoded `NQ`.
- PDA renderer refreshes on Main instrument changes.
- Chart Notes renderer filters by current Main instrument.
- Chart Notes hit-test filters by current Main instrument and includes instrument in its layout cache key.

Interactions:

- Context-menu Chart Note lookup and creation use current Main instrument.
- Range Chart Note drafts store their starting Main instrument and must finish on the same Main instrument.
- Order Setup refs added into Time Reaction fall back to current Main instrument instead of `NQ` when the order lacks an explicit instrument.

Validation target for the next steps:

- SMT actions still need explicit Main/Sub guard handling in Step 283.7.

## Step 283.7 Status

Completed.

Guard:

- SMT creation now requires `Main=NQ`, `Sub=ES`, matching primary/sub timeframes, and loaded NQ/ES bars.
- The right-click SMT submenu uses the same guard, disables actions when unsupported, and shows a short reason.
- Starting a SMT action still revalidates the guard before entering pick mode.
- Active SMT pick mode clears when Main instrument or secondary chart settings change.

Rendering and linking:

- SMT rendering filters records by current Main instrument and current secondary instrument.
- Order Setup "Link Latest SMT" only considers SMT records whose primary instrument matches current Main.

Boundary:

- This step preserves the existing first-version rule: NQ follows ES only.
- ES follows NQ, alternative compare instruments, and generic pair logic remain future work.

## Step 283.8 Status

Completed.

Added `v4/tests/primary-instrument-compat-smoke.js`.

Smoke coverage:

- Default Main instrument remains `NQ`.
- Storage instrument normalization accepts `ES` and falls unknown values back to `NQ`.
- Instrument-scoped storage keys are generated as `v4:<domain>:<instrument>`.
- Default storage key resolution follows the current Main instrument after switching to `ES`.
- Chart Notes can hold same-time NQ and ES notes without query collision.
- Daily Time Review can hold same-date NQ and ES bias records without query collision.
- Replay History can save NQ and ES records, filter by requested Main instrument, and clear only one instrument.

Validation:

- `node v4/tests/primary-instrument-compat-smoke.js`
- `find v4/src v4/tests -name '*.js' -print0 | xargs -0 -n1 node --check`
- `git diff --check`
- Databento key scan under `v4`

Note:

- Node reports the existing module-type warning for ES module smoke files because the repo has no package-level `"type": "module"` declaration; the smoke exits successfully.

## Step 283.9 Status

Completed.

Added `v4/tests/primary-instrument-browser-smoke.js`.

Browser smoke:

- Starts headless Chrome through CDP against `http://127.0.0.1:8001/index.html`.
- Verifies the Toolbar Main selector exists with `NQ` and `ES`.
- Switches Main to `ES` through the primary instrument store and confirms the UI select syncs to `ES`.
- Imports the frontend API module in the page and confirms NQ and ES `fetchBars` calls return bars.
- Confirms the primary chart canvas exists.

HTTP/API smoke:

- `/v4/health` returned OK.
- `/v4/bars?instrument=NQ&start=2024-01-08%2009:30&end=2024-01-08%2011:00&tf=60` returned HTTP 200 with bars.
- `/v4/bars?instrument=ES&start=2024-01-08%2009:30&end=2024-01-08%2011:00&tf=60` returned HTTP 200 with bars.

Validation:

- `node v4/tests/primary-instrument-browser-smoke.js`
- `find v4/src v4/tests -name '*.js' -print0 | xargs -0 -n1 node --check`
- `git diff --check`
- Databento key scan under `v4`

Environment note:

- `bash start.sh start` could not own port 8001 because an existing static server was already serving `index.html`.
- `bash start.sh restart` reported API startup, but the background process did not stay visible/reachable in this execution environment. Running `/home/leo/miniconda3/bin/python3 v4_api.py` in the foreground kept the API healthy for the smoke.
- Node reports the existing module-type warning for ES module smoke files; the smoke exits successfully.

Scope note:

- Full click-by-click browser regression for PDA/Segment/Chart Note/Time Reaction/Order Setup creation, Replay save/restore, Archive import/export, and Calendar locate/open remains better as a manual acceptance pass. This step automated the Main selector, ES switch, frontend NQ/ES data path, and render boot path most directly affected by Step 283.

## Step 283.10 Status

Completed.

Documentation updates:

- Updated `v4/docs/user/USER_GUIDE.zh-CN.md`.
- Updated `v4/docs/user/USER_GUIDE.en.md`.
- Marked Step 283 and Step 283.10 complete in `v4/TODO.md`.

Documented behavior:

- Main defaults to `NQ`.
- Regular review workflows now support Main `NQ` and `ES`.
- Local objects and workspace state are partitioned by current Main instrument.
- Calendar, Archive, and Replay History use the current Main instrument as their boundary.
- Archive imports for a different instrument are rejected rather than silently merged.
- Other instruments are extension hooks only until DB coverage, tick config, roll rules, and workflow-specific logic exist.
- SMT remains first-version `NQ follows ES` only: `Main=NQ`, `Sub=ES`, matching primary/sub timeframes.

User-facing wording cleanup:

- `index.html` title now says `K-Line Viewer V4`.
- `start.sh` startup banner now says `V4 K-Line Viewer`.

Step 283 closeout:

- Completed substeps 283.1 through 283.10.
- Last automated coverage includes primary instrument compatibility smoke, browser Main selector smoke, NQ/ES frontend fetch smoke, full JS syntax check, diff whitespace check, and Databento key scan.
