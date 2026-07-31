# V7 UI And Composition Split — R8.10

Status: completed recovery activation (2026-07-30)

## Outcome

R8.10 separates Replay Workspace command/DOM presentation from production
runtime construction and orchestration without changing any accepted control,
gesture, chart, Replay, persistence, layout, or visible-completion behavior.

`adapter.replay-workspace-ui` now owns only its DOM subtree, read-only
presentation adapter, user-intent callback wiring, and mount/unmount lifecycle.
It does not construct Replay Runtime, Bar Data Runtime, Workspace State Runtime,
Workspace Transaction Runtime, Chart Snapshot Application, or the Lightweight
Charts adapter.

`core.replay-workspace-composition` now owns Session-scoped construction,
public-port orchestration, and reverse lifecycle cleanup. It does not own
Replay cursor, market-data retention, semantic Workspace state, Chart series,
or persisted Session records; those remain with their existing sole owners.

## Public Boundaries

The UI mounts one DOM view, adapts it to an explicit presentation port, creates
one composition through its public entry, and maps controls to the returned
command port. The presentation port exposes only named view operations and the
existing chart-surface capability; the composition contains no `document`,
`window`, query-selector, or DOM-event access.

The composition is divided into focused implementation boundaries:

- `workspace-composition.js` coordinates focused owner-assembly modules and
  their public ports;
- `workspace-command-port.js` composes focused user-command families over
  those existing owners but constructs none;
- acquisition, history, publication, checkpoint, Pane location, autoplay, and
  capability helpers remain focused files under the composition module;
- Replay Workspace UI retains only view/dialog/control files plus the surface
  and presentation adapter.

The former mixed-purpose `replay-workspace-ui/workspace-controller.js` is
deleted rather than retained as a forwarding shard.

## Executable Evidence

`tests/replay-workspace-composition-harness.js` imports the production public
entry directly and proves the positive boundary plus six negative controls:

- UI construction of a runtime owner fails;
- bypassing the public composition port fails;
- bypassing the presentation subscription fails;
- composition DOM access fails;
- omission of a required owner construction fails;
- command-port owner construction fails.

The production analyzer now scans 46 modules, 125 actual dependency edges, 122
construction sites, and seven critical writer sites. Replay Workspace UI has
nine actual dependencies; the new composition module declares all 28 of its
actual runtime/adapter dependencies. The only two blocking findings remain the
unchanged R8.11 production roots that bypass ModuleHost.

Real Replay Pane Workspace, Replay Layout Workspace, and global atomic commit
Harnesses prove unchanged successful interaction and failure settlement. H024
returns to `accepted` with its original human interaction acceptance retained
and this R8.10 recovery evidence added.

## Ecosystem Boundary

R8.10 changes JavaScript module ownership only. It introduces no chart API,
series mutation, plugin, or rendering behavior. The official Lightweight
Charts and awesome-tradingview review recorded by R8.8/R8.9 therefore remains
the applicable external capability evidence; no external library provides or
replaces this application composition boundary.

## Scope Boundary

R8.10 deliberately does not change either real HTML production root to use
ModuleHost. `app/main.js` and `app/data-acquisition.js` remain the two recorded
`BUG-V7-0004` findings and are the exact R8.11 scope.
