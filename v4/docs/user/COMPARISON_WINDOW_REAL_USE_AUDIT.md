# Comparison Window Real-use Audit

This document records the Comparison Window real-use audit that allowed staged Split removal.

## Audit Window

- Completed on 2026-06-22.
- Focused real-use audit passed.
- Staged Split removal is allowed, but remaining secondary internals should still be removed cautiously.

## Readiness Decision

Current decision: `ready for removal plan`.

Latest update, 2026-06-22:

- Passed manual regression: same-instrument cross-timeframe drawing sync, `No Sync` hiding, Main/Comparison object selection, Comparison drawing creation auto-sync, and same-instrument Order/Live overlay display.
- Not yet enough for Split removal: NQ/ES SMT real-use flow, 1M + HTF replay progressive candles, Replay History restore in a real review, fixed layout preference, and advanced PDA frequency still need explicit audit evidence.

Step 320 update, 2026-06-22:

- Technical regression passed for SMT selection/locate, Comparison HTF replay source/progressive path, and Replay History comparison state.
- Split removal is still not ready because fixed layout ergonomics and advanced PDA frequency require a real review session, and SMT/HTF replay still need user-visible workflow confirmation rather than smoke-only evidence.

Final audit update, 2026-06-22:

- User completed the focused real-use audit and confirmed it passed.
- Split removal planning is now allowed. Removal should still be staged and reversible.

## Checklist

| Workflow | Required Action | Pass Signal | Fail Signal | Observed Result | Notes | Decision |
| --- | --- | --- | --- | --- | --- | --- |
| NQ/ES SMT | Use Main=NQ and Comparison=ES on the same timeframe; create or review SMT evidence; select and locate it from Inspector. | SMT renders on primary and comparison, selection opens Inspector, locate lands on expected time. | Need old Split to see SMT, selection misses comparison object, or locate only works on secondary. | Passed. | Technical smoke passed and user confirmed focused real-use audit passed. | pass |
| 1M + HTF replay | Use primary 1M with comparison 1H or 4H while Replay On. | Comparison HTF candle progresses without showing future complete candle; cursor/hover sync is usable. | Future HTF data appears early, chart desyncs, or comparison becomes visually misleading. | Passed. | Technical smoke passed and user confirmed focused real-use audit passed. | pass |
| Comparison annotation | Create BSL/SSL, FVG/IFVG, OB Last Bar, Wick CE, and Segment in Comparison Window. | Objects keep comparison source metadata and later render/select/filter correctly. | Metadata wrong, wrong price-axis projection, or Inspector cannot review object. | Passed. | User confirmed focused real-use audit passed after drawing sync and comparison annotation fixes. | pass |
| Active Order Setup evidence | Add comparison bar evidence and link comparison-created PDA/Segment/FVG where supported. | Active setup records evidence/ref with `sourceChartId=comparison-window`. | Evidence loses source context or still requires old Split for normal setup review. | Passed. | Order/Live overlay sync was verified and focused audit passed. | pass |
| Calendar/Inspector locate | Locate comparison-source objects from Calendar or Inspector. | Primary and comparison target behavior is predictable; status copy names target. | Locate silently falls back to primary or cannot reach comparison. | Passed. | Focused audit passed; no locate blocker reported. | pass |
| Replay History restore | Save a replay state with Comparison Window enabled, reload, and restore from History. | Primary cursor/range and comparison instrument/timeframe/window state restore. | Comparison state is missing, stale, or loads wrong range. | Passed. | Technical smoke passed and user confirmed focused real-use audit passed. | pass |
| Fixed layout preference | During the same review, try the workflow without old Stack/Side Split. | Floating/sliding window is ergonomically acceptable for repeated comparison. | User still needs fixed Stack/Side layout for high-frequency work. | Passed. | User confirmed focused real-use audit passed; fixed Split is no longer a blocker for planning. | pass |
| Advanced PDA frequency | Track every need for OB/Breaker range draft, Fib, EQH/EQL Point Sets in comparison context. | These are low-frequency or acceptable on primary/old Split. | Any becomes frequent enough to block Split removal. | Passed or waived. | User confirmed focused real-use audit passed; no advanced PDA blocker reported. | pass |

## Session Log Template

```text
Date:
Market/session:
Primary:
Comparison:
Replay mode:
Old Split used? yes/no

Workflow notes:
- NQ/ES SMT:
- 1M + HTF replay:
- Comparison annotation:
- Active Order Setup evidence:
- Calendar/Inspector locate:
- Replay History restore:
- Fixed layout preference:
- Advanced PDA frequency:

Decision:
Blocking issues:
Follow-up steps:
```

## Pass/fail Rule

- Split removal plan is allowed only if all required workflows pass and any advanced PDA misses are either migrated or explicitly waived.
- If a workflow fails, create a focused migration/fix step instead of deleting Split.
- If fixed Stack/Side layout remains preferred, keep Split or build a fixed-layout Comparison Window mode before removal.
