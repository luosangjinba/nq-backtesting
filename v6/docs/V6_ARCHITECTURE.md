# V6 Architecture

## Decision

V6 is an open-source-oriented backtesting/journal workstation for personal use,
designed specifically for SMC/ICT-style discretionary traders, especially prop
firm traders.

FXReplay remains an interaction reference for chart replay ergonomics, but V6
is not a generic FXReplay clone. Compatibility with non-SMC/ICT trading styles
is not a current product goal.

V6 reuses stable V4 data/API capabilities and selected V5 tests, but it does
not port V5's replay viewport internals.

## Core Problem To Avoid

V5 mixed too many meanings into chart range state:

- time-based visible range;
- Lightweight logical range;
- follow/manual mode;
- replay right-edge limit;
- viewport demand for older bars;
- display-window replacement;
- append fast path.

That made local fixes unreliable. V6 must model user/chart viewport intent as a
first-class runtime concept and make every other subsystem respect it.

V5 also carried old primary/non-primary assumptions too far into multi-pane
work. V6 may have a default pane id for bootstrap compatibility, but it must
not have a primary-owned runtime path or separate primary/non-primary state
mechanism.

V5 also exposed a visible K-line latency trap: runtime cursor updates can be
fast while the candle appears late. V6 must measure replay performance at the
browser-visible candle boundary from the start.

## Runtime Boundaries

### App Shell

Owns route bootstrap, lifecycle start/stop, and module registration.

Does not own replay cursor, bars, viewport intent, chart series, or chart-engine
objects.

### Command Bus And Event Bus

Commands mutate. Events notify.

Feature UI dispatches commands and subscribes to events. Feature UI must not
import runtime implementation modules.

### Replay Runtime

Owns:

- session id;
- session start/end;
- replay cursor;
- revealed count/range;
- Next/Play/Pause/Reset state.

Forbidden:

- chart-engine API calls;
- bar-data API calls outside bar runtime;
- viewport follow/manual decisions;
- chart range writes.

### Bar Data Runtime

Owns:

- V4 bars API usage;
- bounded request planning;
- cache keys;
- loaded windows;
- release policy.

Forbidden:

- chart series writes;
- replay cursor mutation;
- viewport mode decisions.

### Chart Viewport Runtime

Owns:

- viewport intent per pane through one pane model;
- default replay wall;
- manual temporary wall;
- conversion from replay cursor movement to viewport-intent updates;
- deciding whether a cursor update is follow-mode or manual-wall mode.

Forbidden:

- requesting bars;
- mutating replay cursor;
- writing chart series directly.

### Chart Data Runtime

Owns:

- pane-local chart bar set;
- append/replace application from replay/display data;
- no-future bar filtering before chart render input.

Forbidden:

- deciding follow/manual viewport mode;
- requesting bars;
- mutating replay cursor.

### Layout Runtime

Owns pane identity, active pane id, layout mode, and sync flags.

Rules:

- every pane, including the first/default pane, uses the same pane record
  shape;
- `primary` may be a default pane id string only;
- no runtime may branch into a special primary state owner;
- adding a second or third pane must not introduce a separate non-primary
  catch-up path.

Forbidden:

- `primaryState` / `secondaryState` style split stores;
- replay fan-out that updates primary first and relies on secondary event
  catch-up;
- active pane display timeframe leaking into inactive panes unless sync intent
  is explicit.

### Chart Engine Adapter

Owns:

- Lightweight Charts or future engine instance lifecycle;
- `setData` / `update` / visible logical range API calls;
- native pointer/wheel event translation into chart viewport events.

Forbidden:

- replay cursor decisions;
- bar-data requests;
- durable viewport state;
- feature UI decisions.

## Critical V6 Rule

Bar append/replace and display-window loading are data operations. They must
never reset, infer, or overwrite viewport intent. After any data operation, the
chart viewport runtime reapplies the current viewport intent to the adapter.

## First Milestone

The current foundation phase must prioritize chart infrastructure before
strategy-specific analytics or indicator work. The foundation includes:

- an FXReplay-like workstation screen, not a placeholder demo;
- market data loading;
- timeframe switching;
- drag/scroll chart display stability;
- date range handling;
- replay;
- multi-pane layout and pane-local chart state.

Earlier single-pane replay gates required:

- initial default wall;
- user-created temporary wall from native drag and wheel;
- floating replay transport with Play/Pause/Next/speed;
- Play/Next preserving whichever wall is active;
- bounded older-window loading that cannot erase the active wall;
- visible-candle latency gates for Next and Play;
- browser smoke tests that use real native chart interaction, not only command
  injection.

## Multi-Pane Rule

V6 should not implement user-facing multi-pane until the single-pane manual wall
and visible-latency gates pass. When multi-pane starts, it must start from the
same pane model used by single-pane. There is no "primary implementation first,
secondary catch-up later" track.

## Product Module Rule

Above the chart foundation, V6 has two primary product modules:

- Backtesting;
- Journal.

SMC/ICT-specific tools, prop-firm review workflows, statistics, and future
strategy helpers must attach through explicit module boundaries. New
capabilities should be plugin-friendly: a feature may register commands,
events, UI surfaces, persistence contracts, and chart overlays through clear
public interfaces, but it must not directly control another feature module.
