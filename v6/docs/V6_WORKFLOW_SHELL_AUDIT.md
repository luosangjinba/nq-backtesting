# V6 Workflow Shell Audit

Date: 2026-07-05

## Decision

The workflow shell changes from Steps 32-36 are accepted as shell-owned UI
behavior. They should not expand into chart, replay, bar-data, viewport, pane,
or feature-runtime ownership.

## Audited Scope

| Area | Owner | Behavior | Protection |
| --- | --- | --- | --- |
| Top chrome | `v6/src/shell/workstation-shell.js` | Product identity, market context, compact readiness, workflow actions | `v6/tests/app-shell-browser-smoke.js` |
| Workflow panels | shell panel controllers | Sessions, Replay, Journal, Settings panel UI and command dispatch | `v6/tests/workflow-panels-browser-smoke.js` |
| Active state | `v6/src/shell/workflow-action-state.js` | Top action class, data state, `aria-expanded`, `aria-pressed` | `v6/tests/workflow-action-state-smoke.js` |
| Close behavior | `v6/src/shell/workflow-panel-close.js` | Close buttons, repeated top-action close, Escape close | `v6/tests/workflow-panel-close-smoke.js` |
| Mutual exclusivity | `v6/src/shell/workflow-panel-coordinator.js` | Opening one workflow panel closes the others | `v6/tests/workflow-panel-coordinator-smoke.js` |

## Boundary Findings

Workflow UI modules may import:

- command constants from `v6/src/contracts/app-contracts.js`;
- the runtime command dispatcher;
- focused shell UI helpers;
- pure shell surface models.

Workflow UI modules must not import:

- chart engine or chart-data internals;
- bar-data runtime internals;
- replay runtime internals;
- viewport-intent or chart-viewport internals;
- pane runtime internals;
- persistence, journal, settings, session, or default-wall runtime internals
  outside their approved command contract surface.

The current implementation satisfies this boundary. `v6/tests/boundary-smoke.js`
remains the static enforcement gate.

## Product Findings

- The first row now prioritizes product context and user actions.
- Readiness is summarized inside the header and no longer occupies a separate
  diagnostics strip.
- Workflow panels use product-facing copy and compact layout.
- Only one workflow panel can be open, which protects the chart workspace from
  stacked panel growth.
- Close behavior is explicit and keyboard-accessible without cross-feature
  coordination.

## Remaining Risks

- The panels are still workflow scaffolding, not the final chart/replay product
  experience.
- Further UI polish should not continue indefinitely before returning to
  replay/chart value.
- Any future diagnostics view must remain explicit and hidden from default UI.

## Next Direction

The next executable step should leave the workflow shell alone unless a concrete
workflow bug appears. Continue toward user-visible replay value by auditing the
current chart/replay readiness gates and selecting the next chart-facing step
from the roadmap.
