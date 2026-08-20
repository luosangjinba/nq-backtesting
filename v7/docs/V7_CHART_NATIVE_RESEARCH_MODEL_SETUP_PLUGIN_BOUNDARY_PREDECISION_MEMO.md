# V7 Chart-Native Trading Research, Model, Setup, And Plugin Boundary — Pre-Decision Memo

Memo id: `MEMO-V7-006`

First formed: 2026-08-20 06:55 PDT

Last substantive revision: 2026-08-20 08:09 PDT

Status: discussion captured; decision and implementation not authorized

Registry: `V7_NON_DECISION_MEMO_REGISTRY.md`

## Purpose And Non-Authorization Boundary

This memo preserves the product owner's current software portrait and the
evidence which motivated V7. It records the emerging distinction among atomic
Plugins, freely composable but bounded Models, semantic Setup instances,
hindsight review, pseudo-live training, and orders. It also records the
product-wide usability constraint that a trader who understands basic trading
terms and can use TradingView should achieve a first useful result within three
minutes and no more than three meaningful steps.

The discussion is intentionally being slowed down. The product owner is still
describing the desired software and considering what is genuinely needed and
feasible. Terminology, the Model customization boundary, workflow ownership,
record schemas, Calendar behavior, and exact UI remain unresolved.

This memo does not:

- accept a product or architecture decision;
- accept ADR-V7-007 or ADR-V7-008 decisions 2–10;
- revive or accept the withdrawn Campaign/`Capture Study Case` product surface;
- authorize a Calendar, Model Builder, Setup capture flow, order workflow,
  Journal, geometry migration, Plugin Profile, AI tool, Pine/Python migration
  product, delivery id, Harness id, persistence namespace, or production code;
- amend accepted Chart, Replay, Bar Data, Annotation, Plugin Package,
  Contribution Profile, calculated-series, or evidence-grade ownership rules;
- define OTE as a Plugin; or
- treat the candidate structures below as settled vocabulary or schemas.

The current Study Case/Campaign production hold remains in force. Its source
and user-owned bytes remain preserved while the successor product is explored.

## Product-Origin Account

Many traders use Notion, Obsidian, spreadsheets, or similar note-taking tools
for review. The product owner did the same. Notion's table rendering became
slow enough that Excel was used for substantial review work instead.

Those tools can hold notes, links, screenshots, tags, formulas, and tables, but
they do not make the historical market context the primary document. Returning
to one observation requires reconstructing the date, instrument, timeframe,
visible window, drawings, and surrounding price path. A screenshot helps, but
the product owner considers the information available in an interactive Chart
to be orders of magnitude richer than the screenshot.

This limitation is the stated origin of V7:

> structured review should be immediately recoverable as an interactive Chart
> context, not remain a row or note whose best visual evidence is a screenshot.

The resulting candidate product portrait is not "a chart with a review table"
or "Notion with a chart link." The Chart is the primary research document.
Calendar, search, table, dashboard, and statistics are indexes or derived views
over exact Chart-linked evidence. A screenshot is a portable fallback or
export, not the canonical experience.

## User-Supplied Source Material

The discussion used three local, user-supplied artifacts as first-hand product
evidence:

- `v7/tmp/2013-demo.xlsx`;
- `v7/tmp/From 2012 to the present.xlsx`; and
- `v7/tmp/from 2012 to the present的OTE的一些说明.md`.

They were inspected read-only and were not modified. They are discovery input,
not production fixtures, accepted schemas, or migration commitments.

### Workbook Shape Observed On 2026-08-20

Both workbooks contain the same nine Sheet names: `OTE`, `2022`, `iFVG`,
`2022Model`, `calculations`, `direction`, `Sheet1`, `Sheet2`, and `Sheet3`.
The workbook titled `From 2012 to the present.xlsx` currently contains:

- 188 populated OTE rows across 144 unique market dates;
- 35 OTE dates with more than one sample and as many as four samples on one
  date, proving that a date and a Setup record are not the same identity;
- 56 populated `2022` rows;
- 20 populated `iFVG` rows; and
- 13 populated `2022Model` rows.

The OTE Sheet has 43 columns. It combines manual observations, categorical
semantic judgments, price/time anchors, hypothetical trade measurements,
derived spreadsheet formulas, media links, and sparse free text. Every
populated OTE row has a screenshot/path entry. The Sheet has no embedded image;
the screenshot cells are links. Only four OTE rows populate the later-added
`MMXM` field, five populate `description`, and none populate `HTF structure`.
This supports the product owner's explanation that some later fields proved
unhelpful and were no longer filled.

The workbook uses formulas for weekday, durations, Fibonacci prices, result
prices, loss, win/loss, risk/reward, and the two-Micro-contract scenario. It
uses constrained categorical values for direction, session, retracement level,
binary semantic conditions, result class, second entry, and maximum Fibonacci
extension. Those mechanics demonstrate a practical division between evidence
the trader must judge and values software can derive.

`Sheet1` also records broader research questions such as why price turns, time-
of-day opportunities, news effects, Judas Swing, premium/discount effects, and
higher-timeframe structure. The workbook is therefore not merely an executed-
trade journal. It is also an evolving market/model research notebook.

## Two Source Workflows

The product owner clarified the provenance of the workbooks:

1. `From 2012 to the present.xlsx` records **active hindsight review with full
   future visibility**. The trader starts with a defined Model such as OTE,
   searches FXReplay for qualifying Setups, and records their parameters and
   measured outcomes.
2. `2013-demo.xlsx` records **pseudo-live practice while watching FXReplay**.
   The future is revealed through the practice flow rather than used from the
   outset, but the trader still begins with a defined Model and searches for
   its Setups.

The workflows share a Model and may collect similar fields, but they do not
produce equivalent evidence:

| Workflow | Information available when acting | Primary question |
| --- | --- | --- |
| Hindsight review | full historical path | what forms did this Model take and how did a standardized application measure? |
| Pseudo-live practice | Replay-visible path only | could the trader recognize and act on the Model without future knowledge? |
| Imported/live execution | external event truth when later supported | what was actually ordered, filled, managed, and charged? |

An Entry/Stop/Target in hindsight research may be a standardized
counterfactual measurement rather than an executed or simulated order. The
OTE workbook's `R:R normal`, maximum result, and two-Micro-contract values are
examples of model-based measurement. A product must not infer an order merely
because a Setup contains Entry, Stop, Target, result, or P&L-like fields.

The exact relationship among shared market events, separate workflow records,
and optional order records remains open. No hindsight record may claim the
no-future provenance of pseudo-live practice, and neither may claim broker
execution truth.

## OTE Evidence Explained By The Product Owner

OTE is one known strategy Model used to search FXReplay for Setup instances.
The current Sheet captures the following groups.

