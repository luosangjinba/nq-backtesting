# Step 312: Advanced PDA Workflow Decision Implementation Plan

Date: 2026-06-22
Branch: feature/comparison-window-mvp
Status: planned

## Context

Step 309 completed locate routing.

Step 310 completed pick-preview routing.

Step 311 completed Comparison Window existing-object hit-test link.

The remaining Comparison Window / Split replacement blocker from Step 308.5 is advanced PDA workflow coverage.

## Goals

- Implement only low-risk, single-bar/candle advanced PDA actions in Comparison Window.
- Keep complex draft/set workflows on primary and old Split unless real-use audit proves they are needed.
- Preserve source metadata such as `sourceChartId=comparison-window`.
- Avoid cloning the full secondary context menu into Comparison Window.

## Non-goals

- Do not remove Split.
- Do not migrate OB/Breaker range drafts.
- Do not migrate Fib draft workflow.
- Do not migrate EQH/EQL Point Sets.
- Do not add a generic comparison draft controller in this step.

## Step 312.1: Re-audit Advanced PDA Surface

Confirm current state:

- Secondary has OB Last Bar, Wick CE, OB/Breaker range draft, Fib, and Point Sets.
- Comparison currently has BSL/SSL, FVG/IFVG, Segment, Bar Evidence, existing-object Link, copy, and primary locate.

Decision:

- Migrate OB Last Bar.
- Migrate Upper/Lower Wick CE.
- Keep OB/Breaker range draft, Fib, and Point Sets primary/Split scoped.

## Step 312.2: Add Low-risk Comparison PDA Actions

Update `comparison/comparison-context-menu.js`.

Add menu actions:

- `comparison-pda-ob-last-bar`;
- `comparison-pda-wick-ce-upper`;
- `comparison-pda-wick-ce-lower`.

Use existing helpers:

- `addManualObLastBar(contextMenuBar, context, contextMenuPrice)`;
- `addManualWickCe('upper' | 'lower', contextMenuBar, context)`.

Rules:

- OB Last Bar requires a valid bar and clicked price.
- Wick CE requires a valid bar and valid wick geometry.
- Source metadata must remain comparison-scoped through the chart context.

## Step 312.3: Record High-risk Workflow Decisions

Document that these remain excluded from Comparison Window for now:

- OB range draft;
- Breaker range draft;
- Fib;
- EQH/EQL Point Sets;
- existing selected EQH/EQL append.

Reason:

- draft state and multi-click workflow are more layout-sensitive in a floating/sliding window;
- usage frequency in comparison context is still unproven;
- Split removal remains blocked unless these are migrated or explicitly waived after real-use audit.

## Step 312.4: Browser And Focused Verification

Run:

- `node --check v4/src/comparison/comparison-context-menu.js`
- `node v4/tests/comparison-window-persistence-smoke.js`
- `node v4/tests/comparison-window-browser-smoke.js`
- `node v4/tests/live-record-smoke.js`
- `node v4/tests/smt-selection-smoke.js`
- `git diff --check`

If low-risk, add or extend a smoke to assert OB Last Bar / Wick CE comparison metadata.

## Step 312.5: Closeout

Update:

- `v4/TODO.md`;
- this session file.

Record:

- commits;
- verification;
- remaining Split removal blockers.
