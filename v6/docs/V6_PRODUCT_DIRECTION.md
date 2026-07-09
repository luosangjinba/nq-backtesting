# V6 Product Direction

## Positioning

V6 is an open-source-oriented backtesting/journal system for personal use,
designed specifically for SMC/ICT-style discretionary traders.

The primary user is a subjective SMC/ICT trader, especially a prop firm trader
who needs replay practice, review discipline, journaling, and trade/process
feedback. Compatibility with unrelated trading styles is not a current product
goal.

FXReplay remains a useful interaction reference for chart replay ergonomics,
but V6 is not a generic FXReplay clone.

## Current Foundation Phase

The current phase is foundation work. The priority is to make chart basics
reliable before strategy-specific features grow on top.

Foundation scope:

- load chart data from the database/API boundary;
- switch supported timeframes;
- drag and scroll charts without sticky or jumpy behavior;
- extend history leftward until no data remains;
- handle date ranges clearly;
- run replay with visible K-line latency gates;
- support multi-pane chart layouts and pane-local state;
- keep reset view/KXG behavior pane-local.

Deferred or undecided:

- indicators;
- main/sub-pane indicator layout;
- custom indicators;
- Pine Script compatibility;
- order execution or pseudo-live trading beyond future backtesting needs.

## Primary Product Modules

Above the chart foundation, V6 has two primary modules:

- Backtesting;
- Journal.

Backtesting should support replay practice and review for SMC/ICT setups.
Journal should support structured review, trade reasoning, discipline tracking,
and later prop-firm oriented performance/process feedback.

## SMC/ICT Product Bias

When tradeoffs appear, prefer the SMC/ICT trader workflow over generic
technical-analysis compatibility.

Examples of future product fit:

- session-based context;
- liquidity, sweep, displacement, FVG, order block, and market structure
  review concepts;
- screenshot/replay evidence linked to journal entries;
- rule/process checklists for prop firm discipline;
- backtesting statistics that help subjective trade review instead of only
  automated-strategy metrics.

These are product direction notes, not permission to implement those features
before the foundation is stable.

## Modularity And Plugin Direction

All new capabilities should be modular and plugin-friendly. The long-term goal
is a system that can support open-source/community extension like building with
small blocks.

Rules:

- each feature needs an owner boundary and explicit public interface;
- feature modules may communicate through commands/events/contracts;
- feature modules must not directly mutate each other;
- chart overlays, journal extensions, analytics, and future SMC/ICT tools
  should be addable without rewriting the core chart/replay/journal owners;
- core runtime entry files should stay orchestration-focused.

The near-term implementation can remain simple, but new work should not create
large hard-coded feature branches that would block a future plugin ecosystem.
