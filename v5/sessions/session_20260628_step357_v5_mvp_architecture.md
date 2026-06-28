# Step 357 - V5 MVP Architecture

## Goal

Open V5 as a parallel frontend/runtime and freeze the MVP architecture before
writing implementation code.

## Decisions

- V5 lives beside V4 in this repository.
- V5 starts with a setup page and chart replay page, matching the FX Replay
  session-first flow.
- V5 keeps multi-user ownership in the model from day one, initially using a
  default user if needed.
- V5 reuses stable backend/data capabilities from V4 but does not inherit V4's
  frontend state/control model.

## Non-Negotiable Boundaries

- UI dispatches commands and subscribes to events.
- Only chart runtime writes chart series.
- Only bar data runtime requests and caches bars.
- Only replay runtime owns replay session cursor and reveal state.
- Feature modules cannot directly control each other.
- Date range selection cannot imply full chart data loading.

## Files Added

- `v5/README.md`
- `v5/TODO.md`
- `v5/docs/MVP_ARCHITECTURE.md`
- `v5/sessions/session_20260628_step357_v5_mvp_architecture.md`

## Next Step

Step 358 should create the V5 app shell skeleton only:

- static entry;
- source directory;
- command bus;
- event bus;
- module registry;
- setup/chart routes;
- boundary tests.

Do not implement chart, bars, or replay behavior in Step 358.

