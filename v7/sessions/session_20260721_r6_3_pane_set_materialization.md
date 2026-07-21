# Session — R6.3 Complete Pane-set Materialization

Date: 2026-07-21
Status: automated complete; no browser-visible change

## Boundary

Activated `core.pane-set-materialization` as a stateless adapter behind the
existing Workspace Transaction Runtime acquisition and Projection stages. It
adds no coordinator, accepted-state owner, raw-data requester, Replay clock,
Viewport owner, or chart writer.

The existing `core.chart-snapshot-application` sole-writer boundary now also
offers a complete Pane-set constructor. The accepted real browser continues to
use its existing single-Pane constructor until the R6.5 interaction/visual
step.

## Contract

- one branded transaction input carries the exact R6.2 response plan and one
  immutable request for every Pane in stable order;
- every Pane request shares the same transaction identity, Replay proposal,
  operation, and AbortSignal;
- no acquired or projected subset can become a workspace snapshot;
- a Pane may materialize as ready, `no-source-data`, or
  `no-eligible-source`, without stalling or forking Replay;
- one schema-v2 snapshot carries the complete ordered Pane result set plus the
  exact response plan and cursor proposal;
- the sole chart-writer boundary revalidates plan order, identity, proposal,
  target direction, Pane provenance, Session Hours, and calendar revision;
- the adapter stages the complete set and performs one visible apply;
- dependency, staging, visible-apply, stale, and cancellation failures preserve
  the last accepted Replay, workspace, and chart state.

## Evidence

- `node v7/tests/pane-set-materialization-harness.js` passes mixed NQ/ES and
  `1m`/`4h` success, a non-blocking empty comparison Pane, single visible
  apply, delayed old/fast new supersession, failure preservation, and 22
  negative/race controls;
- chart application, Replay × Pane response, Workspace Transaction, and Pane
  Workspace focused Harnesses pass;
- architecture boundary/hardening, module-host, source-quality, and the full
  non-browser Harness suite pass;
- `git diff --check` passes.

## Continuation

R6.4 activates Previous, Autoplay, Restart/Back-to, quick GoTo, and exact GoTo
through the shared R6.2 plan plus R6.3 materialization path. R6.5 later mounts
the real multi-Pane browser surface and requires human interaction/visual
review.
