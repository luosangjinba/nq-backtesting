# Session 2026-07-04 - Step 523 Multi-Pane Latency Audit

## Goal

Audit the difference between headless multi-pane latest-intent latency metrics
and manual user perception before doing more runtime optimization.

## Product Context

- Manual testing reports both single-pane and multi-pane rapid `Next` now feel
  comparable to FXReplay.
- Step 522 still measured two-pane all-cursor observer latency around 228ms when
  attempting a 120ms gate.
- A strict all-pane headless measurement may overstate user-visible delay if one
  pane trails metadata updates after the primary pane is already visually
  responsive.

## Product Standard

- Product feel matters, but automated gates still need defensible protection
  against regressions.
- Observer-based cursor metadata remains the correct browser gate for latest
  replay intent.
- Polling and `requestAnimationFrame` remain diagnostics.
- Replay runtime owns cursor/reveal state, chart runtime owns chart metadata and
  series writes, bar-data runtime owns data loading, and UI remains command-only.

## Detailed Plan

1. Step 523.1 - Plan and boundary setup.
   - Record that this is an audit, not a forced optimization.
   - Keep existing 300ms multi-pane regression guard.
   - Commit docs before test changes.

2. Step 523.2 - Add multi-pane latest-intent audit smoke.
   - Create a dedicated browser smoke that opens a two-pane same-timeframe
     layout and rapidly clicks `Next`.
   - Measure per-pane observer latency, all-pane observer latency, polling
     elapsed, rAF elapsed, final cursor, reveal count, bar deltas, and forward
     fetch count.
   - Do not fail on the 100/120ms product target in this audit; fail only on
     correctness invariants and broad sanity ceilings.
   - Commit the audit harness.

3. Step 523.3 - Run audit and record findings.
   - Run the audit sequentially.
   - Document whether primary and secondary pane timings diverge, whether
     all-pane timing is dominated by one pane, and whether the 300ms guard is
     still appropriate.
   - Commit findings.

4. Step 523.4 - Regression and closeout.
   - Run:
     `node v5/tests/multi-pane-latest-intent-audit-browser-smoke.js`
     `node v5/tests/multi-pane-rapid-next-performance-browser-smoke.js`
     `node v5/tests/replay-latest-intent-trace-browser-smoke.js`
     `node v5/tests/replay-latest-intent-browser-smoke.js`
     `git diff --check`
   - Update TODO/session handoff with the next recommended step.
   - Commit closeout docs.

## Non-Goals

- Do not change replay/chart/bar-data runtime behavior in this audit step.
- Do not lower the multi-pane regression guard below current measured behavior.
- Do not treat rAF timing as product latency without separate evidence.
- Do not add UI-owned replay/chart state.

## Status

- Step 523.1: completed. Planned the multi-pane latest-intent audit and set the
  no-runtime-optimization boundary.
- Step 523.2: completed. Added
  `multi-pane-latest-intent-audit-browser-smoke.js` to measure per-pane,
  all-pane, polling, and rAF latest-intent timings.
- Step 523.3: completed. Documented audit findings and decision: keep the
  300ms guard, do not force runtime optimization based on headless timing alone.
- Step 523.4: completed. Ran regression coverage and closed TODO/session
  handoff.

## Baseline From Step 522

- Single-pane observer latest-intent trace: about 13ms.
- Multi-pane all-pane observer guard: 300ms.
- First attempted 120ms multi-pane guard measured around 228ms.
- Manual user feedback: single-pane and multi-pane both feel comparable to
  FXReplay.

Interpretation: the next useful work is measurement validity and pane timing
decomposition, not immediate optimization.

## Audit Harness

- `node --check v5/tests/multi-pane-latest-intent-audit-browser-smoke.js`
  passed.
- Sandboxed audit smoke execution failed twice at local HTTP port binding with
  `listen EPERM: operation not permitted 127.0.0.1`; rerunning the same command
  with local test escalation passed.
- `node v5/tests/multi-pane-latest-intent-audit-browser-smoke.js` passed with:
  - primary pane observer latency: about 197ms.
  - secondary pane observer latency: about 232ms.
  - all-pane observer latency: about 232ms.
  - polling visible latency: about 236ms.
  - rAF latency: about 406ms.

Interpretation: the all-pane number is not a pure measurement artifact. It is
dominated by the secondary pane, while the primary pane is faster but still far
above the single-pane latest-intent gate.

## Findings

- The manual UX signal and headless audit are not contradictory:
  - manual testing says multi-pane feels comparable to FXReplay;
  - headless observer timing says multi-pane all-pane metadata catches up around
    232ms in the sampled run.
- The strict all-pane metric waits for both pane metadata updates. That is more
  conservative than user perception, especially when the primary pane responds
  first and the secondary pane trails.
- The existing 300ms multi-pane guard is appropriate as a regression guard
  because it protects current behavior without forcing optimization work that
  the user cannot perceive.
- A future optimization is optional rather than required. If opened, it should
  audit pane update ordering and secondary pane projection cost before changing
  runtime behavior.

Decision: do not continue multi-pane latency as a must-fix performance track
unless manual testing or future gates show a perceptible regression.

## Final Verification

- `node v5/tests/multi-pane-latest-intent-audit-browser-smoke.js` passed.
- `node v5/tests/multi-pane-rapid-next-performance-browser-smoke.js` passed.
- `node v5/tests/replay-latest-intent-trace-browser-smoke.js` passed.
- `node v5/tests/replay-latest-intent-browser-smoke.js` passed.
- `git diff --check` passed.
- Final audit sample:
  - primary pane observer latency: about 184ms.
  - secondary pane observer latency: about 206ms.
  - all-pane observer latency: about 206ms.
  - polling visible latency: about 212ms.
  - rAF latency: about 354ms.

## Next

Move to the next replay workstation usability or product gap. Multi-pane latest
intent now has a regression guard and audit data; further runtime optimization
should be optional, targeted, and driven by either user-visible regression or a
specific product requirement.
