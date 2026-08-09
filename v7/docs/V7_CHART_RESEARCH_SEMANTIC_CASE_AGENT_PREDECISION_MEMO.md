# V7 AI-Agent-Participatory Research, Training, And Trading Review System — Pre-Decision Memo

Memo id: `MEMO-V7-003`

First formed: 2026-08-07

Last substantive revision: 2026-08-07 12:12 PDT

Status: partially promoted by `ADR-V7-003`; complete system shape, workflow
ownership, Agent autonomy, business model, and implementation remain unresolved

Registry: `V7_NON_DECISION_MEMO_REGISTRY.md`

Promotion note: on 2026-08-09, `ADR-V7-003` accepted exact semantic evidence,
no-future provenance, versioned cases/cohorts, deterministic metrics, and
evidence-linked AI output as product-direction constraints. This memo's final
pre-decision position remains frozen below. It still authorizes no Research,
Training, Trading Review, Agent, provider, or implementation module.

Stable-path note: the filename retains the memo's original research-focused
name so historical links remain valid after the broader goal correction.

## Purpose And Non-Authorization Boundary

This memo preserves a candidate business application above Replay and the
proposed Drawing/Semantic Annotation foundation. Its current target is an
**AI Agent deeply participating in research, training, and trading review**,
with all three loops sharing exact semantic evidence and feeding one another.

Chart Research remains a core loop: a user defines one Setup hypothesis and
outcome contract, records exact semantic evidence for each observed occurrence,
groups versioned cases into a research basket, and uses deterministic analytics
plus an LLM or coding agent to audit evidence, compare cohorts, discover/refine
hypotheses, and generate testable detector proposals. It is no longer the whole
product goal. Accepted findings should become training material; training and
real practice should produce review evidence; review should identify new
research questions and the next deliberate-practice program.

This is not a product decision. It does not authorize a Research, Training, or
Review module, Journal changes, agent/provider integration, detector,
statistical engine, remote data transmission, new persistence owner, or
business UI. It does not accept ADR-V7-001 or resolve the broader plugin-
platform direction.

## Position As Of 2026-08-07 12:12 PDT

The candidate end state is not a chart application with an AI report button.
It is a governed learning system in which an Agent can participate throughout:

```text
Research
  -> accepted hypotheses, counterexamples, evidence-linked findings
  -> Training
  -> deliberate drills, decisions, errors, confidence, learning evidence
  -> Trading Review
  -> process findings, recurring weaknesses, unanswered questions
  -> Research / next Training program
```

“Deep participation” means the Agent can maintain bounded plans, invoke
approved evidence and analytics tools, retrieve cases, prepare drills, observe
and critique decisions, compare repeated behavior, propose changes, and follow
up across time. It does not mean unrestricted database writes, hidden label
changes, invented statistics, autonomous trading, or replacing human judgment.

The candidate appears valuable because structured semantic cases can convert
Replay from isolated discretionary practice into a reproducible, evidence-
linked learning loop. Its differentiation is not “chat with a chart.” It is the
combination of:

- an ex-ante Setup definition;
- exact no-future semantic evidence;
- complete positive, negative, and ambiguous cases;
- immutable cohort snapshots;
- deterministic statistics;
- findings which cite raw chart context and counterexamples;
- agent-guided deliberate practice and longitudinal process review;
- agent assistance that proposes rather than silently changes source truth.

The direction should remain SMC/ICT-first and minute-data-capable. It does not
require a general plugin marketplace or second-level data to produce value.

## Candidate System Shape

```text
Agent-Participatory Learning System
|-- Research
|   |-- ResearchProject / definitions / StudyCases / StudyCohorts
|   `-- AnalysisRuns / ResearchFindings
|-- Training
|   |-- TrainingProgram / DrillSet / TrainingRun
|   `-- DecisionEvidence / CoachingFinding / ProgressMeasure
|-- Trading Review
|   |-- ReviewRun / Session and Journal references
|   `-- ProcessFinding / ErrorPattern / FollowUpAction
`-- Shared governed services
    |-- Semantic evidence and raw chart provenance
    |-- deterministic metrics and versioned definitions
    |-- Agent tools, permissions, budgets, and audit trail
    `-- Replay, Chart, Bar Data, Annotation, Session, and Journal owners
