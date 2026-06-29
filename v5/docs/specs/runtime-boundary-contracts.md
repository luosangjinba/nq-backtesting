# Runtime Boundary Contracts

This spec defines the stable V5 rules for runtime-facing contracts, event
mutation boundaries, and router lifecycle scope.

## Command And Event Contracts

Feature modules use pure contract modules for command and event names.

Rules:

- command and event names live in `v5/src/contracts/`;
- contract modules export constants only;
- feature modules may import contract modules plus the generic command/event bus;
- feature modules must not import runtime implementation modules just to access
  command or event names;
- runtime implementation modules register the same contract names and may
  re-export them for test compatibility.

This keeps the feature-facing API stable while allowing runtime internals to
change.

## Events Notify, Commands Mutate

Events are notification channels. Runtime state mutation must stay observable
through registered commands.

Rules:

- event handlers must not become hidden mutation paths;
- runtime event reactions that need mutation should dispatch a registered command;
- replay reactions to chart viewport events dispatch replay commands such as
  `replay.loadPrefixDemand` and `replay.applyPrefixRetention`;
- any future direct event-driven mutation exception requires an ADR that names
  the event, owner runtime, mutation, and verification boundary.

## Router Scope And Lifecycle

Router lifecycle stays scoped to the app shell/root.

Rules:

- router receives a root scope from the app shell;
- route-link state updates search inside that root, not the global document;
- route replacement calls the current rendered element's cleanup hook when one
  exists;
- route cleanup must dispose feature event subscriptions attached by that route.

## Forbidden

- Feature modules importing `runtime/*-runtime.js` implementations.
- Feature modules importing bars or chart internals directly.
- Runtime event handlers directly calling local mutation helpers when a command
  contract exists for the same mutation.
- Router global `document.querySelectorAll` scans for route-link state.

## Verification

Current harnesses:

- `v5/tests/boundary-smoke.js`
  - feature modules use contracts and generic buses, not runtime implementations;
  - router does not scan the global document for route links.
- `v5/tests/runtime-boundary-smoke.js`
  - replay chart-event handlers dispatch replay commands instead of directly
    calling mutation helpers.
- `v5/tests/runtime-smoke.js`
  - router route-link updates are scoped to the injected root.
- `v5/scripts/smoke_all.js`
  - keeps boundary and runtime checks in the full V5 smoke suite.
