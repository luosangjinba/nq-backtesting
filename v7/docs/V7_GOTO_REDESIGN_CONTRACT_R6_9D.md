# V7 GoTo Redesign Contract — R6.9d

Status: headless contract accepted with automated evidence (2026-07-22)

## Decision

Quick GoTo and Exact GoTo are designed together because both move the one
Session-level Replay cursor and atomically reproject every visible Pane. They
remain separate presentation entries and are implemented in separate later
slices. Neither entry owns Replay state, requests bars, or writes a chart.

The word `Session` in Replay Session range means the start/end range selected
when the replay record was created. It is distinct from the Asian, London, and
New York market-session anchors.

## Quick GoTo Contract

The fixed menu contains eight forward-only actions:

| Action | Default New York wall time | Keyboard |
| --- | --- | --- |
| Next Day Open | `18:00` | `Y` |
| Next Session | derived | `Z` |
| Asian Session | `19:00` | `I` |
| London Session | `02:00` | `L` |
| New York Session | `09:30` | `N` |
| SB London | `03:00` | none |
| SB New York AM | `10:00` | none |
| SB New York PM | `14:00` | none |

All wall times use `America/New_York` and resolve through real DST-aware
instants. `Next Session` is the earliest strictly future candidate among only
Asian, London, and New York; it excludes Day Open and all Silver Bullet
anchors. Every other quick action also uses strict-forward semantics, so an
accepted cursor exactly at one anchor searches the next occurrence.

The configured wall time is an exclusive Replay cutoff. Source traversal must
confirm that the anchor has an eligible primary-source bar, but that bar is
only an eligibility witness and is not revealed by the jump. On `1m` data a
`09:30` shortcut therefore leaves `09:29` as the latest possible visible bar;
the `09:30` bar appears only after a later Replay step. This applies uniformly
to all eight Quick GoTo actions and every visible Pane.

Candidate generation does not invent weekend or holiday knowledge. The source
traversal owner accepts only a real eligible primary-instrument bar in the
bounded anchor window and otherwise continues to the next candidate inside the
Replay Session range.

The future Custom Settings surface configures the seven concrete `HH:mm`
values. All eight menu actions remain present: V7 does not implement FXReplay's
star-based visibility, Next News Event, Price, Future Date, or Days to skip.

## Range-End Outcome

If no later eligible candidate exists inside the Replay Session range, Quick
GoTo returns a terminal-free Replay-navigation rejection:

- status: `rejected`;
- code: `goto-target-unavailable-in-range`;
- Replay remains paused at the last accepted cursor;
- no Pane is acquired, projected, or visibly applied;
- the UI must later report the requested anchor and the New York range end as
  non-blocking feedback instead of switching the Workspace to a generic error.

The Workspace Transaction Runtime may observe the underlying target lookup as
a failed preparation, but Replay Navigation translates this one expected
domain outcome before it crosses the UI boundary. Other target, data, or chart
failures retain their existing failure semantics.

## Exact GoTo Contract

Exact GoTo remains the existing `goto-exact` action and may move forward,
backward, or retain the cursor. Its selected New York date/time is an exclusive
Replay cutoff: visible source data must precede it. A target is valid only in
the closed cursor range from Replay Session start through Replay Session end.

The later presentation slice must provide a separate Workspace-level entry,
default to the current Replay cursor, highlight the Replay Session date range,
disable dates outside it, validate time on the boundary dates, and retain the
dialog with explicit New York lower/upper-bound feedback after invalid input.
It must not place an active-Pane-local control because every Pane shares the
same Replay clock.

## Calendar Boundary

Exact GoTo consumes the existing generic Calendar Surface for wall-time
conversion and date/time selection. The future Economic Calendar is a separate
business event provider and presentation consumer. It may add read-only event
adornments to shared calendar primitives and emit the same Exact GoTo intent;
it may not own Replay or make Exact GoTo depend on news, orders, journal, or
training facts.

## Delivery Order

1. R6.9d freezes the shared pure contract and eight-anchor schedule.
2. R6.9e implements the eight-item quick menu, simplified globally persisted
   settings, and non-blocking range-end feedback; it awaits human review.
3. R6.9h separates Exact GoTo and adds the range-aware calendar UI; it is
   implemented and awaiting human review.
4. Combined real-browser evidence covers single/multi Pane, mixed instrument
   and TF, ETH/RTH, DST/weekends, range end, and exact forward/backward/no-op.

## Automated Gate

- `tests/replay-pane-response-contract-harness.js` binds all eight actions to
  one complete visible-Pane response plan;
- `tests/replay-navigation-runtime-harness.js` binds the seven defaults,
  custom settings shape, DST conversion, primary-only Next Session,
  strict-forward candidates, and the non-mutating range-end rejection;
- all 39 non-browser and six serial real-Chrome Harnesses pass;
- architecture, source-quality, JSON parsing, and `git diff --check` pass.