```

The names outside the established V7 owners remain candidates. This memo does
not choose whether one first-party module coordinates all three loops or
several removable modules collaborate through shared contracts.

### Research Loop Hierarchy

```text
ResearchProject
|-- UniverseDefinition
|-- SetupDefinition versions
|-- OutcomeDefinition versions
|-- StudyCohort snapshots
|   |-- discovery
|   |-- validation
|   |-- negative-control
|   `-- out-of-sample
|-- StudyCase references
`-- AnalysisRun / ResearchFinding records
```

Candidate terminology:

| Product concept | Candidate contract term | Meaning |
| --- | --- | --- |
| research project | `ResearchProject` | one research question and its governed definitions/runs |
| Setup constraints | `SetupDefinition` | versioned required/optional sequence and evidence rules |
| win/loss rules | `OutcomeDefinition` | comparable entry, stop, target, horizon, cost, and result policy |
| concrete Setup package | `StudyCase` or `EvidenceCase` | one observation with exact semantic/raw provenance |
| basket | `StudyCohort` | immutable versioned selection of cases and inclusion policy |
| one analysis | `AnalysisRun` | exact definitions, cohort, engine/agent versions, queries, and outputs |
| conclusion | `ResearchFinding` | evidence-linked descriptive result or hypothesis proposal |

“Basket” remains suitable UI language. `StudyCohort` is preferable in stored
contracts because one project needs several distinct baskets and exact snapshot
identity for reproducibility.

## Candidate Research Definitions

### Universe Definition

The universe fixes what could have been selected, not only what was selected:

- dataset revision and source resolution;
- instruments and date range;
- ETH/RTH/session/time-window policy;
- direction and market-regime filters;
- inclusion, exclusion, duplicate, and incomplete-data policy;
- search method: exhaustive, sampled, manually discovered, or detector-aided.

“2022 win rate” is not reproducible without the universe and sampling method.
Recording only memorable winning setups creates selection bias which no LLM can
repair later.

### Setup Definition

A Setup such as liquidity sweep → displacement → return to FVG is a versioned
hypothesis. Candidate fields include:

- ordered and unordered required semantic roles;
- optional roles and disqualifiers;
- relation types and maximum/minimum time gaps;
- instrument, timeframe, Session Hours, and market-context requirements;
- exact human-only versus machine-evaluable predicates;
- definition author, version, rationale, and effective dates;
- allowed evidence confidence/source kinds.

Changing a rule creates a new definition version. An agent cannot edit the
active version silently or reuse results calculated under an earlier version.

### Outcome Definition

Comparable win rate requires a separately versioned outcome policy:

- entry trigger and price policy;
- stop/invalidation policy;
- target or R-multiple policy;
- commissions/slippage assumptions when applicable;
- observation horizon and unresolved/timeout handling;
- MFE, MAE, time-to-event, and partial-result calculation;
- discretionary outcome labels and reviewer confidence when no deterministic
  execution model exists.

The memo does not authorize simulated fills or claim that one outcome policy is
correct. It records that a Setup constraint alone is insufficient to calculate
meaningful win rate.

## Candidate Study Case

One Study Case references immutable evidence rather than copying private
Drawing, Artifact, bar, Journal, or Session payloads into a new island.

```text
StudyCase
|-- caseId / projectId / definition versions
|-- instrument / market-data revision / source resolution
|-- observationReplayCutoff
|-- decisionEvidence
|   |-- SemanticArtifact revision references
|   |-- typed relations and chronology
|   `-- raw chart-context references
|-- outcomeEvidence
|   |-- outcome observation window
|   |-- result / MFE / MAE / timing
|   `-- later semantic evidence references
`-- reviewer / confidence / notes / label revision
```

Decision evidence and outcome evidence must remain separate. The first freezes
what was knowable at observation/decision time. The second records later price
action and must never leak back into the Setup qualification or agent evidence
bundle.

### Semantic Evidence Graph

The candidate case can represent exact claims such as:

```text
liquidity L1
  <-sweeps- candle C1
  <-followedBy- displacement D1
  <-forms- FVG F1
  <-respectedBy- reaction R1
```

These edges need typed source references, assertion source, confidence, and
definition version. Temporal/structural relations such as `precedes`, `sweeps`,
`forms`, and `mitigates` must be distinguished from an analyst's causal claim.
An observed case can support or contradict a causal hypothesis; it does not by
itself prove causation.

## Candidate Study Cohorts

A cohort is an immutable snapshot containing:

- exact case ids and revisions;
- inclusion/exclusion query and manual overrides;
- Setup/Outcome/Universe versions;
- creation time, author, and parent cohort when derived;
- labels such as discovery, validation, negative-control, or out-of-sample;
- frozen data/evidence hashes sufficient to detect later drift.

