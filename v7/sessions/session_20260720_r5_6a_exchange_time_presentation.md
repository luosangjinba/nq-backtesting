# Session — R5.6a Exchange-Time Presentation

Date: 2026-07-20
Status: completed with automated evidence; included in the combined R5.6 human gate

## Audit Result

V6 keeps V4's timezone-naive New York fields encoded as UTC-like chart seconds
and formats their UTC fields directly. V7 intentionally normalizes that wire
encoding to real instants at the provider adapter so Raw Bar, cache, Session,
Replay, and Projection identities remain provider-neutral.

The rejected `06:30–13:14` RTH labels came from formatting those correct real
instants in the browser's Pacific timezone. The ownership-safe correction is
therefore chart-only `America/New_York` presentation, not another source-time
conversion and not a formatter masking corrupted source identity.

## Evidence

- Lightweight Charts adapter harness locks New York `09:30` in both DST and
  standard time and the ordinary RTH final source minute `16:14`;
- the existing V4 adapter harness continues to prove request/wire conversion;
- focused Projection, Replay, Session Hours, Workspace, and browser Harnesses;
- full V7 Harness suite and `git diff --check` before commit.

R5.6b next restores inherited aggregate candle completion display placement
without changing the exclusive source cursor or bucket provenance.
