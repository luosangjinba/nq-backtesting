# Product Review Loop

Phase: cross-phase product north star.

Purpose: V5 exists to help a trader turn market replay and real execution
history into repeatable trading skill. It is not just a chart viewer, order
ticket, journal, or FXReplay clone.

## Core Principle

Historical Replay Review and Live Execution Review are V5's core work. They are
not optional later features.

Chart rendering, replay controls, order models, journal entries, annotations,
screenshots, tags, statistics, import/export, workspace backup/restore, and
local deployment packaging are infrastructure around these two workflows.

Review is not the final product outcome. The heavy work after review is turning
review artifacts into statistics, analysis, and better decisions. V5 should help
the trader identify repeated behavior patterns, compare process quality against
outcomes, decide what to practice next, and optionally use AI assistance once
the underlying evidence and structured data are reliable enough to support it.
This implies a review-grounded analytics dashboard and data visualization layer:
charts, tables, distributions, timelines, and drilldowns should demonstrate what
the review data says and help the trader choose the next action.

The two workflows are not isolated chart products. They can coexist on the same
chart surface: a user may run no-future historical replay logic while also
overlaying actual orders, fills, notes, corrections, and process-quality tags
from real execution history. Historical Replay Review and Live Execution Review
are different review lenses over shared chart context, canonical time, and
review artifacts.

V4 already grew many of these ideas through replay review, order reviews, live
records, daily time reviews, PDA annotations, segments, chart notes, and review
archives. V5 should inherit the product lesson, not the V4 frontend ownership
model or late-stage coupling cost.

## Core Review Workflows

### Historical Replay Review

Historical Replay Review trains pattern recognition, patience, and decision
quality in a no-future-information environment.

Core idea:

- the user sees only chart context available before the current replay cursor;
- future bars are revealed only through replay progression;
- the user practices waiting for confirmation, entering, managing risk, and
  observing outcomes as if the session were live;
- repeated topical replay creates a library of market pattern examples.

This workflow answers:

- What does the setup really look like before it works?
- What does the same setup look like before it fails?
- Where do I tend to enter too early?
- What confirmation should I wait for?
- What does valid context look like without knowing the future?

Dedicated model direction:

- replay session;
- replay decision;
- simulated order;
- setup sample;
- pattern/evidence tags;
- replay correction notes;
- topical training set.

### Live Execution Review

Live Execution Review reviews past real-time execution. The word "live" refers
to real decisions made under live/near-live conditions, not necessarily trades
from the current day.

Core idea:

- review what the trader could see and know at the time of execution;
- separate process quality from PnL outcome;
- mark compliant losing trades differently from non-compliant winning trades;
- identify behavior patterns such as early entry, stop too tight, moving stops,
  revenge trading, hesitation, or loss-induced follow-up errors;
- turn real execution history into a focused training plan.

This workflow answers:

- Did I follow my system?
- Did I enter before confirmation?
- Was my stop based on structure or fear?
- Did a prior loss affect the next decision?
- Did a profitable mistake reinforce a bad habit?

Dedicated model direction:

- execution session;
- live record;
- actual order/fill;
- execution note;
- process-quality tag;
- mistake tag;
- emotion/discipline state;
- later correction.

## Shared Foundation

Both workflows should share foundation objects instead of each workflow
inventing its own parallel version.

Shared foundation:

- chart context and viewport;
- canonical time;
- instrument/timeframe/session identity;
- user/workspace ownership;
- evidence, screenshot, and annotation references;
- object refs and roles;
- tags and classification catalog;
- calendar/session grouping;
- import/export/sync model;
- searchable review library.
- analytics views and visualization-ready aggregates.

Statistics, analysis, decision support, and future AI assistance should consume
the same shared foundation. They should not rely on unstructured journal text or
screen state when canonical artifacts, tags, orders, notes, and evidence refs
can provide stronger inputs.
Visualization data should be computed from stable review records and expose
drilldown refs back to the underlying chart moments, orders, notes, tags, and
evidence. A dashboard is useful when it makes the review loop easier to inspect
and decide from; it is not useful when it becomes a detached KPI wall.

The shared chart surface should support multiple artifact sources at once:
replay decisions, simulated orders, actual orders/fills, execution notes,
annotations, evidence, and later corrections can all point to the same canonical
chart time and instrument context. Workflow-specific rules may filter or style
these artifacts, but they should not require separate chart ownership paths.

The shared foundation must be designed early because retrofitting it later is
exactly the kind of cost V4 exposed.

