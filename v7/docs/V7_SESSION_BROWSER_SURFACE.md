# V7 Session Browser Surface

Status: R2.2 and R2.4 human accepted (2026-07-21); 2026-08-05 overall-
acceptance corrections implemented, awaiting deployed human recheck

## Owner And Ports

`adapter.session-browser-ui` exclusively owns DOM below its supplied root. It
receives the public Session Store, hash-navigation, identity allocation, clock,
instrument display configuration, and scheduler ports. It does not access
Session Store internals, storage keys, bars, Replay, pane, viewport, provider,
or chart state.

The browser composition root wires `window.localStorage` through
`adapter.session-persistence`. URL hash state identifies the selected Session
for navigation and refresh; it is not an implicit active-Session persistence
key. Every activation still passes the branded SessionId to Session Store.

## Customer Surfaces

- Session list with distinct name, instruments, and authoritative historical
  range; creation time is intentionally omitted because it can be confused
  with the replay range;
- one visible Delete action per Session with an inline, keyboard-focused
  permanent-delete confirmation before any Store command is dispatched;
- accessible Create Session dialog with a compact multi-select instrument
  dropdown that collapses after each selection and explicit date-times;
- a fresh empty creation draft on every open; name, instruments, Start, End,
  search, and dropdown state never leak into a later creation attempt;
- configuration-driven asset discovery with search, dynamic category filters,
  bounded scrolling, descriptions, and venue metadata; adding an instrument or
  category does not add a concrete-id branch to Session Browser code;
- selected Session summary with only that Session's metadata;
- loading, empty, unavailable, stale, error, and ready states;
- retained list snapshot during a write and inline failure presentation;
- successful creation navigates directly to the new Session URL and activates
  its supported Chart surface; unsupported configurations open the new Session
  summary on the same route rather than returning to the list;
- keyboard focus rings, native dialog Escape behavior, reduced motion, and
  responsive rail/card/form layouts.
- a list-only deeper neutral background, brighter semantic text colors, and
  larger primary/card/form typography without changing immersive chart tokens.

Start and End depend on the replaceable `adapter.calendar-surface` public
interface. Calendar Surface owns day/month/decade views, local time stepping,
Today/Clear actions, overlay focus/close behavior, formatting, reset, epoch
parsing, and minute/second precision. Session Browser does not read picker DOM
or model internals. A replacement must pass the same public conformance and
preserve empty-draft and epoch semantics. Calendar Surface cannot own
market-data availability or Session state.

The Session Browser's separate market-date policy owns CME Saturday boundary
shorthand. A Saturday is selectable for Start when the following Sunday is
source-backed and the fixed `18:00 America/New_York` boundary is inside shared
source coverage. It is selectable for End when the preceding Friday is source-
backed and `16:59` is inside shared coverage. Start resolves to Sunday `18:00`;
End remains customer-visible as Friday `16:59` while Session creation stores
Friday `17:00` as Replay's exclusive cutoff. The generic Calendar Surface
receives only enabled-date predicates and never acquires CME schedule or market-
data ownership.

No fake Replay, chart, order, Journal, campaign, plugin, or unavailable future
control may appear. Revision, activation generation, internal phase names, and
debug state are not customer-visible.

## Fixed Visual Fixtures

Chrome at `1440x900`, device scale factor 1, and reduced motion captures:

- empty Session list;
- Create Session dialog;
- open professional date-time picker;
- ready list with distinct Alpha/Beta Sessions;
- inline permanent-delete confirmation for Beta;
- selected Beta after hard refresh.

The browser harness compares screenshots byte-for-byte and executes dropdown
collapse, Saturday Start/End resolution, direct-open create A, fresh-default
draft verification before direct-open create B, A→B,
hard refresh on B, reopen A, cancel delete B, confirm delete B, and verify both
its indexed identity and record key are gone while A remains. A visual change
requires an explicit fixture update plus human review.

## R2.4 Readability And Delete Follow-Up

Session Browser remains the DOM owner and dispatches deletion only through the
public Session Store. Session Store validates the explicit branded Session id
and current revision before Repository removes the indexed identity and record
key. The UI cannot delete storage keys, chart data, or another Session's state.

Deletion is permanent and therefore requires a second explicit confirmation;
Cancel restores the normal card actions without writing. Delete failure retains
the current list snapshot and uses the existing inline error state. Deleting the
last Session naturally returns the existing empty state.

The user accepted the deeper list presentation, brighter/larger typography,
per-card Delete discovery, safe Cancel path, and confirmed deletion on
2026-07-21.

## R2.2 Boundary

Hard refresh proves Session list and selected metadata persistence only. Full
layout, pane, cursor, and viewport restoration remains UX-FND-004/R7 and must
not be claimed by this surface.
