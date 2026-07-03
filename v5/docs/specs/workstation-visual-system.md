# Workstation Visual System

Phase: Phase 3 - Real Chart Interaction.

Phase gate: the chart route should feel like a deliberate replay workstation,
with compact, predictable controls that do not break runtime ownership
boundaries.

## Purpose

V5 should look and behave closer to a professional trading workstation than a
generic demo page. The visual system is a product contract, not decoration:
toolbar controls, split panes, Settings, replay transport, overlays, and status
readouts should share one interaction language so future features do not create
ad hoc UI.

External design tools or skills such as `ui-ux-pro-max` may be used as design
review aids, but V5 keeps the enforceable rules in this repository. Generated
recommendations must be translated into V5 tokens, component states, and
browser checks before implementation.

shadcn/ui is a useful reference for component engineering, but not a direct V5
dependency today. Its current model is "open code" component distribution, not
a traditional imported component library; its own docs emphasize that projects
receive editable component code and build their own component library. That is
compatible with V5's direction, but V5 currently uses native frontend modules
instead of React/Tailwind, so the lesson is the architecture style rather than
the package.

## Design Direction

- The target feel is a dense dark trading terminal: quiet, precise, low glare,
  and optimized for repeated chart inspection.
- The chart remains the primary surface. Chrome should be compact and should
  not compete with candles, axes, OHLC overlays, or replay controls.
- Controls should read as tools, not marketing UI. Prefer icon buttons,
  segmented choices, compact selects, checkboxes, and precise labels.
- The interface should support mouse-heavy workflows with clear hover, active,
  focus, disabled, and selected states.
- Styling should be consistent across single-pane and multi-pane layouts.

## Token Rules

Future styling work should route visible constants through CSS custom
properties before broad visual changes:

- surface tokens for app background, panel background, chart background,
  toolbar background, modal background, and popover background;
- border tokens for default, subtle, hover, active-pane, focus, and danger;
- text tokens for primary, secondary, muted, axis, positive, negative, and
  disabled text;
- accent tokens for focus/selected state and chart status highlights;
- spacing tokens for shell gutters, toolbar gaps, modal padding, pane gaps, and
  compact control height;
- z-index tokens for chart overlays, floating transport, popovers, modals, and
  debug layers.

Raw color values and one-off dimensions should not spread across feature CSS
once a token exists. Feature CSS may use feature-specific selectors, but it
should consume shared tokens for common surfaces and states.

The token approach should follow the same principle as shadcn's theming model:
components consume semantic variables such as surface, foreground, border,
input, focus ring, and accent tokens instead of hard-coded visual values. V5
does not need Tailwind to use that idea; `app.css` can define the tokens and
feature CSS can consume them.

## Component Engineering References

The useful shadcn/ui lessons for V5 are:

- open code: component implementation should live in V5-owned files, where it
  can be inspected, tested, and changed for the replay workstation;
- composition: common controls should share predictable markup/state patterns
  instead of each feature inventing a new button, select, modal, or split
  handle shape;
- semantic tokens: surfaces, foreground text, borders, inputs, focus rings,
  accent states, destructive states, chart colors, and radius should be named
  by role;
- accessible primitives: dialog, select, tooltip, toggle group, checkbox, and
  resizable-pane behavior should include keyboard/focus semantics as part of
  the component contract;
- CLI/registry ideas can inspire future internal scaffolding, but V5 should not
  add a registry system before the workstation UI patterns stabilize.

Concrete V5 application:

- create native CSS/component contracts first, not React wrappers;
- model V5 button variants such as `default`, `outline`, `ghost`, `tool`,
  `danger`, and `icon`;
- model compact control sizes such as `xs`, `sm`, and `icon` for toolbars and
  floating transport;
- model dialog structure as header, body, section navigation, footer actions,
  close affordance, and inert backdrop behavior;
- model select/popover behavior with trigger, content, item, selected,
  disabled, and invalid states;
- keep split-pane behavior aligned with V5 layout runtime while borrowing the
  accessibility target from resizable panel patterns.

References checked during Step 488:

