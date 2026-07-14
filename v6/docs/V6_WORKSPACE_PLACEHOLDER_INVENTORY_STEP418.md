# V6 Workspace Placeholder Inventory - Step 418

Date: 2026-07-14

## Scope

This is a read-only audit of the chart workstation production shell. It does
not remove UI, activate controls, or delete future owner contracts. Session
Dashboard controls and genuine Replay/Chart/Settings behavior are outside this
cleanup inventory.

An item is an empty shell when it is visible in production but has no active
owner/command/event consumer and communicates no current state. A disabled
control is not automatically an empty shell: Replay Previous and Restart, for
example, have real command paths and are disabled by current replay state.

## Confirmed Functional Surfaces

These are not cleanup targets:

- session-dashboard back navigation and active symbol readout;
- display-timeframe menu for supported periods;
- multi-pane layout and sync controls;
- Chart Settings;
- top Replay and Journal workflow panels;
- Pane status/OHLC, maximize, Reset View, and chart interactions;
- Go-to actions and Go-to Custom Settings;
- Replay transport, including state-dependent Restart/Previous;
- replay status footer state (the current presentation is audited separately
  below).

## Functional But User-Unfriendly Surface

The Replay status footer is not an empty shell: it exposes real session,
cursor, reveal, playback, and no-future state. It must therefore not be deleted
as placeholder markup.

Its current production wording is nevertheless engineering-facing and consumes
a full persistent row:

- `Session v6-session-...` exposes an internal identifier;
- `Start`, `Cursor`, and `End` repeat information that is more naturally
  expressed by the replay controls or a compact session summary;
- `Revealed x/y` and `No future n hidden` expose implementation counters rather
  than user intent;
- `Playback paused/ready` duplicates transport state.

Step 418 should preserve the underlying diagnostic state while replacing the
default production presentation with a compact user-facing status. Detailed
counters may remain available through a development/diagnostic surface rather
than occupying the main chart workspace.

## Empty-Shell Inventory

### Top toolbar

| Surface | Evidence | Current state |
| --- | --- | --- |
| symbol search | disabled markup; no mounted controller | empty shell |
| comparison symbol | disabled markup; no owner | empty shell |
| Indicators | disabled; only an owner contract exists | empty shell |
| Undo / Redo | disabled; only drawing/action-history contract exists | empty shell |
| ETH/session-hours selector | disabled; no session-hours owner | empty shell |
| generic Search | disabled and duplicates symbol-search intent | clone-only shell |
| `NQ-2018` layout name | static text; not layout state | misleading clone artifact |
| Screenshot | disabled; only export contract exists | empty shell |
| Theme | disabled; no shell-theme owner | empty shell |
| Fullscreen | disabled; no browser-capability controller | empty shell |

### Left drawing rail

The Cursor, Trend Line, Horizontal Line, Rectangle, Measure, and Text controls
are all disabled and have no production drawing owner. The whole rail is one
reserved shell family rather than six implemented tools.

### Right utility rail

| Surface | Evidence | Current state |
| --- | --- | --- |
| Object tree | disabled; no object/drawing owner | empty shell |
| Order | disabled; only account/trading contract exists | empty shell |
| News | disabled; no calendar/news owner | empty shell |
| Journal | disabled and duplicates the functional top Journal entry | clone-only duplicate |
| Watch/spark | disabled; no defined V6 product meaning | clone-only shell |
| Session Settings | panel opens, but every field/action is disabled and no runtime is mounted | interactive-looking empty shell |

### Bottom account/trading chrome

Buy, Sell, Qty, Balance, Realized, Unrealized, and Analytics occupy persistent
chart space but have no active account/order/analytics owner. The region is one
empty shell family. It must not be confused with the functional Replay
transport layered above it.

## Test Coupling

Several historical parity tests assert that placeholders exist and remain
disabled. These tests encode the former FXReplay-clone reservation decision,
not current product behavior. A cleanup must update or retire them together
with markup/CSS; leaving them unchanged would make tests preserve obsolete UI.

Affected families include:

- top-toolbar parity;
- left-drawing-rail reservation;
- right-utility-rail reservation;
- bottom-account-chrome reservation;
- Session Settings reservation;
- indicators, drawing/action-history, screenshot, and account/trading contract
  tests that assert disabled production selectors.
- replay-footer browser assertions that encode the current engineering labels
  or full-width footer layout.

The domain/owner contracts themselves are not empty-shell code and should not
be deleted merely because their current production entry is hidden or removed.

## Conflict With Earlier Guardrails

The July 5/7 FXReplay parity documents instructed V6 to keep inert placeholders
visible. That direction predates the three-mode architecture discussion and the
user decision to clean the workspace. Step 418 must explicitly supersede the
visible-placeholder policy before production deletion begins.
