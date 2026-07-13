# Session 2026-07-13 - Step 403 Go-to Schedule And Preferences

## Scope

Implement only the pure New York-time Go-to schedule domain and the independent
four-anchor preference owner selected by Step 402.

## Commits

- `3dda58e0 feat(v6): define replay navigation schedule domain`
- `be52092f feat(v6): persist replay navigation preferences`
- Step 403 ownership/regression/documentation closeout: this commit.

## Result

- Five replay-navigation action identifiers and four reference defaults exist.
- Candidate generation is strictly forward, Replay-end bounded, chronological,
  and DST-aware without fixed UTC offsets.
- Spring gaps and fall overlaps are explicit domain outcomes.
- Preferences validate, update, reset, persist with schema version 1, and safely
  fall back from invalid storage.
- Production shell actions remain disabled; Replay and chart owners are
  untouched.

## Next

Step 404 is a behavior-preserving extraction of shared cursor resolution and
pane materialization from Manual Next. Go-to orchestration must wait for that
boundary.