A live saved query may help navigation, but an `AnalysisRun` must consume a
frozen cohort snapshot. Otherwise the same report name can produce different
results as cases change.

Negative and near-miss cases are first-class. A basket of hand-selected positive
examples supports illustration, not win-rate or rule-effectiveness claims.

## Candidate Agent Capabilities

### Evidence And Label Audit

An agent can identify:

- missing required artifacts or relations;
- chronology contradictions;
- evidence created after the Replay cutoff;
- mixed Setup/Outcome versions;
- duplicate or overlapping cases;
- inconsistent human labels/confidence;
- cases which do not satisfy the claimed Setup;
- result labels which do not follow the selected Outcome policy.

### Deterministic Descriptive Analysis

An LLM should plan and explain queries; a deterministic analytics engine should
calculate counts, rates, confidence intervals, expectancy, MFE/MAE, timing, and
subgroup comparisons. Candidate dimensions include session, direction,
liquidity kind, displacement strength, FVG depth, volatility regime, year,
quarter, and definition version.

Every reported number retains the exact cohort, query, metric implementation,
and source cases. The LLM must not count hundreds of cases from a prompt and
present the result as authoritative statistics.

### Counterexample And Pattern Search

An agent can retrieve:

- cases satisfying every constraint but failing;
- successful near-misses lacking one proposed constraint;
- similar semantic sequences with different outcomes;
- subgroups whose apparent performance disappears out of sample;
- redundant or highly correlated constraints;
- ambiguous cases which most efficiently improve the label set.

These outputs generate hypotheses and active-review queues. They are not
automatic Setup decisions.

### Setup Refinement Proposal

An agent may draft a new SetupDefinition version with explicit evidence:

- proposed added/removed constraints;
- supporting and contradicting case ids;
- sample/effect size and uncertainty;
- overfit and leakage warnings;
- required validation cohort;
- predicates still dependent on human judgment.

Only an explicit human action creates/activates the new version.

### Detector And Test Generation

A coding agent may translate machine-evaluable predicates into a deterministic
detector proposal, generate fixtures from accepted cases, execute the detector
against frozen cohorts, and report true/false positives/negatives. It cannot
change human labels, Artifact definitions, or Setup truth to make tests pass.

The generated detector remains `computed` or `suggested`. Accepting a detected
occurrence as a human Study Case requires explicit provenance-preserving review.

### Training Participation

The Agent may help turn accepted Research evidence into deliberate practice:

- construct hidden-outcome Replay drills from frozen cohorts without leaking
  later bars, labels, or findings;
- select matched success/failure, near-miss, and ambiguous cases rather than
  training only on ideal examples;
- ask the user to identify evidence, state a hypothesis, choose an action, and
  declare invalidation before revealing the outcome;
- observe commands, timing, annotations, confidence, and rule adherence through
  approved event/evidence contracts;
- provide evidence-linked coaching after the decision point;
- adapt difficulty and review intervals from repeated process evidence rather
  than one P&L result;
- propose the next bounded Training Program and explain why each drill was
  selected.

The Agent must not see hidden outcome evidence while acting as an in-session
coach. Training feedback and scoring policies require explicit versions so a
later policy change does not rewrite earlier performance.

### Trading Review Participation

The Agent may help review Replay practice and, if separately authorized later,
real trading records:

- reconstruct plan → observed evidence → decision → action → management →
  outcome from referenced source records;
- separate process quality from financial outcome and flag hindsight edits;
- compare the case with its active Setup, risk, and Training definitions;
- identify recurring execution, patience, selection, confidence, or review
  patterns across sessions;
- retrieve comparable Study Cases and counterexamples with exact chart links;
- draft evidence-linked Review Findings and ask targeted follow-up questions;
- propose Journal corrections, new research questions, or future drills without
  silently committing any of them.

Research, Training, and Review may reuse source references, but they must not
collapse into one mutable record. Research claims, training observations,
Journal truth, and review interpretations have different authorship, timing,
revision, and no-future requirements.

## Candidate Agent Tool Boundary

Do not serialize an entire basket into one unbounded prompt. A host-mediated
agent should receive narrow versioned tools such as:

