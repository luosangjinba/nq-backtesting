# V6 Product Top Chrome

Date: 2026-07-05

## Decision

The workstation top chrome is a product surface, not a diagnostics board. It
must prioritize the active replay context and user actions while keeping system
readiness summarized in friendly language.

## Default Surface

The first row should expose only:

- product identity: `FX Session Replay`;
- active context: symbol, timeframe, and display timezone;
- compact readiness: `System ready` plus a short user-facing detail;
- primary route actions: Sessions, Replay, Journal, Settings.

Do not show test filenames, command IDs, runtime IDs, gate names, latency test
names, or other engineering labels in the normal workstation chrome.

## Diagnostics Rule

Readiness telemetry may remain in DOM/controller state for smoke tests and
future developer tooling, but it must not occupy the main reading path. A future
diagnostics affordance may expose deeper details behind an explicit developer
mode; it must not become default UI.

Allowed default text examples:

- `System ready`;
- `System warming up`;
- `Replay workstation is ready`;
- `Some services are still starting`.

Disallowed default text examples:

- `boundary-smoke.js`;
- `Cache-hit latency`;
- `mixed-timeframe-visible-latency-browser-smoke.js`;
- raw runtime or command identifiers.

## Ownership Rule

Top chrome modules can render DOM, dispatch commands, and subscribe to event or
metadata surfaces. They must not import chart engine internals, bar-data
runtime internals, replay cursor internals, viewport-intent internals, or pane
runtime internals.

The current readiness surface reads command/runtime metadata only. It does not
own replay state, chart state, data loading, viewport intent, or pane state.

## Design References

Use the V5 design-reference decision as input when polishing V6 UI:

- `shadcn/ui` for restrained component composition and accessible control
  patterns;
- the user-provided GitHub UI references, including `ui-ux-pro-max`, for layout
  density, polish, and interaction review.

These are references, not direct dependencies. V6 must keep its owned markup,
CSS, command/event boundaries, and browser smoke protection.

## Required Protection

`v6/tests/app-shell-browser-smoke.js` must keep checking that:

- the readiness surface lives inside the top header;
- there is no standalone readiness row under the header;
- engineering gate text is absent from the default body text.

`v6/tests/boundary-smoke.js` remains the static enforcement layer for runtime
ownership.
