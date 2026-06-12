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
