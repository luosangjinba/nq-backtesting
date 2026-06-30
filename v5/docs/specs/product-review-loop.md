# Product Review Loop

Phase: cross-phase product north star.

Purpose: V5 exists to help a trader turn market replay and real execution
history into repeatable trading skill. It is not just a chart viewer, order
ticket, journal, or FXReplay clone.

## Core Principle

Historical Replay Review and Live Execution Review are V5's core work. They are
not optional later features.

Chart rendering, replay controls, order models, journal entries, annotations,
screenshots, tags, statistics, import/export, workspace sync, and SaaS packaging
are infrastructure around these two workflows.

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
- SaaS features should preserve user/workspace/session ownership, but public
  auth, billing, and entitlements must not displace the review loop before the
  training workflow is validated.

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
- local-only persistence assumptions for objects that become core research
  records;
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
  should be first-class study workflows.

Phase 6:

- SaaS packaging should monetize and persist the review loop, not redefine the
  product around account management or dashboards.

## Forbidden Shortcuts

- Building a full-session chart viewer that weakens replay concealment.
- Treating Live Execution Review as a daily summary text box.
- Treating journal as only a note field attached to a trade.
- Building order/PnL first and adding process-quality semantics later.
- Creating annotation/evidence models that only work for one workflow when the
  same object should be shared.
- Treating PnL as the only success metric.
- Copying FXReplay surface features without checking whether they support
  Historical Replay Review or Live Execution Review.
- Prioritizing SaaS infrastructure before replay plus execution review proves a
  useful training loop.

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
