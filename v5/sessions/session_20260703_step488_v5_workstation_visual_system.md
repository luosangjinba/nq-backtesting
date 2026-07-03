# Step 488 - V5 Workstation Visual System

Date: 2026-07-03

Status: completed

## Goal

Turn the desired FXReplay-like polish into an engineering contract before
changing more UI code.

## Phase

Phase 3 - Real Chart Interaction.

Phase gate advanced: the chart route should feel like a deliberate replay
workstation with compact, predictable controls while preserving runtime
ownership boundaries.

## Why This Step

The user wants V5 to feel more engineered and closer to FXReplay, with a more
professional product feel. A broad visual pass without a local standard would
create the same long-term problem V4 had in code structure: feature surfaces
would each grow their own styling, states, and interaction rules.

This step documents the visual system first so future UI work can be evaluated
against stable rules.

## Implementation

- Added `v5/docs/specs/workstation-visual-system.md`.
- Documented the design direction as a dense, low-distraction dark trading
  workstation rather than a generic app page.
- Defined token groups for surfaces, borders, text, accents, spacing, and
  z-index layers.
- Defined component rules for toolbar controls, Layout popover, Settings modal,
  floating replay transport, and multi-pane chart chrome.
- Defined interaction quality gates for focus, hover, active, selected,
  disabled, layering, text overflow, active-pane behavior, chart chrome, and
  screenshot/browser coverage.
- Recorded that external design tools such as `ui-ux-pro-max` may be used as
  review aids, but production changes must be translated into V5 specs, tokens,
  ownership checks, and smokes.
- Reviewed shadcn/ui as a component engineering reference. The useful parts for
  V5 are open code, composition, semantic tokens, accessible primitive behavior,
  and component variant discipline. Because V5 is currently a native frontend
  path rather than a React/Tailwind app, shadcn should inform V5-owned
  component contracts instead of being installed as a dependency.
- Updated docs index, specs index, TODO current status, and session index.

## Non-goals

- No CSS or runtime code changes in this step.
- No dependency installation for external UI tooling or shadcn/ui.
- No Settings, Layout, replay transport, or chart-pane markup changes.
- No change to replay cursor, chart series, bar data, layout state, or
  presentation runtime ownership.

## Manual Acceptance

- Future UI polish has a documented source of truth before code changes.
- The visual system keeps active-pane shared controls as the default model.
- Settings remain draft-first with `Cancel` / `Ok` semantics.
- Layout variants remain layout-runtime commands, not route DOM mutations.
- Split panes continue to require responsive ratios and minimum walls, not
  fixed pixel state.
- External design tools cannot directly write production V5 UI without review.
- shadcn/ui is treated as a reference for component-system structure, not as a
  framework migration or runtime dependency.

## Checks

- `git diff --check`

## Next Candidate

Step 489 should implement the first tokenized visual pass across the chart
workstation shell, toolbar, Layout popover, and floating transport. Keep the
step CSS/DOM-only unless a required interaction state is missing, and preserve
all runtime ownership boundaries.