```text
queryCases(filters, cohortRevision)
compareCohorts(leftRevision, rightRevision, metricSet)
aggregateMetrics(cohortRevision, metricDefinitionVersion)
inspectEvidence(caseId, caseRevision)
openChartContext(caseId, replayCutoff)
findCounterexamples(setupVersion, cohortRevision)
testSetupVersion(setupVersion, cohortRevision)
draftResearchReport(analysisRunId)
prepareHiddenOutcomeDrill(trainingProgramVersion, cohortRevision)
inspectTrainingRun(trainingRunId)
compareTrainingRuns(filters, metricDefinitionVersion)
reviewSessionEvidence(sessionId, evidenceCutoff)
findRecurringProcessPatterns(reviewScope, definitionVersions)
proposeNextPractice(reviewRunId)
```

The host owns authorization, future filtering, evidence hashes, query/result
budgets, cancellation, privacy, provider credentials, cost/retention disclosure,
and immutable request/result provenance. Agent output is advisory by default.
Any later write-capable Agent action must be an explicit typed command accepted
by the sole owner, be attributable and reversible where the domain allows, and
never write Artifact, Journal, Session, Replay, Chart, Research, Training, or
Review storage directly.

Deep participation therefore requires more than one-shot prompting: durable but
bounded Agent task state, user-visible plans, permission checkpoints, resumable
analysis/training/review runs, evidence citations, and a complete tool/action
audit trail. The Agent may coordinate workflows through public contracts; it
does not become a new universal state owner.

An external coding agent receives an export or tool surface with the same
version/provenance restrictions. Repository write access is a separate user-
authorized development action, not an AnalysisRun permission.

## Candidate Run Outputs

### Research Analysis Run

One AnalysisRun should be able to produce an auditable package containing:

1. data-quality and exclusion report;
2. cohort/sample description;
3. deterministic headline and subgroup metrics;
4. stability across time/regime and out-of-sample results;
5. supporting cases and exact chart links;
6. counterexamples and near misses;
7. label/definition contradictions;
8. proposed Setup revisions with uncertainty and validation plan;
9. optional detector patch/test proposal;
10. next cases to label or review.

Every finding is typed as descriptive result, association, anomaly, hypothesis,
causal claim, or implementation proposal. Natural-language confidence cannot
replace statistical uncertainty or evidence references.

### Training Run

One TrainingRun should preserve the exact drill revision, hidden-information
boundary, user decisions and timestamps, confidence declarations, visible
evidence, rule-adherence metrics, Agent prompts/tool calls, revealed outcome,
coaching findings, and any proposed follow-up. Later research labels or Agent
model changes must not silently alter the historical run.

### Trading Review Run

One ReviewRun should preserve the reviewed Session/Journal/evidence revisions,
active Setup/risk/training definitions, process-versus-outcome assessment,
comparable cases, recurring-pattern queries, user corrections, Agent findings,
unresolved questions, and proposed research/training follow-ups. A review
finding is an interpretation with provenance, not a rewrite of the source
Session or Journal record.

## Bias, Leakage, And Causal Limits

- Rules discovered on one cohort cannot be validated on that same cohort.
- Discovery, validation, negative-control, and out-of-sample cohorts remain
  separately labeled and immutable.
- Manual search must record whether cases were exhaustively reviewed or chosen
  because they looked memorable.
- Outcome evidence cannot qualify the Setup retrospectively.
- Multiple hypothesis testing, parameter search, and repeated agent refinement
  require explicit overfit warnings and later untouched data.
- Market observations support associations and falsification; semantic richness
  alone does not prove that sweep caused displacement or FVG respect caused a
  profitable outcome.

Candidate chronological use could be 2022 H1 discovery, 2022 H2 refinement,
2023 validation, and 2024 stability review. This is an illustration, not an
adopted split.

## Ownership Alternatives Still Open

### Research, Training, And Review Ownership

1. one first-party removable learning-system module owns projects, programs,
   runs, and findings for all three loops;
2. separate Research, Training, and Review modules collaborate through shared
   evidence contracts;
3. Journal/Session owns source records and Review only references them, while a
   separate Research/Training module owns studies and drills;
4. Validation Campaign coordinates Training while Research and Journal retain
   their own records;
5. generic plugin workflows own optional schemas while a host Evidence owner
   persists stable identities;
6. a hybrid first-party system later consumes stable plugin contracts.

No option is selected. A future decision must preserve one writer per stored
record kind and keep referenced Artifacts readable when optional modules are
disabled.

### StudyCase Versus SetupCase

The current candidate distinction is:

- `StudyCase`: one research observation, including no-trade, failure, negative,
  and ambiguous evidence;
- `SetupCase`: the broader trade-process/workflow instance proposed by
  MEMO-V7-001, possibly including plan, entry, management, exit, and review.