### Identity And Navigation

- Date;
- screenshot/path;
- an optional, later-added MMXM reference which was largely abandoned; and
- derived weekday.

### Direction, Range, And Time Structure

- Position/direction;
- Range start and Range end, because OTE concerns a retracement into the
  preceding Range's Fibonacci 0.62–0.79 area;
- derived Range duration;
- the time at which drawdown/retracement ends;
- the preceding move's highest/lowest time;
- derived OTE trend duration; and
- Entry time.

These fields allow research into when qualifying Ranges form and how long their
phases last, not only whether a trade wins.

### Semantic Context Judged Around The Setup

- whether the preceding Range performed an External Purge;
- whether an Internal Purge occurred before the retracement ended;
- whether the retracement filled an FVG;
- whether it touched an OB;
- whether it ended at Key Level 50%;
- the ending retracement-level category;
- whether an ideal OB/2022 Entry was available;
- whether price only touched Fibonacci 0.62 and immediately ran away; and
- Session.

### Price, Hypothetical Entry, And Outcome Measurement

- Fibonacci 0.236, 0.62, 0, and 1 prices;
- Entry and Stop Loss prices;
- whether/when price reached Fibonacci 0.236 and Fibonacci 0;
- the final result class;
- whether a first loss was followed by a second Entry;
- maximum Fibonacci extension and maximum price point; and
- the measured result at several exit assumptions.

### Derived Performance Presentation

- result points for several target policies;
- stop-loss points;
- win/loss;
- maximum and safer/normal risk/reward; and
- the hypothetical dollar result for two Micro contracts.

### Low-Value Or Abandoned Context

- free-form description; and
- HTF structure.

The low usage of later-added free-text/context fields is product evidence. A
future system must allow a Model's capture definition to evolve, deprecate
fields, and retain old evidence without forcing every historical field into
every future interaction.

## Current Product Vocabulary

The following is the product owner's current distinction. It supersedes the
conversation's earlier loose phrase "OTE Plugin" but remains a memo position,
not an accepted schema.

### Plugin

A Plugin should stop at an atomic reusable drawing, semantic, or calculated
capability such as:

- FVG;
- SMT;
- BSL;
- EQL; or
- a calculated indicator such as MA.

An atomic Plugin may compute, detect, draw, or expose one bounded typed result.
It should be reusable across many Models. It should not become an entire
strategy suite, own a Model or Setup lifecycle, own orders, or claim that a
complete OTE Setup exists.

Accepted Contribution Profile and Chart-writer rules still govern any future
implementation. This memo does not collapse FVG/SMT/BSL/EQL into one accepted
Profile or assert that every named capability is implemented.

### Model

A Model is a strategy package or framework. It may include, for example:

- higher-timeframe qualification or directional conditions;
- one or several context/timeframe relationships;
- a lower-timeframe Entry process;
- invalidation, Stop, Target, or management ideas;
- semantic evidence expected from a Setup; and
- measurement or review policies.

A Model may refer to atomic Plugin outputs, direct price/time evidence, and
human semantic judgments. Plugins are optional evidence suppliers; the Model
is not itself a Plugin merely because it composes Plugin results.

The product owner wants Models to be freely customizable, but the allowed
customization boundary is not mature. No Model Builder grammar, runtime,
automatic scanner, evaluator, code surface, or persistence format is selected.

### Setup

A Setup is an instance of a Model in concrete market context. The product
owner currently describes it as a dataset containing semantic data which is
attached to the Model framework. Whether the final product calls each instance
a Setup, record, semantic evidence bundle, or dataset—and whether a collection
of instances alone receives the term Dataset—remains open.

A candidate Setup may eventually need to preserve:

- exact Model identity and version;
- instrument, market time, timeframe, visible/replay cutoff context;
- exact price/time anchors and semantic evidence;
- source Plugin/result identities when applicable;
- human observations and corrections;
- evidence provenance and workflow mode;
- later path/outcome measurement; and
- optional relations to simulated or actual decisions/orders.

The current safety hypothesis is that editing a Model must not silently change
the meaning of historical Setups. Re-evaluation against a newer Model should
be explicit and attributable. This versioning behavior is not yet accepted.

### Workflow And Order

Hindsight review, pseudo-live practice, and later imported/live review are
candidate evidence protocols or authoring contexts around Models and Setups.
They need not become separate Chart products. They also must not erase their
different future-visibility and execution claims.

An order is not a required part of a Setup. When a user actually makes a
practice or live decision, an order/execution record may reference the Setup
which motivated it. The exact ownership and relation remain undecided.

## Candidate Relationship Map

This map is a discussion aid only:

```text
Bars / Chart context
   + atomic Plugin outputs
   + user observations
              |
              v
       Model definition/version
              |
        instantiated within
        exact market context
              |
              v
     Setup semantic evidence bundle
        |          |           |
        v          v           v
 hindsight     pseudo-live   imported/live
 measurement    decisions     execution truth
        |          |           |
        `----------+-----------'
                   |
          Calendar / search / table
             -> exact Chart restore
