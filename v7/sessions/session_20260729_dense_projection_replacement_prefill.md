# Session 2026-07-29 — Dense Projection Replacement Prefill

## Report

After dense history had loaded correctly, switching timeframe retained the
dense Viewport but initially painted only a short candle segment. Any later
mouse/wheel action triggered the existing fast, correctly sized history fill.

## Root Cause

Native input published the post-render logical range, but a programmatic
timeframe replacement did not. The replacement request still used a fixed
240-display-bar entry target even when the retained manual Viewport spanned
about 1,910 bars. The resulting series therefore had a large negative logical
start until another native event exposed the gap.

## Correction

- Compute the final replacement target before acquisition from Viewport
  `spanBars`, latest offset, the 24-bar left buffer, and eight-bar safety.
- Pass that target through the explicit replacement request instead of
  synthesizing or queueing a native history event after commit.
- Plan raw entry coverage conservatively against RTH for both ETH and RTH, so
  the session-independent raw request/cache identity remains shared.
- For a capped `1h`–`12h` replacement, acquire projected prefix and raw tail
  concurrently, retain their separate provenance/ownership, and merge them
  before the sole Chart writer performs one visible replacement.
- Apply the same pre-commit target to Session Hours replacement so a dense
  RTH→ETH change cannot recreate the missing-trigger defect.

## Evidence

- The pure planner maps a 1,910-bar span and 12-bar latest offset to a
  1,931-display-bar target.
- Real Chrome under RTH completes dense `4h→3m→4h`; each change adds exactly
  one Workspace revision, leaves `logicalFrom >= 24`, and does not increment
  `historyBoundaryCaptureCount`.
- Dense RTH→ETH satisfies the same one-transaction/no-native-trigger gate.
- Manual Next keeps the prior exact raw cache identity; the full non-browser
  suite, premarket multi-Pane RTH, checkpoint restore, Pane, and Layout gates
  pass.
- Five Canvas visual fixtures changed only at subpixel rendering level after
  deeper source context; they were visually inspected, regenerated through the
  repository update entry, and passed ordinary comparison on the next run.

## Human Acceptance

On `2026-07-29`, the user supplied the hard-reloaded dense-workspace screenshot
with the replacement context filling the complete visible wall and explicitly
requested the correction be committed. No follow-up pointer/wheel trigger was
required, so the interaction gate is accepted.