## Product Rules

- Replay must preserve the no-future-information constraint.
- A replay session should not expose the full session range in chart state at
  creation time.
- Order and journal workflows must serve Live Execution Review, not generic
  bookkeeping.
- PnL is important, but it must not be the only review axis.
- The product must represent process correctness independently from trade
  outcome.
- A winning trade can be marked as a process error.
- A losing trade can be marked as a correct execution.
- Review artifacts should stay tied to canonical replay/execution time so they
  remain stable under timezone, timeframe, and viewport changes.
- Shared evidence/tags/refs must be usable by both core workflows unless a
  workflow-specific model has a clear reason to diverge.
- A chart may display Historical Replay Review and Live Execution Review
  artifacts together. Workflow boundaries must be expressed through artifact
  type, source, visibility, and review semantics, not through isolated chart
  runtimes.
- Statistics, analysis, decision support, and AI assistance must be downstream
  of structured review artifacts and evidence. They should not become detached
  dashboards or generic chat surfaces unrelated to the trader's actual review
  loop.
- Analytics dashboards and visual demos should make review data visible through
  summaries, charts, distributions, timelines, and drilldowns, with links back
  to the source artifacts they summarize.
- Open-source/local deployment features should preserve profile/workspace/session
  ownership, backup/restore, and import/export, but deployment packaging must
  not displace the review loop before the training workflow is validated.

## V4 Lesson

V4 proves the product shape:

- replay review and journal/live records can share chart, date controls,
  calendar grouping, refs, annotations, and archive concepts;
- Order Setup/Order Review can bridge historical study and execution review;
- Live Records need a different model from replay review because they capture
  what the trader thought, felt, watched, did, skipped, and corrected later.

V4 also shows what V5 must avoid:

- feature-owned chart/replay mutation paths;
- review objects that grow separately and need expensive later unification;
- separate chart surfaces for historical replay and execution review when both
  should share the same chart context;
- ad hoc persistence assumptions for objects that become core research records;
- journal/order models that start as quick UI features before process-quality
  semantics are explicit.

## Phase Implications

Phase 3:

- prioritize real chart interaction that keeps no-future replay usable;
- do not spend Phase 3 on generic settings, rich drawings, or journal polish
  unless they directly unblock replay decision practice.

Phase 4:

- order, position, PnL, and journal work should be framed as Live Execution
  Review infrastructure;
- journal entries should support process tags, execution-quality notes, and
  screenshots/context around the decision moment;
- avoid building a generic trade ledger that only records entry, exit, and PnL.

Phase 5:

- annotations, evidence, and study tools should help compare repeated examples
  of the same behavior or setup;
- topical Historical Replay Review and Live Execution Review comparison sets
  should be first-class study workflows;
- statistics and analysis should turn tagged review artifacts into practice
  priorities and decision feedback;
- dashboard-style visualization should demonstrate review data through charts,
  tables, timelines, distributions, and artifact drilldowns.

Phase 6:

- local deployment packaging, backup/restore, and import/export should persist
  the review loop, not redefine the product around generic account management
  or dashboards.
- AI assistance may be introduced after structured artifacts, evidence, tags,
  and statistics exist; it should explain, summarize, classify, and suggest
  practice focus from the user's review data instead of replacing the review
  workflow.

## Forbidden Shortcuts

- Building a full-session chart viewer that weakens replay concealment.
- Treating Live Execution Review as a daily summary text box.
- Treating journal as only a note field attached to a trade.
- Building order/PnL first and adding process-quality semantics later.
- Creating annotation/evidence models that only work for one workflow when the
  same object should be shared.
- Treating PnL as the only success metric.
- Building statistics, analytics, or AI chat as detached dashboards instead of
  downstream decision support from review evidence.
- Building pretty visualizations that cannot drill back into the review moments,
  orders, notes, tags, or evidence that produced them.
- Copying FXReplay surface features without checking whether they support
  Historical Replay Review or Live Execution Review.
- Prioritizing deployment packaging or account infrastructure before replay plus
  execution review proves a useful training loop.

## Verification

New V5 steps should state which workflow they advance:

- Historical Replay Review;
- Live Execution Review;
- both;
- or neither, with a reason the work is still necessary infrastructure.

For order/journal work, acceptance criteria should include at least one
process-quality invariant, not only persistence or PnL correctness.

For shared foundation work, acceptance criteria should explain how the model can
serve both workflows or explicitly justify why it is workflow-specific.
