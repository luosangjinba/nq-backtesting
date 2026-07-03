# Step 489 - V5 Workstation UI Token Pass

Date: 2026-07-03

Status: completed

## Goal

Implement the first tokenized visual pass from Step 488 across the visible chart
workstation shell, toolbar, Layout popover, and floating replay transport.

## Phase

Phase 3 - Real Chart Interaction.

Phase gate advanced: the chart route should feel more like a deliberate replay
workstation while preserving runtime ownership boundaries.

## Plan

- [x] Step 489.1: Define the first semantic CSS token layer in `app.css` for
  surfaces, text, borders, focus rings, accents, compact control sizing,
  radius, shadows, and z-index layers.
- [x] Step 489.2: Migrate the chart workstation shell and route toolbar to the
  tokens, keeping dimensions stable and preserving active-pane shared controls.
- [x] Step 489.3: Migrate the Layout popover and icon matrix to the same
  tokens, improving hover, focus, selected, and disabled states without
  changing layout commands.
- [x] Step 489.4: Migrate the floating replay transport to tokenized surfaces,
  controls, focus rings, and disabled states without changing replay command
  behavior or drag/clamp logic.
- [x] Step 489.5: Update docs/session handoff, run focused browser smokes and
  `git diff --check`, then commit.

## Implementation

- Added the first V5-native CSS token layer in `src/styles/app.css`.
- Tokenized common workstation surfaces, borders, focus rings, selected states,
  compact control heights, radius, shadows, and z-index layers.
- Migrated the chart shell, active-pane border/focus, chart toolbar, footer
  status chips, route toolbar, Layout popover, Go-to popover, and floating
  replay transport to consume those tokens.
- Added consistent hover/focus/selected states for chart navigation buttons,
  Layout icon buttons, popover close/actions, and transport controls.
- Preserved existing DOM, command dispatch, layout commands, replay transport
  commands, chart runtime ownership, and bar-data/replay ownership.

## Non-goals

- No replay runtime, chart runtime, bar-data runtime, or layout runtime changes.
- No Settings modal visual pass in this step.
- No React, Tailwind, shadcn/ui, or external UI dependency installation.
- No new product controls or changed command semantics.

## Manual Acceptance

- Chart workstation shell, toolbar, Layout popover, and floating transport use
  shared semantic CSS tokens for common colors, borders, focus, and compact
  control sizing.
- Hover, focus, selected, disabled, and active-pane states remain visually
  distinct.
- Active-pane TF, Go to, Layout, Settings, reset view, and replay transport
  controls keep the same command behavior.
- Floating transport remains below popovers/modals and stays viewport-clamped.

## Checks

- Passed: `node v5/tests/replay-workstation-layout-browser-smoke.js`
- Passed: `node v5/tests/replay-floating-controls-browser-smoke.js`
- Passed: `node v5/tests/chart-navigation-toolbar-browser-smoke.js`
- Passed: `node v5/tests/replay-controls-browser-smoke.js`
- Passed: `git diff --check`