A StudyCase may reference a SetupCase, but neither should duplicate the other.
The future decision may merge or rename them after real workflow prototypes.

### Agent Product Shape

Open alternatives include a built-in evidence-query assistant, a first-party
optional Agent coordinator spanning the three loops, governed plugin
capabilities, local model tools, user-key remote providers, hosted metered
service, and external coding-agent export. Privacy, operating cost, offline
behavior, continuity across runs, provenance, and user demand must decide the
first supported subset.

## Relationship To Earlier Memos And ADR-V7-001

### MEMO-V7-001 — General Futures Plugin Platform

That memo already proposes Semantic Annotation, Setup Workflow, AI Harness, and
Setup Case contracts inside a much broader plugin/distribution direction. This
memo narrows one possible high-value first-party application while broadening
its end goal from Chart Research alone to an Agent-participatory Research →
Training → Trading Review learning loop. It adds Research Project,
Universe/Outcome definitions, Study Cohorts, negative controls, deterministic
analytics, agent query tools, counterexample mining, deliberate-practice
programs, longitudinal review, and coding-agent detector generation.

The narrower product may be implemented before, through, or independently of a
general public plugin SDK. That sequencing remains undecided.

### MEMO-V7-002 — Seconds/Tick Data

Research, Training, and Review must deliver value with minute data. Later
seconds/ticks would extend evidence precision and resource requirements but do
not define the learning-system model or authorize Agent access.

### ADR-V7-001 / R13.1 — Drawing And Semantic Annotation Foundation

The proposed Annotation foundation supplies candidate stable Artifact ids,
market anchors, relations, no-future provenance, and Chart drill-down. This memo
does not accept ADR-V7-001. If its terminology or owner model changes during
review, the Research candidate must adapt rather than create a private semantic
store.

## Evidence Required Before A Product Decision

1. accepted or revised ADR-V7-001 artifact/provenance boundary;
2. real manual workflow from Replay observation to Study Case and raw-context
   drill-down;
3. exact Universe, Setup, Outcome, StudyCase, Cohort, AnalysisRun, TrainingRun,
   ReviewRun, Finding, and evidence-reference schema candidates;
4. decision on StudyCase versus SetupCase and their sole persistence owners;
5. positive, negative, ambiguous, and incomplete fixture cases with no-future
   proof;
6. deterministic statistics implementation and reproducible cohort snapshots;
7. one evidence/label audit and one counterexample report with exact case links;
8. one Setup revision proposal tested on untouched validation data;
9. coding-agent detector proposal with confusion matrix and immutable labels;
10. local/remote agent privacy, provider, retention, cost, cancellation, and
    provenance decision;
11. physical user review proving that research capture does not interrupt
    Replay practice or encourage hindsight labeling;
12. performance/storage budgets for realistic project and case counts;
13. one end-to-end research finding → hidden-outcome drill → post-session review
    → next research question loop with every Agent action and evidence source
    auditable.

## Promotion Checklist

To promote this memo, a separate ADR/product specification must explicitly:

- choose the product outcome and first supported Research → Training → Review
  workflow;
- choose record names and state owners;
- reconcile MEMO-V7-001 plugin/SetupCase alternatives;
- retain or supersede the minute-first relationship to MEMO-V7-002;
- consume the accepted Annotation foundation rather than duplicate it;
- define deterministic versus advisory agent outputs and write permissions;
- define sampling, no-future, outcome, statistical, and validation gates;
- identify rejected alternatives and why;
- allocate delivery steps only after human acceptance.

## Position History

### 2026-08-07 — Initial Formation

Captured the candidate Chart Research hierarchy, semantic Study Case package,
versioned basket/cohort model, deterministic analytics boundary, LLM/coding-
agent capabilities, causal limitations, validation splits, ownership
alternatives, and relationship to prior memos and ADR-V7-001. No decision or
implementation was authorized.

### 2026-08-07 12:12 PDT — End-Goal Correction

Corrected the candidate end goal from a Chart Research product with downstream
training/review derivatives to an AI Agent deeply participating across a
continuous Research, Training, and Trading Review system. Chart Research and
its Study Case/Cohort model remain the research substrate; training and review
are now co-equal product loops which feed evidence and questions back into
research. The correction also makes durable bounded Agent workflow state,
permission checkpoints, tool/action provenance, and longitudinal participation
central candidate requirements. It does not authorize implementation or choose
module ownership, provider, autonomy, or write permissions.
