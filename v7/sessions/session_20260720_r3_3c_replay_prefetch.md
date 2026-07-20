# V7 R3.3c Replay Prefetch — 2026-07-20

## Boundary Decision

Complete headless Replay with pure prefetch advice rather than allowing Replay
to become a second data requester. Explicit contiguous coverage triggers one
bounded high-watermark window; provider identity and execution stay downstream.

## Automated Gate

- Replay Prefetch Contract harness with 5 negative controls;
- low/high threshold, sufficient-coverage no-op, Session-end clamp, completed
  no-op, and invalid coverage rejection;
- Replay Runtime, Provider Execution, source-quality, architecture, and H011
  lifecycle gates;
- complete V7 harness suite and `git diff --check` before commit.

## Human Review

Not required: this step has no interaction or visual change.
