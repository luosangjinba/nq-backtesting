# V6 Workflow Surfaces Audit

Date: 2026-07-05

## Decision

The workflow entry surfaces are useful for development, but the default
workstation screen must not expose engineering test names or implementation
details to regular users. Runtime and gate diagnostics may exist, but they must
be hidden behind a diagnostics affordance or a developer mode.

## Surface Inventory

| Surface | Owner | Allowed behavior | User-facing status |
| --- | --- | --- | --- |
| Transport | `v6/src/shell/replay-transport.js` | Dispatch replay/default-wall transport commands | Keep visible |
| Status | `v6/src/shell/status-readout.js` | Subscribe to replay/default-wall events | Keep visible |
| Settings | `v6/src/shell/settings-panel.js` | Dispatch settings commands | Keep visible behind Settings |
| Sessions | `v6/src/shell/sessions-surface.js` | Dispatch session commands only | Keep visible behind Sessions |
| Replay workflow | `v6/src/shell/replay-workflow-surface.js` | Read replay/default-wall state, pause/reset | Keep visible behind Replay |
| Journal | `v6/src/shell/journal-surface.js` | Dispatch journal/journal-persistence commands | Keep visible behind Journal |
| Readiness | `v6/src/shell/readiness-surface.js` | Read command/runtime metadata only | User-friendly summary only |

## UI Principles

- The first viewport should prioritize chart, replay controls, and trading
  context.
- Do not show file names, test names, command IDs, runtime IDs, or engineering
  gate names in normal user UI.
- If a system health indicator is shown, use product language such as
  `System ready`, `Core checks passed`, or `Some services are still starting`.
- Detailed diagnostics may remain available for development, but must be hidden
  by default.
- Feature UI dispatches commands and subscribes to events. It must not import
  feature runtime internals or chart/data/viewport ownership paths.

## Design References

Carry forward the V5 UI reference decision:

- `shadcn/ui` is a component-engineering reference, not a dependency.
- The previously provided GitHub UI design references, including
  `ui-ux-pro-max` or equivalent design tools, should inform review before V6 UI
  polish work.
- Any borrowed pattern must be translated into V6-owned markup, semantic CSS,
  command/event boundaries, and browser checks.

## Required Protection

The app shell browser smoke must fail if the default UI exposes engineering gate
text such as:

- `boundary-smoke.js`
- `Cache-hit latency`
- `mixed-timeframe-visible-latency-browser-smoke.js`

Boundary smoke remains the enforcement layer for workflow UI ownership.

## Next Bounded Target

Step 32 should begin product UI consolidation, not add another workflow panel.
The first target should be the top chrome:

- keep only user-meaningful controls visible by default;
- move diagnostics out of the main reading path;
- preserve all command/event boundaries and latency/multi-pane gates.
