# Runtime Lifecycle And Cleanup Contract

Phase: Phase 3 - Real Chart Interaction.

Phase gate: chart/workstation features can add panes, adapters, controllers,
subscriptions, observers, timers, and caches without leaking resources or
letting stale callbacks mutate current runtime state.

## Purpose

V5 runs in a garbage-collected JavaScript environment, but garbage collection
only releases objects that are no longer reachable. A removed DOM node, chart
host, pane, session, or controller can still be retained by event listeners,
runtime subscriptions, observers, timers, adapter references, or caches.

This contract defines the ownership rule for cleanup:

> The module that creates or owns a resource must also expose or perform the
> cleanup for that resource.

Garbage collection is not a substitute for lifecycle ownership.

## Resource Classes

The following resources require explicit lifecycle handling when introduced or
modified:

- DOM event listeners;
- command/event bus subscriptions;
- Lightweight Charts subscriptions;
- chart adapters and series objects;
- chart host references and pane host maps;
- `ResizeObserver`, `MutationObserver`, and similar browser observers;
- `setInterval`, long-lived `setTimeout`, animation frames, and playback loops;
- modal, popover, toolbar, and route controllers;
- replay/session/layout listeners that survive a render cycle;
- bar caches, display caches, and pane-local runtime state.

## Lifecycle Vocabulary

Use clear lifecycle names consistently:

- `mount`: attach a resource to a host, route, pane, or runtime.
- `update`: change options or state without replacing ownership.
- `destroy` or `dispose`: permanently release owned resources.
- `unsubscribe`: remove a bus or external library subscription.
- `clear`: remove data state owned by a runtime without necessarily destroying
  the runtime itself.

One-off helper functions may return a cleanup function instead of exposing a
class-style `destroy`, but the caller must store and run it at teardown.

## Ownership Rules

- App shell owns route lifecycle and must call route teardown when routes change.
- Route UI owns route-local DOM controllers and must destroy them during route
  teardown.
- Feature UI controllers own their DOM listeners, draft state listeners, and
  local timers.
- Chart runtime owns chart host maps, chart adapters, chart series writes,
  visible-range subscriptions, crosshair subscriptions, and resize observers
  associated with mounted chart hosts.
- Chart-engine adapters own the external chart instance and must remove or
  detach it when destroyed.
- Replay runtime owns replay playback timers, reveal state, and replay-owned
  subscriptions.
- Bar-data runtime owns bar caches and release/retention policy.
- Layout runtime owns layout state and pane identity, but it does not destroy
  chart adapters directly; it emits/accepts commands that let chart runtime
  clean up chart-owned pane resources.

## Required Cleanup Behavior

When a route, pane, session, controller, or adapter is replaced or destroyed:

- event listeners created for that object must be removed;
- bus subscriptions created for that object must be unsubscribed;
- observers created for that object must be disconnected;
- timers and animation frames created for that object must be cleared;
- chart adapters created for that object must be destroyed;
- stale host references must be removed from runtime maps;
- pane-local state that no longer has a pane must be released or marked
  unreachable by runtime state;
- asynchronous work must verify the target session/pane/controller is still
  current before mutating state.

## Forbidden

- Do not rely on removed DOM nodes being garbage-collected while listeners,
  observers, or runtime maps still reference them.
- Do not create event bus subscriptions in render/update paths without a
  matching teardown path.
- Do not create a new Lightweight chart adapter for a pane without destroying
  the previous adapter for that pane.
- Do not let a route UI module call external chart cleanup APIs directly when
  chart runtime owns the adapter.
- Do not store unbounded bar/display caches without retention or release rules.
- Do not keep stale async callbacks that can update the wrong session or pane
  after a route, session, or layout switch.

## Verification

Future lifecycle-sensitive steps should include at least one relevant check:

- route teardown leaves no duplicate route/controller subscriptions;
- switching layout mode does not leave disconnected pane hosts in chart runtime;
- layout pane removal releases pane-local chart display state through chart
  runtime, while preserving primary/global replay state;
- replacing a chart host destroys or detaches the previous adapter;
- switching sessions clears or scopes replay display/cache state correctly;
- replay pause/teardown clears playback timers;
- modal/popover close destroys route-local listeners or draft subscriptions;
- static audit of high-risk resource creation patterns is updated when new
  resources are added.

## Relationship To Other Specs

- `runtime-boundary-contracts.md` defines command/event ownership.
- `layout-split-panes-contract.md` defines pane ownership and active-pane
  semantics.
- `chart-engine-adapter.md` defines chart adapter isolation.
- `workstation-decision-backlog.md` routes future chart/workstation planning.