- `https://github.com/shadcn-ui/ui`
- `https://ui.shadcn.com/docs`
- `https://ui.shadcn.com/docs/theming`
- `https://ui.shadcn.com/docs/components/button`
- `https://ui.shadcn.com/docs/components/dialog`
- `https://ui.shadcn.com/docs/components/select`
- `https://ui.shadcn.com/docs/components/resizable`

## Component Rules

### Toolbar

- Toolbar controls are active-pane controls unless explicitly labeled as
  route-level navigation.
- A single shared control must reflect the active pane when the underlying
  setting is pane-local, such as display timeframe.
- Buttons and selects should keep stable dimensions across text/value changes.
- Disabled controls must remain legible but visually secondary.

### Layout Popover

- Layout mode uses an icon matrix style, not large text tabs.
- Single, twice, and triple remain the user-facing mode families.
- Variant controls may show multiple shapes per family, but they must dispatch
  layout commands instead of mutating route DOM directly.

### Settings

- Settings stays a formal modal with left section navigation, grouped controls,
  and bottom `Cancel` / `Ok`.
- Edits are draft-only until `Ok`.
- `Cancel`, close, and backdrop dismiss must discard draft edits.
- Settings targets the active pane by default when the setting is pane-local.
  Shared/global scope must be explicitly modeled before a control can affect
  all panes.

### Replay Transport

- Floating transport remains viewport-level UI.
- It should feel compact and tool-like, with high signal controls and no large
  text-button group.
- It must not cover active modal/popover surfaces.

### Chart Panes

- Every pane should expose equivalent chart chrome when the feature is enabled:
  OHLC overlay, timeframe label, price axis, time axis, reset view, active-pane
  border, and crosshair behavior.
- Active pane state must be obvious but not visually noisy.
- Split-pane resizing must use responsive ratios and minimum pane walls, not
  fixed pixel layouts.

## Interaction Quality Gates

Before closing a visual or interaction step, verify the relevant items:

- keyboard focus is visible for buttons, selects, checkboxes, and modal actions;
- hover, active, selected, disabled, and loading states are distinguishable;
- text does not overflow compact controls at desktop or mobile widths;
- popovers and modals layer above floating transport and chart overlays;
- active-pane controls update when active pane changes;
- chart panes retain axis/OHLC chrome after layout mode, split resize, and
  timeframe changes;
- screenshots or browser smokes cover the affected surfaces.

## Forbidden

- Do not add UI polish by bypassing runtime ownership. UI remains
  command/event-driven.
- Do not let a design tool generate production code directly into V5 without
  reviewing ownership, CSS token use, accessibility, and smoke coverage.
- Do not install shadcn/ui into V5 as a dependency unless a later framework
  decision moves V5 to React/Tailwind. Borrow the component-system ideas, not
  the runtime stack.
- Do not add per-pane duplicate toolbar controls unless the product contract
  explicitly changes from active-pane shared controls.
- Do not use fixed pixel pane widths/heights for split layout state.
- Do not introduce decorative gradients, oversized hero-style sections, or
  marketing-page composition into the workstation.
- Do not spread new one-off color palettes across feature CSS.

## Verification

Current and future checks should include:

- `node v5/tests/replay-workstation-layout-browser-smoke.js`
- `node v5/tests/replay-floating-controls-browser-smoke.js`
- `node v5/tests/replay-workstation-layout-browser-smoke.js` with multi-pane
  variants when layout changes are affected;
- visual screenshot checks for Settings, Layout popover, floating transport,
  and active-pane chrome when those surfaces change;
- `git diff --check`.

## Next Implementation Slice

The next UI implementation step should choose from the consolidated decisions
in `workstation-decision-backlog.md`, then use this visual-system spec for
surface-level rules. Broader Settings or chart-pane visual updates should follow
the token/component-state model already proven in Step 489.

Step 489 implementation status:

- V5 has a first native CSS token layer in `src/styles/app.css` covering
  workstation surfaces, borders, text roles, focus rings, accents, control
  heights, radius, shadows, and z-index layers.
- The chart workstation shell, route toolbar, active-pane chrome, chart toolbar,
  Layout popover, Go-to popover, footer status chips, and floating replay
  transport consume those tokens for common surface/state styling.
- The token pass is CSS-only. It does not change replay, chart, bar-data,
  layout runtime, or command dispatch ownership.
- Settings modal internals and broader form primitives remain the next likely
  tokenization surface.
