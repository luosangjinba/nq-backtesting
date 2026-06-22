# V4 Documentation

This directory is the documentation entry point for the current V4 backtesting workspace.

## Current Operating Mode

V4 is currently in a stability trial phase. The core workflow is functionally complete enough for several real trading days of use, so the next priority is to run real data, record friction, and fix only high-impact issues.

Recommended data ownership during this phase:

- DuckDB remains the market-data and economic-calendar store.
- Browser localStorage remains the working draft store for manually entered review objects.
- Review JSON remains the formal backup/archive format for PDA, Segment, SMT, Order Setup, Live Record, Chart Note, Daily Time Review, and Daily Regime data.
- Manually entered review data should not be migrated into DuckDB as the primary write store yet.

DuckDB should become an analytics import target first, after the review schema has stabilized and there is enough real Review JSON history to analyze.

Tradovate Live Record import currently uses Performance/Orders/Fills as the primary import sources. Position History, Cash History, and Account Balance History are optional reconciliation files only; warnings are reported in the maintenance output and do not block Review JSON generation.

Comparison Window is now the preferred replacement candidate for the main NQ/ES and cross-timeframe comparison workflow. It supports sliding/floating comparison, comparison-source PDA/Segment/FVG creation, SMT, progressive HTF replay, and workspace restore. Old Split Screen remains available because several advanced secondary workflows are still Split-only.

## Current V4 Docs

### User

- [Chinese user guide](user/USER_GUIDE.zh-CN.md)
- [Chinese operation manual HTML](user/OPERATION_MANUAL.zh-CN.html)
- [English user guide](user/USER_GUIDE.en.md)
- [Standalone run guide](user/STANDALONE_RUN.md)
- [Local environment variables](user/LOCAL_ENVIRONMENT.zh-CN.md)
- [Inspector help](user/INSPECTOR_HELP.md)
- [Databento daily refresh](user/DATABENTO_DAILY_REFRESH.md)
- [Comparison Window real-use audit](user/COMPARISON_WINDOW_REAL_USE_AUDIT.md)

### Design

- [Order Review / Order Setup design](design/ORDER_REVIEW_DESIGN.md)
- [Market Segment system design](design/MARKET_SEGMENT_SYSTEM_DESIGN.md)
- [Segment Review Notes design](design/SEGMENT_REVIEW_NOTES_DESIGN.md)
- [Secondary Segment design](design/SECONDARY_SEGMENT_DESIGN.md)
- [Secondary FVG design](design/SECONDARY_FVG_DESIGN.md)

### Reference

- [Lightweight Charts v5 features](reference/LWC_V5_FEATURES.md)

### Planning And Reviews

- [Code review 2026-06-02](planning/CODE_REVIEW_2026_06_02.md)
- [P1 plan](planning/P1_PLAN.md)
- [Improvement plan](planning/improvement_plan.html)
- [Standalone V4 plan](planning/STANDALONE_V4_PLAN.md)
- [Yfinance data research for V4 Journal](planning/YFINANCE_DATA_RESEARCH.md)
- [Databento data research](planning/DATABENTO_DATA_RESEARCH.md)
- [Databento insert-only updater plan](planning/DATABENTO_INSERT_ONLY_UPDATER_PLAN.md)
- [Data freshness refresh workflow](user/DATA_FRESHNESS_REFRESH.md)
- [Archived V4 architecture review 2026-06-16](user/v4-architecture-review.md) - high-priority items handled in Step 292
- [Archived V4 performance review 2026-06-16](user/v4-performance-review.md) - baseline handled in Step 293
- [Archived V4 fix review 2026-06-16](user/v4-fix-review.md) - Origin guard handled in Step 294

## Historical Docs

Historical V2/V3/root architecture source directories were removed from this v4-only branch. The legacy index under [legacy/README.md](legacy/README.md) records what was removed and where to recover it from git history.

## Session Logs

V4 session logs remain in [`../sessions`](../sessions). They are chronological work history rather than stable product documentation.
