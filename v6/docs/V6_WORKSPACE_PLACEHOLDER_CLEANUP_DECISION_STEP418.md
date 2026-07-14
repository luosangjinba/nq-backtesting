# V6 Workspace Placeholder Cleanup Decision - Step 418

Date: 2026-07-14

## Decision

Production UI must describe current capability, not reserve every possible
future feature. Step 418 supersedes the earlier rule that owner-gated FXReplay
placeholders should remain visibly inert.

Removing an entry from production markup does not reject the capability. A
future feature may restore an entry only in the same bounded step that provides
its real owner, command/event path, and acceptance test.

## Cleanup Classes

### Class A - Delete clone-only or duplicate UI

Delete production markup, dedicated CSS, and selector-only parity assertions:

- generic top Search, which duplicates unresolved symbol-search intent;
- static `NQ-2018` layout-name text;
- duplicate disabled right-rail Journal entry (top Journal is functional);
- undefined right-rail Watch/spark entry;
- the entire Session Settings placeholder panel and its disabled Template/Apply
  controls.

No product capability or owner contract is preserved for generic Search,
static layout-name text, or Watch. Session settings and Journal concepts remain
documented under their actual owners, not through fake production UI.

### Class B - Remove current entry, preserve future capability boundary

Remove these from production markup and reclaim their layout space, while
retaining relevant contracts/docs for later three-mode architecture decisions:

- symbol search and comparison symbol;
- Indicators;
- Undo and Redo;
- ETH/session-hours selector;
- Screenshot;
- Theme and Fullscreen;
- entire left Drawing rail;
- right-rail Object tree, Order, and News;
- entire bottom account/trading/analytics chrome.

These entries are not rejected. They may return only with implementation. In
particular, Drawing, Order, Screenshot/evidence, and execution/account concepts
are likely shared bricks for future modes, but their entry points must follow
the shared architecture rather than predate it.

### Class C - Keep visible

Keep currently functional chart-workstation surfaces:

- back navigation, active symbol, timeframe, layouts and sync;
- Settings, top Replay, and top Journal;
- Pane readouts, maximize, Reset View, and chart interactions;
- Go-to and its Custom Settings;
- complete Replay transport, including state-disabled controls.

### Class D - Preserve state, simplify production presentation

The Replay status footer carries real state and is not eligible for placeholder
deletion. Replace its engineering-oriented full-row presentation with a compact
user-facing session/replay status.

- do not expose the internal session id by default;
- do not make raw revealed/hidden counters permanent chart chrome;
- avoid duplicating Play/Pause state already visible in the transport;
- retain no-future protection as a clear user concept when it provides useful
  assurance;
- keep detailed cursor, coverage, and hidden-bar diagnostics available to tests
  and development diagnostics without requiring visible production badges.

Exact copy and placement require a bounded UI decision during the execution
batch; this cleanup decision does not authorize changes to Replay semantics.

## CSS And Test Policy

- Remove CSS selectors that serve only deleted markup after confirming no
  shared class consumer remains.
- Update browser baselines for reclaimed chart space and toolbar alignment.
- Replace placeholder-presence assertions with absence assertions where the
  decision is permanent for current production.
- Keep domain contract tests, but remove assertions that require their disabled
  production button to exist.
- Do not delete owner/domain files solely because no UI entry is visible.

## Execution Batches

1. Class A top/right duplicate and clone artifacts.
2. Session Settings placeholder family.
3. Class B top and side reserved tools.
4. Bottom account/trading chrome.
5. Replay footer presentation simplification.
6. CSS/static/browser test consolidation and visual acceptance.

Each batch must be independently committed and leave Replay, Go-to, layouts,
Settings, Journal, and chart regressions green.

## Stop Conditions

Stop a cleanup batch if it:

- removes a control backed by a mounted production owner;
- deletes a domain/owner contract together with a UI entry without a separate
  product decision;
- changes Replay cursor, chart bars, viewport intent, or persistence;
- reduces chart usability or creates toolbar overlap at supported resolutions;
- modifies the three-mode product architecture before that architecture is
  accepted.