```

Calendar, search, table, and statistics are candidate read/navigation surfaces.
They are not universal truth owners merely because they display all three
workflow sources.

## Model Customization Boundary — Unresolved Framing

The conversation proposed three rings as a way to reason about freedom. The
product owner has not accepted these rings.

### Ring 1 — Potentially Safe Free Configuration

- Model name, purpose, explanation, and version notes;
- timeframe roles without a mandatory fixed higher/lower tree;
- Session and market-time constraints;
- required and optional evidence fields;
- enums, tags, labels, and display grouping;
- references to admitted atomic Plugin outputs;
- capture/checklist presentation; and
- result fields and review views whose inputs already exist.

### Ring 2 — Potentially Bounded Declarative Composition

- AND/OR and required/optional conditions;
- before/after and within-N-Bar/time-window relationships;
- cross-timeframe evidence relations;
- comparisons over typed prices, times, numbers, and enums;
- simple formulas, scoring, qualification, invalidation, and measurement rules;
- explicit no-future/repaint policy; and
- partial automatic candidate generation followed by human confirmation.

This ring would require exact semantics, versioning, diagnostics, resource
limits, and evidence that a Model cannot read future or unavailable data. No
grammar or engine is authorized.

### Ring 3 — Candidate Non-Model Capabilities

- inventing a new indicator/detector algorithm;
- arbitrary Bar or historical-data access;
- arbitrary TypeScript/Python/Pine execution;
- native Chart/Canvas ownership;
- network access;
- direct persistence or state-sync ownership;
- broker/order execution; and
- unbounded scanning or background work.

A useful but unaccepted boundary hypothesis is: **a Model may compose admitted
facts but may not secretly create a new low-level computation or authority**.
Novel atomic computation would belong behind an appropriate Plugin/Profile or
host Runtime contract rather than arbitrary Model code.

Alternatives remain open, including fixed first-party Model templates, a
declarative Model Builder, progressively extensible templates, code-backed
Models, or a combination with different trust levels.

## Chart-Native Product Position

The current candidate mental model is:

- Chart is the primary document and place of observation;
- one Setup points to exact interactive market context, not merely a date or
  screenshot;
- Calendar, search, tables, dashboards, and statistics are ways to find,
  compare, and summarize records;
- multiple Setups may occur on one date;
- selecting a record should restore enough context to understand it, including
  instrument, time, timeframe/Panes, visible range, Replay cutoff where
  applicable, and attributable semantic/drawing evidence;
- screenshots remain useful for sharing or degraded archival viewing, but are
  not a substitute for navigable Chart evidence; and
- formula-derived fields should be computed rather than manually re-entered.

The exact meaning of "restore" remains unresolved. It may need to distinguish
restoring the author's original view from locating the same evidence within the
reviewer's current layout.

## Product-Wide Usability Constraint

The product owner set this target user baseline:

> a trader who understands basic trading terminology and knows how to operate
> TradingView.

For each user-visible capability, that user should achieve the first useful
result within three minutes and no more than three meaningful steps. This is a
product acceptance constraint, not a styling preference.

Current interpretation:

- the entry point is discoverable;
- the primary path has at most three understandable decisions/actions;
- one giant form containing many required fields does not count as one step;
- defaults expose only what is necessary;
- actions produce immediate visible Chart feedback where applicable;
- cancellation, correction, and undo are understandable;
- internal terms such as Runtime, owner, schema, Case, or transaction are not
  prerequisites for ordinary use; and
- advanced detail uses progressive disclosure.

The OTE workbook exposes a real tension: a 43-field research row cannot become
a friendly three-action workflow unless most factual anchors and derived
values are obtained from Chart interaction or computation, semantic judgments
are reduced or assisted, and optional classification can be deferred without
misrepresenting completeness.

Two unaccepted interaction hypotheses illustrate the target:

```text
Capture with an existing Model
  1. identify/mark the Setup on Chart
  2. confirm the Model and only the unresolved semantic judgments
  3. save and immediately expose it on Chart/Calendar/statistics

Review
  1. open Calendar/search/table
  2. choose a Setup
  3. restore its interactive Chart context
```

Model creation/customization is a separate advanced capability whose own
three-minute first-success path still needs definition. The constraint must not
be evaded by calling dozens of configuration decisions one step.

## Relationship To Existing Memos And Candidates

### MEMO-V7-001

MEMO-V7-001 broadly discusses a Plugin platform and Setup workflow.
MEMO-V7-006 records the later product-owner clarification that a complete
strategy Model such as OTE is not a Plugin. A future decision must reconcile
older phrases which could allow strategy-sized plugins with the atomic Plugin
boundary explored here.

### MEMO-V7-003 And ADR-V7-003

MEMO-V7-003 describes Research, Training, and Trading Review loops, while
ADR-V7-003 accepts evidence-grade, versioned, provenance-preserving user-owned
semantic data. MEMO-V7-006 supplies concrete first-hand workbook evidence for
those loops but questions the old form-first `StudyCase` mental model and its
terminology. The accepted evidence/provenance constraints remain binding.

### MEMO-V7-005

MEMO-V7-005 explores Collections, dashboards, Chart application, Setup-free
phenomena, and visual grammar. MEMO-V7-006 narrows the current product portrait
around Model-attached Setup instances and exact Chart restore. It does not
reject Setup-free phenomena, but it does not assume they share a Model or Setup
schema. The two memos require deliberate reconciliation before promotion.

### ADR-V7-006

ADR-V7-006 accepts Package/Contribution/Profile/Capability separation and
several initial non-exhaustive Contribution Profiles. MEMO-V7-006 does not
change them. It adds the product-level position that an atomic contribution can
supply evidence to many Models without the Model becoming a Contribution or
Plugin by implication.

### ADR-V7-007 Candidate

The candidate's shared Chart/Replay foundation, native workflow truths,
visibility lenses, and Activity index may remain useful. Its workflow terms,
Research record shape, Calendar assumptions, and next implementation order
must now be re-read against this slower product-portrait work. Decisions 2–10
remain unaccepted and should not be presented as the immediate next approval.

### ADR-V7-008 Candidate

Atomic Plugin authoring/migration and Model authoring are separate product
questions. A Pine/Python-to-TypeScript tool may help create an indicator or
detector without defining a user's OTE Model Builder. The accepted strict
TypeScript executable target remains unchanged; the standalone Studio
candidate remains unaccepted.

## Candidate AI Experience Over A Setup Corpus

The product owner asked what a trader should say after collecting 100 OTE
Setups and what useful feedback an LLM-based AI could return. This is an open
product question, but it exposes an important candidate boundary.

The trader should not need to serialize 100 rows, explain internal schemas, or
write a technical prompt. After explicitly selecting one exact Setup collection
or snapshot, the trader should be able to use ordinary trading language, for
example:

- "看看这 100 个 OTE，哪些条件可能与正常 R:R 有关。告诉我样本数、反例和偏差，
  不要只给胜率。"
- "AMOpen 和 AMSB 的 OTE 有什么差异？哪些案例最值得回看？"
- "检查哪些 OTE 字段有研究价值，哪些可能只增加记录负担。"
- "找出最违反我当前 OTE 认识的十个 Setup，并在 Chart 中带我逐个复习。"
- "根据这批样本提出下一轮采集计划，优先补足证据最薄弱的条件。"
- "比较上帝视角和伪实盘记录，看看我经常漏掉或误判哪类 OTE。"
- "把容易混淆的五个 Setup 做成练习，先隐藏结果，等我回答后再解释。"

The product should already supply the selected Model/version, field meanings,
units, provenance mode, Setup ids/revisions, outcome definitions, exclusions,
missingness, and exact Chart locators. The AI may ask one concise clarification
when the user's term is genuinely ambiguous. For example, "更可靠" might mean
reaching Fibonacci 0.236 before Stop, achieving a chosen normal R:R, maximum
extension, or pseudo-live execution consistency.

### Candidate Analysis Path

```text
trader's natural-language question
              |
              v
AI clarifies the intended outcome and drafts an analysis plan
              |
              v
deterministic query/statistics services operate on one frozen Setup snapshot
              |
              v
attributed results + denominators + uncertainty + exact Setup references
              |
              v
