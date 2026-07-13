# V6 Replay-Based Trading-System Validation Product Decision

## Status And Precedence

This is a normative V6 product decision. It constrains product planning,
architecture, data modeling, and feature acceptance after the chart foundation.

`V6_PRODUCT_RESEARCH.md` is research input only. When it conflicts with this
decision, this decision wins. Existing runtime ownership rules in
`V6_ARCHITECTURE.md` remain mandatory.

## Positioning Decision

V6 is an open-source, local-first SMC/ICT trading-system validation and replay-
practice workstation for discretionary traders, especially prop-firm traders.

The product north star is evidence-based validation of a trader's playbook. The
primary interaction environment remains high-quality historical replay. Replay
is not a secondary compatibility feature and must not be abandoned or degraded
in pursuit of analytics.

The product loop is:

`blind historical replay -> pre-result judgment and plan -> semantic chart evidence -> simulated outcome -> auditable statistics -> playbook revision`

V6 should describe its output as historical evidence about an edge, not proof
that an edge exists or will persist.

## One Product, Two Workflows

V6 must not create separate replay and validation chart products. One replay
session model and the same runtime owners support two workflows.

### Free Practice

- fast session creation and V5-quality replay ergonomics;
- Play, Pause, Next, Previous, configured day/session Go-to navigation,
  timeframe and multi-pane work;
- optional drawings, simulated orders, notes, and post-session review;
- low ceremony and no mandatory experiment taxonomy.

### Validation Campaign

- select a versioned playbook and write a falsifiable hypothesis;
- use blind/randomized historical samples where practical;
- commit observations and trade plans before revealing their outcomes;
- record inclusion/exclusion reasons and rule adherence;
- aggregate outcomes and drill every statistic back to its chart evidence.

The workflow may change required fields and guardrails. It must not fork replay,
chart, bar-data, viewport, or chart-engine ownership.

## Differentiation Decision

Replay, journaling, tags, statistics, and ICT indicators already exist in
commercial products. V6 must not claim that this general combination is an
empty market or a moat.

V6 differentiates through the combination of:

- local ownership and privacy of market, playbook, evidence, and outcome data;
- open-source, plugin-friendly SMC/ICT taxonomy and workflow extension;
- chart-native semantic artifacts linked to the exact replay-visible state;
- versioned hypotheses and playbook rules;
- prospective versus retrospective evidence provenance;
- reproducible samples and drilldown from aggregate results to original chart
  context.

A built-in FVG detector or a named tag is not, by itself, differentiation.

This correction is grounded in current official product material: FXReplay now
advertises integrated auto-logged journaling, tags, filtering, and analytics;
TradeZella advertises replay, automatic backtest journaling, strategy tracking,
analytics, and ICT/FVG capability; TradesViz advertises replay linked to journal
analytics. Lightweight Charts documents primitives and drawing examples, not a
complete semantic drawing product.

- https://fxreplay.com/trading-journal
- https://www.tradezella.com/backtesting
- https://www.tradesviz.com/trade-replay/
- https://tradingview.github.io/lightweight-charts/docs/plugins/series-primitives
- https://tradingview.github.io/lightweight-charts/plugin-examples/

## Evidence And Statistical Integrity

Automatic aggregation is not automatic edge validation. A validation feature
must protect against hindsight and taxonomy drift.

Required invariants:

- store the replay cursor and no-future boundary at evidence creation time;
- distinguish prospective evidence from retrospective review annotations;
- bind each trial to an immutable playbook/rule version;
- retain sample inclusion, exclusion, and invalidation reasons;
- retain planned entry, stop, target, and actual simulated execution separately;
- report sample size and distributions, not win rate alone;
- keep raw trials available beneath every aggregate;
- do not silently recompute historical labels under a newer taxonomy version.

## Artifact Boundaries

Do not collapse the product domain into one `annotation` or journal record.
Keep at least these conceptual artifacts distinct:

- `playbook` and immutable `playbookVersion`;
- `validationCampaign` and hypothesis;
- `trial` / replay sample;
- `observation` for semantic chart judgments such as FVG, OB, sweep, bias, or
  displacement;
- `tradePlan` for direction, entry, stop, target, and invalidation;
- `execution` / simulated order facts;
- `outcome` for R, P&L, MAE/MFE, and exit reason;
- `evidence` linking drawings, timestamps, panes, timeframes, screenshots, and
  notes to the replay-visible state.

Exact schemas may evolve, but owners must remain separate enough that rendering,
semantics, execution, and analytics do not mutate each other directly.

## Architecture Constraints

- Replay runtime continues to own cursor, reveal state, and no-future state.
- Bar-data runtime remains the only market-bar requester/cache owner.
- Chart runtime/adapter remains the only chart-series and engine writer.
- Drawing/annotation owners store semantic time-price artifacts and request
  rendering through explicit chart-overlay interfaces; they do not own the
  chart engine.
- Orders own simulated execution facts; journal/evidence owners do not mutate
  orders directly.
- Analytics consumes immutable/read-only projections of trials, evidence,
  plans, executions, and outcomes; it does not own their source records.
- A workflow coordinator may orchestrate commands/events, but feature modules
  must not directly control one another.
- V5 replay interaction lessons and tests may be reused; V5 runtime ownership
  models must not be ported.

Lightweight Charts primitives are a rendering mechanism, not a ready-made
drawing domain. Hit testing, selection, dragging, coordinate conversion,
persistence, multi-pane projection, and undo/redo must live behind V6-owned
interfaces.

## Data And Persistence Decision

The current `1m` market dataset remains the default foundation and is sufficient
for the first validation vertical slice. V6 must disclose that `1m` data cannot
determine within-minute stop/target order or model tick-level execution.

Do not build a full second/tick pipeline now, and do not permanently forbid finer
data. Preserve a provider boundary so a future implementation can load optional
fine-grained windows without replacing replay or bar-data ownership.

User behavior and validation artifacts must not be mixed into the market-data
tables. Their durable store must support transactions, indexes, migrations, and
queries. JSON is an import/export and sharing format, not the required primary
database.

## Delivery Sequence And Gate

Finish the selected chart-foundation work before starting semantic validation
features. Configured day/session Go-to navigation is foundation work because
both practice and validation need deterministic replay progression. Arbitrary
chart-date inspection, if added later, is a separate chart navigation feature
and must not reuse the replay-semantic `Go to` surface.

The first post-foundation product slice must be one thin end-to-end loop:

1. create a validation campaign and playbook version;
2. start a blind replay trial;
3. record one generic setup observation and one trade plan;
4. reveal/execute the outcome without future leakage;
5. calculate R and one small summary;
6. click the result to return to the original chart evidence.

Do not begin with a full ICT ontology, automatic FVG/OB recognition, AI analysis,
or a large dashboard. Expand semantics only after the thin slice is used on at
least 30-50 real trials and demonstrates lower recording friction plus trustworthy
drilldown.

## Protected Non-Goals

- generic support for unrelated trading styles;
- tick-accurate execution claims on `1m` data;
- copying FXReplay/TradeZella feature breadth;
- proving future profitability;
- automatic concept recognition before the manual evidence loop is validated;
- a detached analytics dashboard with no path back to raw chart evidence;
- a second chart/replay runtime for validation mode.
