# V7 Session Browser Surface

Status: R2.2 visible-surface contract (2026-07-19)

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

- Session list with distinct name, instruments, creation time, and range;
- accessible Create Session dialog with a compact multi-select instrument
  dropdown and explicit date-times;
- a fresh empty creation draft on every open; name, instruments, Start, End,
  search, and dropdown state never leak into a later creation attempt;
- configuration-driven asset discovery with search, dynamic category filters,
  bounded scrolling, descriptions, and venue metadata; adding an instrument or
  category does not add a concrete-id branch to Session Browser code;
- selected Session summary with only that Session's metadata;
- loading, empty, unavailable, stale, error, and ready states;
- retained list snapshot during a write and inline failure presentation;
- keyboard focus rings, native dialog Escape behavior, reduced motion, and
  responsive rail/card/form layouts.

Start and End depend on one replaceable date-time-control interface owned by
the Session Browser adapter. Its current native-input implementation owns DOM
formatting, reset, epoch parsing, and minute/second precision. Create Session
does not read native input details directly. A future flatpickr or custom
day/month/year adapter must pass the same interface and preserve empty-draft and
epoch semantics; it cannot own market-data availability or Session state.

No fake Replay, chart, order, Journal, campaign, plugin, or unavailable future
control may appear. Revision, activation generation, internal phase names, and
debug state are not customer-visible.

## Fixed Visual Fixtures

Chrome at `1440x900`, device scale factor 1, and reduced motion captures:

- empty Session list;
- Create Session dialog;
- ready list with distinct Alpha/Beta Sessions;
- selected Beta after hard refresh.

The browser harness compares screenshots byte-for-byte and executes create A,
fresh-default draft verification before create B, A→B, hard refresh on B, and
reopen A. A visual change requires an explicit fixture update plus human review.

## R2.2 Boundary

Hard refresh proves Session list and selected metadata persistence only. Full
layout, pane, cursor, and viewport restoration remains UX-FND-004/R7 and must
not be claimed by this surface.