AI explains, finds counterexamples, opens Chart evidence, and proposes next work
```

The LLM should not calculate all statistics by visually reading a large JSON or
spreadsheet pasted into its context. Deterministic code should own filtering,
grouping, formulas, missing-value treatment, confidence/uncertainty measures,
and reproducible result tables. The LLM's candidate role is to:

- translate the trader's question into an inspectable analysis plan;
- request only allowed fields and metrics;
- explain findings in trading language;
- identify contradictory or representative examples;
- move from a finding to exact Chart-linked Setup evidence;
- expose ambiguity, missingness, selection bias, and weak denominators;
- suggest falsifiable hypotheses and the next sampling plan;
- generate review/practice exercises; and
- draft a possible new Model version or fork for explicit human review.

It must not silently edit the Model, rewrite Setup truth, reclassify evidence,
delete fields, create orders, or claim that a proposed relationship is causal
or profitable.

### Candidate Feedback Contract

A useful answer should normally contain:

1. **Scope** — exact Model version, Setup snapshot, workflow provenance,
   included/excluded counts, date/instrument coverage, and outcome definition.
2. **Data-quality findings** — missing fields, inconsistent labels, duplicates,
   mixed Model versions, unavailable Plugin evidence, and censored outcomes.
3. **Descriptive findings** — distributions, durations, Session/retracement/
   semantic-condition cohorts, outcome counts, and declared measurements.
4. **Conditional comparisons** — exact denominator for each group, effect size
   or difference, uncertainty, and a warning when a group is too small.
5. **Counterexamples** — exact Setups which contradict the apparent pattern,
   not only the most visually persuasive winners.
6. **Chart drill-down** — clickable records which restore the relevant evidence
   context for human review.
7. **Limits** — what this corpus cannot establish and which conclusions depend
   on hindsight, sampling, or measurement assumptions.
8. **Next action** — a small additional data-collection, definition-clarification,
   Model-fork, or practice proposal which the trader can accept or reject.

AI prose must not conceal the denominator. A statement such as "Internal Purge
performs better" is inadequate without the compared counts, outcome policy,
uncertainty, counterexamples, and provenance.

### What One Hundred Positive Setups Can And Cannot Answer

One hundred Setups may be useful for exploratory within-corpus questions, such
as whether recorded OTE outcomes differ across Session, direction, retracement
band, Purge, FVG, OB, or other fields. It does not automatically establish a
market-wide edge.

- If the 100 Setups were hand-picked, the AI cannot estimate OTE frequency,
  false-positive rate, or probability across all market periods.
- If only confirmed OTEs were retained, the AI cannot learn what distinguishes
  an OTE from near-misses or non-OTE candidates without an explicit comparison
  universe.
- If every qualifying Setup in a declared date/instrument universe was captured
  under one frozen definition, bounded occurrence/outcome estimates become more
  defensible for that universe.
- Hindsight Entry/Stop/Target measurements do not become executable performance
  without fill, slippage, overlap, fee, capital, and decision-time policies.
- Forty-three fields create many possible combinations. After splitting 100
  records by several conditions, groups may contain only a few observations;
  apparent patterns may be chance discoveries and must be labelled exploratory.

The AI should therefore begin with a dataset/provenance audit before offering
pattern claims. It may recommend collecting near-misses, exclusions, missing
Sessions, or pseudo-live decisions when those are needed to answer the user's
actual question.

## Candidate Personalized Setup Prediction Boundary

The product owner asked whether accumulated Setup data could become training or
fine-tuning material for an AI which judges, from currently available evidence,
whether a Setup may be entered and estimates a probability. This is feasible as
a research direction, but the phrase "predict whether a Setup can be entered"
currently combines three different problems which must remain separate:

1. **Setup recognition** — does the evidence visible at one declared decision
   cutoff satisfy one exact Trading Model/version?
2. **Conditional outcome estimation** — among candidates or confirmed Setups,
   what is the probability of one precisely defined future event?
3. **Entry policy** — given that estimate, payoff distribution, costs, risk
   limits, open exposure, and trader rules, should an order be created?

The first may combine deterministic Model rules, Plugin-derived evidence, and
human semantic confirmation. The second is a supervised statistical-prediction
problem. The third is a separate decision policy and must not be smuggled into
an apparently objective probability. A probability alone does not authorize an
order.

To avoid confusion with the product's capitalized Trading Model, this memo calls
the learned machine-learning component a **statistical predictor**.

### A Probability Must Name Its Event

"Entry probability" is too ambiguous to train or validate. A candidate target
could instead be written as:

```text
P(
  target is reached before stop within H bars
  |
  evidence observable at decision cutoff T,
  instrument/session context,
  OTE ModelVersion M
)
```

Other legitimate targets include whether the trader recognizes the Setup in
pseudo-live replay, maximum favorable excursion within a horizon, or a
multi-class Stop/partial/full-target outcome. Each target creates a different
dataset and predictor. Target, Stop, horizon, tie-breaking, censored-data, and
overlapping-Setup policies must be frozen and versioned before a number can be
called a probability.

### Why The LLM Should Not Be The Probability Engine

Fine-tuning an LLM on Setup records may help it learn the trader's terminology,
extract semantic fields, ask better questions, follow an answer format, and
explain comparable examples. That does not make the LLM's generated number a
calibrated forecast.

The candidate boundary is:

```text
frozen Trading Model/version + decision-time evidence snapshot
                              |
                              v
versioned feature/label builder with future-data prohibition
                              |
                              v
time-aware training, untouched forward validation, and probability calibration
                              |
                              v
statistical predictor + uncertainty/out-of-distribution/abstention result
                              |
                              v
