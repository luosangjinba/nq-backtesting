# FXReplay Parity Gap Audit

Phase: Phase 3 - Real Chart Interaction / Replay Workstation polish.

Phase gate: future parity work should be selected from user-visible workflow
gaps and implemented through V5 runtime/controller boundaries, not by copying
V4 or FXReplay frontend ownership patterns.

## Purpose

This audit records the current V5 replay workstation parity state after Steps
524-527. It is a routing document for choosing the next bounded replay
workstation step.

## Reference Check

- Lightweight Charts plugins documentation checked on 2026-07-04:
  `https://tradingview.github.io/lightweight-charts/docs/plugins/intro`.
  Useful extension points are custom series and primitives for custom visual
  rendering, drawing tools, annotations, indicators, watermarks, and similar
  chart-layer features.
- awesome-tradingview checked on 2026-07-04:
  `https://github.com/tradingview/awesome-tradingview`.
  Relevant references include official Lightweight Charts examples, indicator
  packages, a visible price range utility plugin, and wrappers.
- Audit decision: no new plugin dependency is justified before a concrete
  parity feature requires chart-rendered custom visuals or drawing tools.

## Audit Criteria

Each parity gap should be judged by:

- user-visible replay workflow value;
- implementation risk and V5 boundary clarity;
- availability of an existing smoke/browser harness;
- whether the issue is already reported as manually acceptable;
- whether an external chart capability can solve it without breaking V5
  ownership rules.

## Current Coverage Matrix

| Area | Current V5 State | Parity Status | Owner Boundary | Coverage |
| --- | --- | --- | --- | --- |
| Single-pane `Next` visible latency | Latest-intent and cadence paths are under the product target in headless smokes. | Covered | replay runtime, chart runtime, replay controls UI | `replay-latest-intent-browser-smoke.js`, `replay-cadence-latency-browser-smoke.js` |
| Multi-pane rapid `Next` feel | Manual testing reports FXReplay-comparable feel; all-pane headless metric is guarded at 300ms. | Covered enough; optional audit only | replay runtime, pane projection, chart runtime | `multi-pane-rapid-next-performance-browser-smoke.js`, `multi-pane-latest-intent-audit-browser-smoke.js` |
| Replay keyboard controls | `ArrowRight`, `ArrowLeft`, and `Space` dispatch through replay controls with focus/popover protection. | Covered | chart replay controls controller | `replay-keyboard-controls-browser-smoke.js` |
| Playback speed ergonomics | Presets, range input, and `[` / `]` speed nudges set route-owned interval and feed Play. | Covered | chart replay controls controller, floating transport UI | `replay-speed-controls-browser-smoke.js` |
| Transport position/speed persistence | Floating transport position and playback speed persist across route re-entry/reload with viewport clamping. | Covered | replay transport preferences adapter, floating transport UI | `replay-transport-persistence-browser-smoke.js` |
| Replay previous/reset/truncate | Previous, reset, and pick-then-click truncate behavior exist with smoke coverage. | Mostly covered | replay runtime, replay controls UI, truncate controller | `replay-controls-browser-smoke.js` |
| Replay interval step size | Replay interval dropdown controls step size; sync can copy active chart interval. | Covered | replay controls UI, replay runtime commands | `replay-floating-controls-browser-smoke.js` |
| Chart drag/wheel/manual viewport | Native chart drag/zoom and replay follow/manual anchors are covered. | Mostly covered | chart runtime/adapter, viewport demand bridge | `chart-interaction-browser-smoke.js`, `chart-native-interaction-browser-smoke.js`, viewport smokes |
| Reset view | Reset restores time follow and price autoscale. | Covered | chart runtime/adapter, chart replay UI | reset and chart interaction smokes |
| Multi-pane layout modes | Bounded single/twice/triple modes, variants, active pane, split ratios, pane-local TF/display, and projection exist. | Mostly covered | layout runtime, pane orchestrator, chart runtime, replay runtime | multi-pane rebuild/active-pane/viewport smokes |
| Multi-pane physical interaction | Wheel/drag/axis interactions on secondary panes are less directly audited than command-driven panes. | Open audit gap | chart runtime per-pane interaction state, pane shell | needs targeted smoke if chosen |
| Settings parity | Many chart presentation settings exist, but no current full FXReplay settings parity checklist is maintained. | Open audit gap | chart settings controller, chart presentation runtime | settings polish/presentation smokes |
| Drawing tools/annotations | No V5 drawing tools/annotation workflow is active. Lightweight primitives could be relevant later. | Open product gap | future drawing feature controller, chart runtime/adapter plugin boundary | no current smoke |
| Trade/order markers | No order marker/review overlay workflow is active in V5. | Open product gap | future review/order domain, chart runtime/adapter primitives | no current smoke |
| Session setup/import workflow | Session creation exists; broader local import/export and backup remain later local-first work. | Open product gap | session runtime/repository, local deployment/persistence | session smokes |
| Workstation preference management | Transport preferences persist, but there is no UI to reset/export preferences. | Low-priority gap | future preferences UI/controller | transport persistence smoke covers data path |
| Visual parity screenshots | Existing smokes cover layout and polish, but no current FXReplay visual comparison checklist is maintained. | Open audit gap | CSS modules, screenshot harness | existing screenshot/layout smokes can be extended |
| Accessibility polish | Basic labels and focus guards exist, but there is no dedicated keyboard/focus acceptance matrix. | Open audit gap | feature UI controllers, templates | keyboard smokes cover replay shortcuts only |

## Boundary Rules For Future Parity Work

- UI controllers may own DOM behavior, focus rules, and command dispatch.
- Replay runtime remains the only owner of replay cursor, reveal state, and
  playback state.
- Chart runtime/adapter remains the only owner of chart series writes,
  visible ranges, pane hosts, and chart engine API calls.
- Bar-data runtime remains the only requester/cache owner for bars.
- Layout runtime remains the owner of pane list, active pane, sync flags, and
  split ratios.
- New chart-rendered features such as drawing tools, annotations, or order
  overlays should first define a chart-runtime/adapter boundary and only then
  evaluate Lightweight Charts primitives or plugin examples.

## Audit Outcome

The recent replay transport parity chain is now covered enough to pause active
optimization. The remaining gaps are mostly product/workflow gaps:

- physical secondary-pane interaction audit;
- settings parity checklist;
- drawing/annotation workflow;
- trade/order marker review overlays;
- local-first import/export/backup;
- visual/accessibility parity checklists.

The next step should pick one bounded item from these gaps and add acceptance
coverage before implementation.
