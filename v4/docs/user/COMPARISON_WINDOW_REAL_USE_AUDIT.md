# Comparison Window Real-use Audit

Use this audit before opening any Split removal plan.

## Audit Window

- Run at least 1 full review session, preferably across 2 separate trading days.
- Keep old Split available during the audit.
- Record friction immediately after the workflow, not from memory.
- Do not remove Split unless every required row passes or is explicitly waived.

## Readiness Decision

Choose exactly one after the audit:

- `ready for removal plan`
- `keep Split`
- `needs more real-use data`

Default decision without a completed real-use session: `needs more real-use data`.

Current decision: `needs more real-use data`.

Latest update, 2026-06-22:

- Passed manual regression: same-instrument cross-timeframe drawing sync, `No Sync` hiding, Main/Comparison object selection, Comparison drawing creation auto-sync, and same-instrument Order/Live overlay display.
- Not yet enough for Split removal: NQ/ES SMT real-use flow, 1M + HTF replay progressive candles, Replay History restore in a real review, fixed layout preference, and advanced PDA frequency still need explicit audit evidence.

## Checklist

| Workflow | Required Action | Pass Signal | Fail Signal | Observed Result | Notes | Decision |
| --- | --- | --- | --- | --- | --- | --- |
| NQ/ES SMT | Use Main=NQ and Comparison=ES on the same timeframe; create or review SMT evidence; select and locate it from Inspector. | SMT renders on primary and comparison, selection opens Inspector, locate lands on expected time. | Need old Split to see SMT, selection misses comparison object, or locate only works on secondary. | Not manually audited in the latest regression. | Technical smoke remains required, but Split removal needs a real SMT review pass. | needs real-use data |
| 1M + HTF replay | Use primary 1M with comparison 1H or 4H while Replay On. | Comparison HTF candle progresses without showing future complete candle; cursor/hover sync is usable. | Future HTF data appears early, chart desyncs, or comparison becomes visually misleading. | Not manually audited in the latest regression. | Drawing sync now supports same-instrument cross-timeframe display; replay progressive candle behavior is a separate requirement. | needs real-use data |
| Comparison annotation | Create BSL/SSL, FVG/IFVG, OB Last Bar, Wick CE, and Segment in Comparison Window. | Objects keep comparison source metadata and later render/select/filter correctly. | Metadata wrong, wrong price-axis projection, or Inspector cannot review object. | Partial pass. | Same-instrument cross-timeframe BSL/PDA and Segment sync/no-sync behavior passed manual regression; full FVG/IFVG/OB/Wick CE review still needs explicit coverage. | needs real-use data |
| Active Order Setup evidence | Add comparison bar evidence and link comparison-created PDA/Segment/FVG where supported. | Active setup records evidence/ref with `sourceChartId=comparison-window`. | Evidence loses source context or still requires old Split for normal setup review. | Partial pass. | Main Order/Live overlays display in Comparison when instrument matches; active setup evidence linking still needs a focused real-use pass. | needs real-use data |
| Calendar/Inspector locate | Locate comparison-source objects from Calendar or Inspector. | Primary and comparison target behavior is predictable; status copy names target. | Locate silently falls back to primary or cannot reach comparison. | Not manually audited in the latest regression. | Keep as a Split-removal blocker until locate behavior is verified in a real review. | needs real-use data |
| Replay History restore | Save a replay state with Comparison Window enabled, reload, and restore from History. | Primary cursor/range and comparison instrument/timeframe/window state restore. | Comparison state is missing, stale, or loads wrong range. | Not manually audited in the latest regression. | Automated regression is required in Step 319.4; a real restore pass is still needed before removal. | needs real-use data |
| Fixed layout preference | During the same review, try the workflow without old Stack/Side Split. | Floating/sliding window is ergonomically acceptable for repeated comparison. | User still needs fixed Stack/Side layout for high-frequency work. | Not manually audited in the latest regression. | This is an ergonomic decision, not a code smoke; keep Split until the workflow is acceptable without fixed split. | needs real-use data |
| Advanced PDA frequency | Track every need for OB/Breaker range draft, Fib, EQH/EQL Point Sets in comparison context. | These are low-frequency or acceptable on primary/old Split. | Any becomes frequent enough to block Split removal. | Not manually audited in the latest regression. | If any deferred PDA tool is frequent, migrate it before Split removal. | needs real-use data |

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