LLM explains the estimate and restores comparable Setups in the Chart
```

The first useful predictor should be deliberately modest: transparent cohort
base rates, a Bayesian estimate, or a small regularized logistic model with a
few predeclared variables. Case retrieval can accompany it. More complex tree,
sequence, or Chart-image models may be investigated only after the candidate
universe and sample volume justify them. Complexity is not a substitute for
valid evidence.

### What The Current Hundred-Setup Example Could Support

There is no honest universal minimum sample count; it depends on target balance,
feature count, effect size, dependence among observations, market variation,
and required precision. The following boundary is nevertheless clear:

- one hundred hand-picked or confirmed OTE Setups alone cannot train a reliable
  `OTE versus not OTE` recognizer because the negative/near-miss opportunity
  universe is absent;
- one hundred confirmed Setups with completed binary outcomes could support an
  exploratory, strongly regularized baseline using only a few prespecified
  predictors, but not a trustworthy search across the current 43 fields and
  their interactions;
- fine-tuning a language model on those records may teach vocabulary or output
  structure, but cannot by itself establish that `0.73` means approximately 73
  successes in 100 comparable future cases; and
- a numerical reliability claim requires out-of-time evaluation and a sample
  which was not repeatedly consulted while definitions, fields, and parameters
  were changed.

Therefore the current corpus is valuable for schema discovery, hypothesis
formation, case-based retrieval, and a small feasibility baseline. It is not
yet evidence for a production entry probability.

### Decision-Time And Sampling Provenance

Only evidence available at decision cutoff `T` may become a predictor input.
Future outcome data may become the label, but not an input. This prohibition
also applies to apparently semantic fields: a hindsight label assigned while
viewing the completed path may have been influenced by the outcome and cannot
automatically claim decision-time provenance. It may need blind re-annotation
or pseudo-live capture.

At least three source populations should remain distinguishable:

- a declared opportunity stream containing candidates, exclusions, near-misses,
  and non-Setups for recognition and false-positive questions;
- confirmed Setups with frozen decision-time evidence and later outcomes for
  conditional-outcome questions; and
- pseudo-live or actual execution records for trader-recognition, fill,
  slippage, management, and realized-performance questions.

Related or overlapping Setups must be grouped so near-duplicates do not appear
on both sides of a validation boundary. Evaluation should advance through time,
keep a final period untouched, and introduce a gap when outcome horizons
overlap. Randomly shuffling rows would leak temporal/regime relationships and
overstate generalization.

### Candidate Near-Miss Vocabulary Boundary

The product owner asked what `near-miss` means in the proposed prediction-data
discussion. The candidate plain-language meaning is **a market candidate which
resembles a Setup and approaches the exact Trading Model boundary, but fails at
least one necessary Model condition**. It may also be called a boundary
candidate or boundary counterexample. This term is not yet accepted V7
vocabulary.

For a hypothetical OTE Model which requires a qualifying Range, a retracement
into a declared zone, an allowed Session, and an Entry condition, examples
might include:

- the candidate has the relevant Range and retracement shape but narrowly
  misses the required price zone;
- price enters the zone but the required Entry condition never becomes true;
- the component conditions appear but their time/order relationship violates
  the Model; or
- the structure qualifies except for a required Session/time constraint.

Those examples are illustrative only. Whether FVG, Purge, OB, Session, or any
other OTE observation is necessary, optional, descriptive, or merely a research
variable remains unresolved. The absence of an optional/descriptive field does
not make a candidate a near-miss. Near-miss classification must therefore bind
to one exact `ModelVersion` and its then-declared necessary conditions.

The following records must not be collapsed into one near-miss label:

| Record | Setup qualification | Correct concern |
| --- | --- | --- |
| valid Setup which later reaches Stop | still a valid Setup | negative outcome |
| valid Setup which the trader did not notice | still a valid Setup | recognition miss |
| valid Setup noticed but not entered or filled | still a valid Setup | decision/execution miss |
| trade which nearly reaches Target before failing | still governed by its original Setup status | outcome path/measurement |
| visually similar candidate which fails a necessary Model rule | not a valid Setup under that ModelVersion | Model near-miss |
| ordinary market period with no meaningful candidate resemblance | not a Setup | broader negative/opportunity universe |

This distinction keeps Setup truth, outcome truth, trader behavior, and order
execution independent. A losing Setup must not be relabelled as an invalid
Setup, and a missed valid Setup must not be converted into a Model failure.

Near-misses are useful because they expose the decision boundary: why one
candidate qualifies while a very similar one does not. They can provide hard
negative examples for a future recognizer, reveal ambiguous or impractical
Model rules, and create focused replay exercises. They are not sufficient as
the entire negative dataset. A recognizer also needs a declared, representative
opportunity stream containing ordinary non-Setups; otherwise its false-positive
rate and real-world base rate remain unknowable.

A defensible future near-miss observation would need to preserve, without yet
implying a settled schema:

- why the market segment entered the candidate universe;
- the exact Trading Model/version and decision cutoff;
- evidence visible at that cutoff;
- which necessary condition or conditions failed and why;
- whether the candidate was generated systematically, proposed by software, or
  selected manually; and
- an exact Chart restore locator.

Near-miss must not be assigned merely because the completed future path looked
interesting or because adding it improves a predictor's reported results. Its
candidate-selection and failure rules must be declared without outcome
knowledge. The product also needs to decide whether nearness is categorical,
rule-specific, or measured by price/time distance; there is no assumed single
universal `nearMissScore`.

### Candidate Screenshot/Semantic Multimodal Assessment Preconditions

The product owner asked what a mainstream LLM-based AI would theoretically need
to judge possible entry from either a Chart screenshot or a sequence of
semantic records, and requested a GitHub search for existing applications. This
question exposes four capability levels which must not be represented as one
feature:

| Level | Candidate capability | What an output does and does not establish |
| --- | --- | --- |
| visual commentary | describe apparent trend, levels, indicators, or chart pattern | useful narration; not validated Setup truth or probability |
| Model conformance | decide whether decision-time evidence satisfies one ModelVersion | Setup-recognition result; no outcome or order implication |
| conditional outcome | estimate one declared future event for a candidate/Setup | calibrated research estimate only |
| entry policy | combine the estimate with payoff, costs, exposure, and risk rules | separate decision recommendation; still no automatic order authority |

An application can look impressive at the first level by sending an image to a
vision-capable LLM and receiving fluent analysis. That user experience does not
prove the second, third, or fourth level.

#### Candidate Input Alternatives

| Input | Strength | Structural limitation |
| --- | --- | --- |
| screenshot only | carries spatial gestalt, drawings, multi-pane relationships, and trader-visible context | lossy pixels; scale/theme/zoom/OCR dependent; exact prices, time, bars, and provenance may be unavailable |
| OHLCV/indicator sequence | exact and deterministically recomputable | does not by itself encode the trader's semantic reading or full visual workspace |
| semantic evidence snapshot | directly expresses Model concepts, manual judgments, Plugin evidence, and anchors | useful only when schema, meanings, ModelVersion, cutoff, and missingness are reliable |
| hybrid screenshot + exact bars + semantics | lets vision inspect spatial context while tools own exact facts | requires strict alignment and a more disciplined contract |

The current candidate preference is hybrid, not image-only. The screenshot may
be a useful evidence surface, but it should not be the only source of prices,
timestamps, Model rules, or calculated values which V7 already knows exactly.

A defensible screenshot input would require a versioned render contract which
freezes at least:

- instrument/contract, source, timezone, timeframe, and decision cutoff;
- visible bar range, price scale, zoom, crop, resolution, theme, candle colors,
  and compression;
- which panes, indicators, Plugin projections, drawings, axes, labels, Session
  marks, and order-like measurements are visible;
- an explicit no-future boundary, including removal of labels, drawings, or
  outcome text which reveal later information; and
- a link to the exact bar/semantic snapshot from which the image was rendered.

A defensible semantic/numerical input would require:

- one exact Trading Model/version and its necessary versus descriptive fields;
- an immutable decision-time evidence snapshot with value, unit, source,
  observed/known time, missingness, and confidence where applicable;
- exact Plugin/package/version provenance for derived evidence;
- labels which distinguish Model qualification, future outcome, recognition,
  decision, fill, management, and realized execution; and
- a declared opportunity universe containing valid Setups, near-misses, and
  representative ordinary non-Setups when recognition is the task.

#### Candidate AI/Tool Boundary

```text
canonical Chart snapshot + exact OHLCV + semantic evidence + ModelVersion
                                  |
                                  v
