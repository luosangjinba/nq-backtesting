# V5

V5 is the clean frontend/runtime rewrite for the FX Replay direction.

It is not a full repository rewrite. V5 starts beside V4 so stable backend data
services, import/maintenance workflows, and proven test fixtures can be reused
without carrying forward V4's frontend control-flow debt.

## Purpose

- Build a session-first FX Replay experience:
  - create a replay session from a setup page;
  - enter a chart page whose latest visible replay bar is the session start;
  - load only visible prefix context plus the start bar;
  - reveal future bars only through Next/Play.
- Make multi-user ownership a first-class model from day one, while the first
  MVP may run with a single default user.
- Keep the main framework stable and keep features modular.

## Architecture Rule

Features do not own core runtime state.

- Only chart runtime writes chart series.
- Only bar data runtime requests and caches bars.
- Only replay runtime owns replay session state and cursor progression.
- UI modules dispatch commands and subscribe to events.
- Feature modules must not directly control each other.

See [MVP_ARCHITECTURE.md](docs/MVP_ARCHITECTURE.md) for the full boundary
rules and the Step 357 implementation plan.

