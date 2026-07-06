# V6 Session Dashboard Persistence Boundary

Date: 2026-07-06

## Purpose

The session dashboard needs durable session lists, but it must not become a
chart, replay, bar-data, or viewport owner.

This boundary exists because V5 mixed route/session actions with chart loading
too easily. V6 keeps the session-first flow explicit:

- list sessions as metadata;
- create or open a session to enter the chart workstation;
- let chart-entry runtimes handle chart/replay/bar initialization after the
  session command emits the relevant event.

## Ownership

Session dashboard UI owns:

- form DOM state;
- dashboard/list DOM rendering;
- dispatching session commands;
- showing or hiding the session/workstation shell.

Session runtime owns:

- replay session metadata records;
- active session id;
- `session.created` and `session.opened` events.

A future durable session metadata adapter may own:

- storing and reading session metadata records;
- storing and reading the active session id;
- migration of metadata-only records.

It must not store or restore:

- chart bars;
- bar-data cache windows;
- replay cursor/reveal state;
- viewport intent;
- chart adapter state;
- pane presentation state.

## Metadata-Only List Rule

`session.list` is a metadata-only operation.

Calling `session.list` may read session records, but must not:

- emit `session.created` or `session.opened`;
- dispatch chart-entry commands;
- request bar-data windows;
- write chart data;
- reset or mutate replay state;
- reset or mutate viewport intent.

The dashboard may call `session.list` on startup, refresh, and return to the
session surface. Those calls must remain cheap and must not preload full date
ranges into chart state.

## Entry Rules

Only these actions enter chart/replay ownership:

- `session.create`, which emits `session.created`;
- `session.open`, which emits `session.opened`.

After those events, chart-entry runtimes may plan context windows, bootstrap
replay, apply chart data, and set viewport intent through their existing owners.

## First Durable Slice

The first durable implementation should be a small metadata adapter injected
into the session repository/runtime boundary. It should persist only session
records and active session id.

Do not add durable bars or replay state in the same step.
