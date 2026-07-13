# AGENTS.md

This repository contains V4/V5 legacy work and the new V6 backtesting/journal
workstation.

## Before Working On V6

Read these files first:

1. `v6/docs/INDEX.md`
2. `v6/docs/V6_PRODUCT_DIRECTION.md`
3. `v6/docs/V6_REPLAY_VALIDATION_PRODUCT_DECISION.md`
4. `v6/docs/V6_ARCHITECTURE.md`
5. `v6/docs/V6_EXECUTION_ROADMAP.md`
6. `v6/TODO.md`

Then read only the docs/specs relevant to the current step.

## Current Direction

V6 is an open-source, local-first SMC/ICT trading-system validation and replay-
practice workstation for discretionary traders, especially prop-firm traders.
Validation is the product outcome; high-quality historical replay remains the
primary experiment and practice environment and must not be abandoned or
degraded. Compatibility with other trading styles is not a current product goal.

The current foundation phase prioritizes chart infrastructure: loading market
data, switching timeframes, dragging/scrolling the chart, multi-pane layout,
date range handling, and replay. Indicators and main/sub-pane indicator
surfaces remain undecided until the chart foundation is stable.

Above the foundation, the two primary product modules are Backtesting and
Journal. They support Free Practice and Validation Campaign workflows through
shared runtime owners; they must not create separate replay/chart products.
Semantic evidence must preserve replay-visible provenance and drill down from
statistics to raw chart context. New capabilities should be modular and plugin-
friendly so the project can later support open-source/community extension
without turning the core into a tightly coupled monolith.

V4/V5 remain available as legacy/reference, but V6 must not copy old frontend
ownership models.

## V5 Hard Rules

- UI dispatches commands and subscribes to events.
- Only chart runtime writes chart series.
- Only bar data runtime requests and caches bars.
- Only replay runtime owns replay cursor and reveal state.
- Feature modules must not directly control each other.
- Creating a replay session must not load a full date range into chart state.

## V5 Modularity Rules

- Modular code structure is a default V5 engineering requirement, not an
  optional cleanup task after features are working.
- Before writing non-trivial logic, first identify the owning boundary and
  public interface: route UI, feature UI controller, runtime, contract, domain
  helper, adapter, persistence, or test harness.
- New behavior should land in its owning module through an explicit API. Do not
  use route, runtime, or adapter entry files as the default place to stack new
  functionality.
- Keep route and runtime entry files focused on orchestration, command/event
  wiring, and lifecycle ownership. Move templates, draft UI controllers,
  pure state helpers, adapter internals, and domain calculations into focused
  modules before they become intertwined.
- Do not add new functionality to an already-large file just because it is
  convenient. If the new behavior has a clear sub-domain, create or extend a
  small module with an explicit API.
- If a file carries more than one long-lived responsibility, or is trending
  toward a large mixed-purpose file, split the boundary before adding more
  feature code.
- "Conservative" means preserve behavior, ownership, and testability; it does
  not mean avoiding necessary structural splits. Medium-sized boundary splits
  are acceptable when they make future feature work cleaner.
- Prefer each step to establish or reinforce the right module/interface first,
  then implement the feature through that boundary.
- Avoid over-fragmenting tiny one-off code, but split early when a concern is
  expected to grow. The goal is clean future extension, not arbitrary file count
  reduction.
- New modules must preserve V5 ownership rules: helpers may compute, UI modules
  may own DOM-only behavior, and only the owning runtime/adapter may mutate its
  stateful surface.

## Development Workflow

- Inspect existing code before editing.
- Before planning or implementing chart/workstation features, check
  Lightweight Charts documentation and the awesome-tradingview ecosystem
  references for existing capabilities, plugins, examples, or proven patterns.
  Test a suitable existing approach first when it fits V5 ownership rules; only
  build custom code when the existing option is inadequate or conflicts with V5
  architecture.
- Keep each step bounded.
- Add harnesses for new critical invariants.
- Run relevant smoke tests and `git diff --check` before commit.
- Update `v5/TODO.md` and `v5/sessions/` when a step closes.

## Context Hygiene

Do not load all historical sessions by default. Historical sessions are for
targeted lookup, not general startup context.
