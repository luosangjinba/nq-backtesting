# Session 2026-07-04 - Step 528 FXReplay Parity Gap Audit

## Goal

Audit the remaining FXReplay parity gaps after the recent replay workstation
latency, keyboard, speed, and transport persistence work.

## Product Context

- Steps 524-527 closed the most recent replay transport usability chain:
  cadence latency, keyboard replay controls, playback speed ergonomics, and
  transport preference persistence.
- Manual testing reported single-pane and multi-pane replay feel comparable to
  FXReplay.
- The next useful work is not more latency optimization by default. It is a
  structured parity audit that identifies the next high-value workstation gap.

## Reference Check

- Lightweight Charts plugin documentation checked on 2026-07-04:
  `https://tradingview.github.io/lightweight-charts/docs/plugins/intro`.
  Official plugin extension points cover custom series and primitives for
  visualizations, drawing tools, annotations, indicators, watermarks, and
  similar chart-rendered elements.
- awesome-tradingview checked on 2026-07-04:
  `https://github.com/tradingview/awesome-tradingview`.
  Relevant Lightweight Charts references include official examples, indicators,
  a visible price range utility plugin, and wrappers.
- Step 528 is a planning/audit step. No current audit category requires a new
  chart plugin before the gap ranking is complete.

## Product Standard

- Audit gaps by workflow, not by implementation convenience.
- Separate already-covered parity from open gaps.
- Rank gaps by user-visible replay workstation value, implementation risk,
  architectural ownership clarity, and available smoke coverage.
- Do not use V4 frontend ownership as the implementation model.
- Any future feature chosen from this audit must still flow through V5
  contracts/controllers/runtimes according to existing ownership rules.

## Detailed Plan

1. Step 528.1 - Plan and reference setup.
   - Record scope, reference check, and audit categories.
   - Commit docs before adding the audit matrix.

2. Step 528.2 - Create parity audit matrix.
   - Add a maintained spec under `v5/docs/specs/`.
   - Inventory covered and open gaps across replay transport, chart
     interaction, multi-pane, settings/layout, persistence, data/session setup,
     and observability/tests.
   - Mark owner boundary and existing coverage for each row.
   - Commit the audit matrix.

3. Step 528.3 - Rank the next gaps.
   - Add a ranked near-term backlog with recommended Step 529 candidates.
   - Update TODO/session handoff with the recommended next item.
   - Commit the ranking.

4. Step 528.4 - Verification and closeout.
   - Run documentation/static checks:
     `rg "fxreplay-parity-gap-audit" v5/docs v5/TODO.md v5/sessions/README.md`
     `git diff --check`
   - Close Step 528 in TODO/session handoff.
   - Commit closeout docs.

## Non-Goals

- Do not implement the next parity feature in Step 528.
- Do not add runtime behavior based only on assumptions about FXReplay.
- Do not add a chart plugin dependency during the audit.
- Do not move completed performance work back into the active optimization
  track unless the audit finds a user-visible regression.

## Status

- Step 528.1: completed. Planned the FXReplay parity gap audit and recorded
  chart ecosystem reference checks.
- Step 528.2: completed. Added `fxreplay-parity-gap-audit.md` with a current
  coverage/open-gap matrix and V5 boundary rules for future parity work.
- Step 528.3: completed. Ranked the remaining near-term parity gaps and
  recommended a Settings parity checklist as the Step 529 starting point.
- Step 528.4: completed. Ran documentation verification and closed
  TODO/session handoff.

## Audit Result

- Recent replay transport parity work is covered enough to stop active
  latency/transport optimization.
- Remaining gaps are mostly workflow/product gaps rather than replay runtime
  performance gaps.
- The highest-value near-term candidate is Settings parity because settings are
  directly visible, already modularized, and likely to produce a small bounded
  Step 529.
- Multi-pane physical interaction audit remains the fallback if manual testing
  exposes pane-specific wheel/drag regressions.

## Final Verification

- `rg "fxreplay-parity-gap-audit" v5/docs v5/TODO.md v5/sessions/README.md`
  passed.
- `git diff --check` passed.

## Next

Step 529 should start with a Settings parity checklist and choose at most one
bounded high-frequency settings gap to implement if the owner boundary is
already clear.