deterministic tools verify prices, time, indicators, rules, and no-future scope
                                  |
                                  v
vision/LLM layer proposes visual and semantic interpretations with citations
                                  |
                                  v
specialized recognizer or calibrated statistical predictor owns probabilities
                                  |
                                  v
evidence card exposes uncertainty, abstention, counterexamples, and Chart links
                                  |
                                  v
separate human/risk policy may authorize an order action
```

Zero/few-shot use of a general vision LLM requires no V7-specific training set
and can prototype commentary or semantic-field proposals. Retrieval over the
trader's prior Setups can improve consistency and provide comparable cases, but
retrieval does not train or calibrate the model. Fine-tuning a multimodal model
requires aligned images, cutoffs, prompts/semantic facts, human-verified labels,
counterexamples, and a held-out temporal evaluation set. A separate small
classifier/regressor over exact features is likely more data-efficient for a
probability than tuning the full generative LLM.

No fixed record threshold is accepted. As one scale reference rather than a V7
requirement, FinVis-GPT's author repository reports 200,000 pre-training and
100,000 instruction-tuning examples for a financial-chart-specific multimodal
LLM. The previously discussed 100 OTE records are therefore better suited to
schema discovery, retrieval, prompt/evaluation prototyping, and a small
structured baseline than to teaching a general vision model reliable chart
perception.

#### Required Evaluation Beyond Ordinary Backtesting

A candidate system would need to pass more than a profitable historical run:

- chronological/walk-forward outcome evaluation with an untouched final period;
- probability calibration, uncertainty, base-rate comparison, and an explicit
  abstention state;
- render-robustness tests across resolution, color, theme, scale, zoom, crop,
  indicator visibility, and harmless UI changes;
- paired screenshot-versus-exact-data tests which reveal whether the image adds
  information or only noise;
- counterfactual evidence tests which hold past trend constant while changing
  the local Setup evidence, plus trend/label swaps which expose momentum
  shortcuts;
- horizon-sensitivity tests which verify that changing the declared outcome
  horizon changes reasoning appropriately;
- blanked text, masked indicators, mirrored colors, and metadata controls which
  expose OCR, ticker, watermark, or renderer shortcuts; and
- ModelVersion-, instrument-, timeframe-, Session-, and regime-specific error
  analysis with exact false positives, false negatives, and Chart restore links.

The model's self-reported `confidence` is not a calibrated probability. A
system must measure its predictions against unseen outcomes before displaying a
percentage as empirical evidence.

#### GitHub And Primary-Research Evidence Reviewed On 2026-08-20

The GitHub search found useful components and interaction examples, but no
drop-in, evidence-grade OTE entry predictor:

The official
[awesome-tradingview](https://github.com/tradingview/awesome-tradingview)
registry was also checked. Its current list exposes official Widgets, Advanced
Charts, Lightweight Charts, example Plugins, and Pine Script resources plus a
small community list, but no official screenshot-to-entry AI or calibrated
prediction capability. Its community section explicitly disclaims TradingView
management, endorsement, quality, and safety guarantees. A repository merely
using TradingView screenshots must not be treated as a TradingView-supported
solution.

| Project | Observed design | Candidate lesson; not an adoption decision |
| --- | --- | --- |
| [compass-stock-agent](https://github.com/belarusian/stock-agent) | screenshot capture, resize/compress to 1024 px JPEG, vision-LLM call, free-form text; README explicitly uses no JSON result schema | minimal screenshot-analyst UX reference, not a calibrated prediction contract |
| [gpt-4-vision-crypto-chart](https://github.com/myInstagramAlternative/gpt-4-vision-crypto-chart) | clipboard screenshot plus prompt sent to an OpenAI vision model for conversational technical analysis | small image-chat wrapper; demonstrates feasibility of commentary rather than validated trade classification |
| [sniper-trade-automation](https://github.com/assaf-malki/sniper-trade-automation) | proposed RSI/news/session filters, 15m/1h TradingView images, GPT-4 Vision, and PineConnector execution | architectural caution: inspected repository has one commit and only README/image/license, not the described workflow code |
| [LLM_trader](https://github.com/qrak/LLM_trader) | hybrid OHLCV/order book/news, 50+ indicators, deterministic patterns, 4K chart image, RAG/memory, risk controls, and LLM | stronger hybrid architecture reference; repository labels itself experimental beta and the README is not evidence of calibrated OTE prediction |
| [ChartScanAI](https://github.com/Omar-Karimov/ChartScanAI) | annotated generated charts and a trained YOLOv8 detector exposed through Streamlit | reusable pattern-detection idea; specialized vision model rather than LLM reasoning, Setup qualification, or outcome probability |
| [TradingView_ProAI](https://github.com/ties2/TradingView_ProAI) | transfer-learned ResNet classifier over 102 manually collected screenshots with train/validation/test folders | useful tiny educational classifier example; its own README rejects real trading use and the sample scale is not production evidence |
| [FinVis-GPT](https://github.com/wwwadx/FinVis-GPT) | financial-chart multimodal model; repository reports 200k pre-training and 100k instruction-tuning examples | demonstrates domain-tuning scale; paper/repository claims do not substitute for V7's decision-time and calibrated-outcome benchmark |
| [TradyCOP](https://github.com/Ctmax-ui/TradyCOP) | browser extension which copies TradingView candles as OHLC for an LLM | supports the exact-data path and shows why screenshots need not carry facts already available structurally |

The research literature reinforces the caution:

- [MME-Finance](https://github.com/HiThink-Research/MME-Finance) evaluates 19
  multimodal models and reports candlestick and technical-indicator charts among
  their weakest financial image categories; it is a perception/reasoning
  benchmark, not proof of entry profitability.
- [Do VLMs Truly “Read” Candlesticks?](https://arxiv.org/abs/2604.12659)
  compares visual models with an exact-feature XGBoost baseline. It reports weak
  predictive capability for most VLMs in common market scenarios, significant
  directional biases, limited response to stated forecast horizons, and greater
  average stability from the numerical baseline.
- [Martingale Doppelgänger-Eval](https://arxiv.org/abs/2606.17423) uses matched
  counterfactual charts and trend/label swaps. Its frozen commercial and open
  VLMs were strongly trend-biased and weakly sensitive to injected candlestick
  evidence, showing why fluent visual explanations cannot certify evidence use.
- [FinAgent](https://arxiv.org/abs/2402.18485) is relevant as a multimodal-agent
  architecture because it combines numerical, textual, visual, tool, memory,
  reflection, and decision modules rather than treating a screenshot as a
  sufficient trading state.

No repository was cloned, executed, depended upon, or selected. The audit is
discovery evidence only. License, maintenance, reproducibility, data rights,
security, evaluation leakage, and V7 ownership compatibility would require a
separate reuse gate before any implementation proposal.

### Candidate Probability Result Contract

A user-facing result must never be a bare percentage. It should contain:

- the exact predicted event, cutoff, horizon, Trading Model/version, predictor
  version, and evidence-snapshot id;
- the point estimate together with an uncertainty interval or an explicit
  `insufficient evidence`/abstention state;
- the relevant base rate, effective sample count, date/instrument/session or
  regime coverage, missingness, and out-of-distribution warning;
- forward-test discrimination and calibration evidence, including Brier or log
  loss and a reliability view rather than accuracy alone;
- the most comparable supporting and contradicting Setups with exact Chart
  restore links; and
- a statement that the estimate is conditional research evidence, not an order
  command or promise of profitability.

A candidate natural-language request could be:

> 按 OTE v1.2，只使用当前时刻已经可见的证据，估计这个 Setup 在 60 bars 内
> 先到 Fib 0.236 而不是 Stop 的概率；告诉我样本数、置信范围、相似案例、反例，
> 以及它是否超出了训练数据范围。

The product could still satisfy the product-wide interaction constraint:
confirm or select the current Setup, request the Model-defined outcome estimate,
then inspect one evidence card and its Chart-linked cases. This is an
unaccepted UX hypothesis, not an implementation commitment.

### Method Evidence Consulted

- scikit-learn's time-series cross-validation guidance records that ordinary
  shuffled/K-fold assumptions are inappropriate for autocorrelated time-series
  observations and that evaluation must preserve time order:
  <https://scikit-learn.org/stable/modules/cross_validation.html>.
- scikit-learn's probability-calibration guidance distinguishes predictive
  classification from calibrated probabilities and fits calibration on
  cross-validated, unbiased predictions:
  <https://scikit-learn.org/stable/modules/calibration.html>.
- scikit-learn's data-leakage guidance requires splitting before learned
  preprocessing or feature selection:
  <https://scikit-learn.org/stable/common_pitfalls.html>.
- Bailey, Borwein, López de Prado, and Zhu's primary paper formalizes the risk
  that repeated strategy selection produces impressive in-sample backtests
  which fail out of sample:
  <https://papers.ssrn.com/sol3/papers.cfm?abstract_id=2326253>.

### Candidate Three-Step User Flow

An unaccepted interaction hypothesis which fits the product-wide constraint is:

1. select the Setup collection/snapshot and ask a natural-language question;
2. confirm one short interpretation/analysis plan only when necessary; and
3. receive the answer with exact evidence, Chart links, limitations, and a
   proposed next action.

The user should not need prompt engineering. Candidate UI intents such as
`找规律`, `比较条件`, `找反例`, `改进 Model`, and `生成训练` may help a trader start,
but they must remain ordinary entry points into the same evidence-bound process
rather than separate AI products.

## Open Questions

1. What is the smallest user-facing definition of a Model?
2. Which OTE concepts are Model structure, atomic Plugin evidence, direct Chart
   anchors, manual semantic judgments, or derived measurements?
3. Which Model parts are fixed, configurable, or extensible, and by whom?
4. Is a Setup one record/evidence bundle while a Dataset is a collection, or
   should the product owner’s broader Setup-as-dataset language be retained?
5. Can the same underlying market event be referenced by independent hindsight
   and pseudo-live observations without conflating their provenance?
6. Which semantic judgments can be proposed automatically, which require human
   confirmation, and how is disagreement recorded?
7. What exact Chart state must a record restore?
8. How do Model edits, deprecations, forks, and re-evaluations affect historical
   Setups without rewriting them?
9. What remains visible when a Plugin which originally supplied evidence is
   unavailable or upgraded?
10. When does an Entry/Stop/Target remain research measurement, and what exact
    user action creates a practice or live order record?
11. How can a rich OTE capture remain honest while satisfying the three-minute
    and three-meaningful-step constraint?
12. Which parts of Calendar, table, dashboard, and Chart projection are needed
    to support retrieval before any new research authoring surface is built?
13. Which deterministic statistics/query capabilities must exist before AI may
    answer common Setup-corpus questions?
14. How should the product declare the sampling universe and distinguish a
    census, hand-picked research sample, pseudo-live discoveries, near-misses,
    and actual executions?
15. Which AI questions require a single clarification, and how can the product
    avoid turning that clarification into a multi-step analysis form?
16. What exact evidence may an AI use when proposing a Model fork, and how is
    that proposal reviewed without altering the current Model or old Setups?
17. Which first probability target is genuinely useful: Setup recognition,
    target-before-stop, maximum excursion, or pseudo-live trader recognition?
18. What declares the complete candidate/opportunity universe and preserves
    negative, excluded, and near-miss cases without creating excessive capture
    burden?
19. Which existing OTE fields can honestly claim decision-time availability,
    and which hindsight semantic judgments require blind re-annotation?
20. What minimum forward-test/calibration evidence and abstention behavior must
    be satisfied before V7 displays any personalized probability?
21. Should a predictor be personal to one trader/Trading Model version, or may
    evidence ever be pooled across traders without erasing semantic differences
    and data rights?
22. Which OTE conditions are genuinely necessary qualification rules and which
    are optional, descriptive, outcome-derived, or research-only variables?
23. What systematic rule admits a market segment into the OTE candidate
    universe before it can be classified as Setup, near-miss, or ordinary
    non-Setup?
24. May a near-miss fail several necessary conditions, and should nearness be
    categorical, rule-specific, price/time distance, or deliberately remain
    unranked?
25. How can near-miss rejection reasons be captured or confirmed without
    burdening the trader or violating the three-minute/three-step constraint?
26. Is a screenshot ever allowed to be the sole AI input, or must every V7
    assessment include exact bars, cutoff metadata, ModelVersion, and semantic
    provenance?
27. What canonical Chart-render contract is stable enough for training and
    evaluation without erasing the trader's real workspace context?
28. Which visual judgments should an LLM merely propose, which may be confirmed
    by deterministic tools, and which must remain human semantic evidence?
29. Should the first benchmark compare zero-shot VLM, VLM plus retrieval,
    structured LLM, small feature predictor, and hybrid alternatives before any
    fine-tuning path is considered?
30. What counterfactual/render/horizon tests must pass before V7 may claim that
    a model genuinely used Chart evidence?
31. Which local and hosted vision models satisfy privacy, cost, latency,
    reproducibility, and replaceable-provider requirements?
32. What license, data-rights, maintenance, and architecture-reuse gate would
    be required for any inspected GitHub component?

## Evidence Required Before A Decision

- reconstruct at least one real OTE hindsight-review workflow from opening
  FXReplay through finding, capturing, calculating, and later revisiting the
  sample;
- reconstruct the analogous pseudo-live workflow and identify exactly when
  future information becomes available;
- classify every current OTE field by source, manual/automatic status,
  required/optional status, Model specificity, and user value;
- apply a provisional necessary-versus-descriptive classification to real OTE,
  losing-Setup, recognition-miss, execution-miss, boundary-candidate, and
  ordinary non-Setup examples and check whether traders distinguish them
  consistently;
- test a paper or clickable Chart-native capture flow with a TradingView-
  familiar trader against the three-minute/three-step constraint;
- test exact Calendar/search-to-Chart restore with several Setups on one day;
- compare fixed-template, declarative-builder, and code-backed Model
  customization alternatives;
- define model-version and evidence-provenance behavior with a concrete edit/
  fork/re-evaluation example;
- define one exact prediction event, cutoff, horizon, opportunity universe,
  future-data prohibition, and no-order boundary;
- build a paper-only temporal split over existing records and identify leakage,
  near-duplicate, censoring, and missing-negative failure modes before choosing
  any predictor;
- determine the sample/forward-test precision needed for a useful probability
  through learning curves and calibration evidence rather than an arbitrary
  record-count threshold;
- construct a small paired corpus in which each decision cutoff has a canonical
  screenshot, exact OHLCV window, semantic snapshot, ModelVersion, outcome, and
  Chart locator, then measure what each modality adds;
- benchmark at least one general vision LLM, one structured-data LLM path, one
  small feature predictor, and one hybrid path on the same frozen examples;
- run render perturbation, matched evidence intervention, trend/label swap,
  horizon sensitivity, and abstention tests before interpreting fluent visual
  output as grounded Setup recognition;
- perform a separate license, code, data, maintenance, security, and ownership
  audit before proposing reuse of any GitHub repository;
- reconcile the result with MEMO-V7-001/003/005, ADR-V7-003/006, and both
  current decision candidates; and
- verify that the chosen boundary preserves Chart, Replay, Bar Data, Plugin,
  business-record, and order ownership.

## Promotion Checklist

- [ ] product owner completes enough of the software portrait to state the
  primary user jobs and exclusions;
- [ ] Plugin, Model, Setup, workflow, evidence, and order terms are understood
  in user language before schemas are written;
- [ ] OTE is decomposed as the first concrete boundary case;
- [ ] at least one alternative Model customization boundary is compared rather
  than assumed;
- [ ] the three-minute/three-step rule has an honest acceptance method;
- [ ] conflicts with existing memos/candidates and accepted ADRs are explicit;
- [ ] any promoted decision cites which memo positions it accepts, changes,
  rejects, or leaves open; and
- [ ] implementation authority is requested separately through a bounded
  specification after the product decision.

## Position History

### 2026-08-20 08:09 PDT — Multimodal Assessment And GitHub Evidence Added

- separated screenshot commentary, Model conformance, conditional outcome
  estimation, and entry policy as four distinct capability levels;
- recorded screenshot-only, exact OHLCV, semantic, and hybrid input tradeoffs
  and the candidate preference for a hybrid evidence contract;
- defined decision-cutoff, render, semantic provenance, deterministic-tool,
  specialized-predictor, calibration, abstention, and counterfactual evaluation
  preconditions;
- recorded the GitHub review of screenshot wrappers, hybrid LLM agents,
  specialized chart detectors/classifiers, structured-OHLC extraction, and a
  financial-chart-specific multimodal model without selecting any dependency;
- recorded primary benchmark evidence that current VLMs remain weak or biased
  on candlestick evidence and that fluent analysis does not establish grounded
  prediction; and
- added no AI, training, reuse, probability-display, or implementation
  authorization.

### 2026-08-20 07:53 PDT — Near-Miss Vocabulary Boundary Added

- recorded `near-miss` as an unaccepted plain-language boundary candidate which
  resembles a Setup but fails a necessary condition of one exact ModelVersion;
- separated Model near-misses from losing valid Setups, recognition misses,
  decision/execution misses, outcome-path near-misses, and ordinary non-Setups;
- recorded that only necessary Model conditions can create a near-miss and that
  the current OTE necessary-versus-descriptive field boundary is unresolved;
- recorded why hard near-miss negatives do not replace a representative broader
  opportunity/non-Setup universe; and
- required decision-time candidate provenance and failure reasons without
  accepting a schema, capture flow, recognizer, or implementation.

### 2026-08-20 07:48 PDT — Personalized Prediction Boundary Added

- separated Setup recognition, conditional outcome estimation, and entry/order
  policy rather than treating them as one AI judgment;
- recorded that a statistical predictor, not an LLM's generated prose, must own
  any calibrated probability while the LLM may explain and retrieve evidence;
- defined a candidate decision-time feature, versioned outcome, temporal
  validation, calibration, uncertainty, out-of-distribution, and abstention
  boundary;
- recorded why a 100-record, confirmed-Setup-only corpus can support only
  discovery and a small exploratory baseline, not a reliable recognition or
  production entry probability; and
- added no implementation or probability-display authorization.

### 2026-08-20 07:35 PDT — Setup-Corpus AI Interaction Added

- recorded that traders should ask questions in ordinary trading language
  rather than paste or describe internal data structures;
- separated deterministic query/statistics ownership from LLM planning,
  explanation, counterexample discovery, Chart navigation, and next-study
  proposals;
- defined a candidate answer shape with scope, denominators, uncertainty,
  counterexamples, Chart links, limitations, and next action;
- recorded the inferential limits of 100 positive/hand-picked Setups and the
  need for an explicit sampling universe or negative/near-miss evidence; and
- added an unaccepted three-step AI interaction hypothesis without authorizing
  an AI feature or Model mutation.

### 2026-08-20 06:55 PDT — Initial Capture

- recorded the Notion/Obsidian/Excel review experience and interactive-Chart
  motivation;
- recorded read-only evidence from the two workbooks and OTE explanation;
- separated hindsight Model measurement from pseudo-live and actual execution;
- corrected the conversational overreach which treated OTE as a Plugin;
- recorded the atomic Plugin, customizable Model, semantic Setup-instance, and
  optional-order distinction;
- preserved the unresolved Model-customization boundary and three-ring framing;
- made the three-minute/three-meaningful-step UX requirement explicit; and
- paused promotion and implementation while the product portrait develops.
