# V7 Semantic Dataset Market And Commercialization — Pre-Decision Memo

Memo id: `MEMO-V7-004`

First formed: 2026-08-09

Last substantive revision: 2026-08-09 PDT

Status: core product position partially promoted by `ADR-V7-003`;
commercialization, hosting, shared datasets, branding, and market entry remain
undecided and implementation is not authorized

Registry: `V7_NON_DECISION_MEMO_REGISTRY.md`

## Purpose And Non-Authorization Boundary

This memo preserves the discussion which led to the accepted conclusion that
V7 can produce evidence-grade semantic annotation data. It also retains the
questions which did not reach a decision: whether to commercialize, who would
pay for an open-source product's hosted service, how market-data licensing
affects SaaS economics, whether to train an open model, whether to aggregate
user data, and how V7 differs from existing journals, Replay products, chart-AI
tools, annotation platforms, and institutional financial-data vendors.

`ADR-V7-003` promotes only the product position, first-class dataset output,
evidence invariants, local-first/user-ownership boundary, and human-governed AI
rule. This memo authorizes no SaaS, account system, dataset marketplace, model
training, data purchase, public corpus, pricing experiment, marketing claim,
or production implementation.

## Discussion Origin

The commercial question was deliberately reframed from “can this be sold?” to
“which expensive and recurring user problem does it solve?” The candidate pain
point which survived that test was:

> Many discretionary traders cannot tell whether losses come from a Setup
> without an edge, incorrect Setup recognition, or failed execution discipline.
> They keep screenshots and journals, but cannot turn them into structured,
> statistical, traceable evidence.

The user agreed that this diagnosis matches the intended problem. The later AI
discussion added a second observation: the same structured evidence can become
high-quality, domain-specific annotation data. V7's output need not be only a
chart, session, report, or journal entry; it can be an auditable corpus suitable
for personal research, model retrieval, evaluation, preference learning, or
future fine-tuning.

The final promoted conclusion is recorded in `ADR-V7-003`. The route to a
sustainable business remains open.

## Position Before Promotion

The working position formed during discussion was:

- a generic Replay product is difficult to differentiate from mature
  competitors;
- an AI screenshot grader is easy to demonstrate but loses exact timestamps,
  source Bars, Replay visibility, type versions, reviewer history, negative
  examples, and causal/semantic relations;
- a journal with screenshots and tags captures memory but does not reliably
  separate Observation, Interpretation, Decision, and Outcome;
- a generic annotation platform has broad tooling but lacks trading Replay,
  no-future constraints, exact Bar evidence, Setup/Outcome definitions, and
  chart-context drilldown as its native domain;
- a proprietary “trading AI” model is a replaceable dependency, not a durable
  moat when its evidence cannot be audited;
- evidence-grade semantic records and versioned Study Cases/Cohorts are a more
  defensible substrate because they improve both human validation and later AI
  quality.

This position became binding only in the narrower form stated by
`ADR-V7-003`.

## Public Competitive Landscape Reviewed On 2026-08-09

This was a product-positioning survey of publicly documented capabilities, not
an exhaustive legal or technical audit of every private feature. Absence from
public documentation does not prove that a competitor has no internal or
unannounced capability. Every commercial decision must revalidate the market.

### Replay And Trading-Journal Entry Points

Representative products reviewed included FX Replay, TradesViz, TradeZella,
TraderSync, Edgewonk, Tradervue, and several AI-assisted journal products.
Their public positioning demonstrates strong competition around historical
Replay, trade import, screenshots, tagging, journaling, dashboards, discipline
review, performance statistics, and AI summaries.

Relevant public entry points:

- [FX Replay](https://www.fxreplay.com/)
- [TradesViz](https://www.tradesviz.com/)
- [TradeZella](https://www.tradezella.com/)
- [TraderSync](https://tradersync.com/)
- [Edgewonk](https://edgewonk.com/)
- [Tradervue](https://www.tradervue.com/)

Market implication: “Replay plus journal plus AI commentary” is already a
crowded description. V7 would need evidence semantics and reproducibility, not
feature-count parity, to justify a distinct position.

### Chart-AI And SMC Screenshot Analysis

The survey also found products marketed around chart-image upload, pattern or
SMC/ICT analysis, setup grading, signal generation, and conversational chart
feedback. Representative names encountered included Tradelix, SnapPChart,
TradeFlow AI, and The Chart Grader.

Market implication: image-first analysis can provide quick feedback and low
onboarding friction. Its common public interface does not establish the exact
Bar-level, no-future, versioned semantic evidence graph required by the V7
research direction. V7 should not claim those products cannot do more than
their public materials show; it should state positively what its own exported
evidence guarantees.

### General Annotation And Data-Factory Platforms

Representative platforms included:

- [Label Studio](https://labelstud.io/)
- [Labelbox](https://labelbox.com/)
- [Argilla](https://argilla.io/)
- [V7 Darwin](https://www.v7labs.com/darwin)

These products demonstrate mature patterns for labeling workflows, review,
ontology/schema management, active learning, model-assisted labeling, dataset
management, and team operations. They are important design and integration
references. Their generality is also a boundary: V7's candidate advantage is a
native trading evidence model over Replay-visible Bars and semantic relations,
not a better general image/text/video labeler.

The company/product name “V7” is already strongly associated with V7 Labs in
the data-labeling market. Repository version `v7` can remain an engineering
identifier, but any commercialization should perform a separate brand and
trademark review and likely use a distinctive public product name. This is an
open recommendation, not an accepted renaming decision.

### Institutional Machine-Readable Financial Semantics

Representative providers included:

- [LSEG MarketPsych](https://www.lseg.com/en/data-analytics/financial-data/marketpsych)
- [RavenPack](https://www.ravenpack.com/)
- [S&P Global Kensho](https://www.spglobal.com/market-intelligence/en/solutions/kensho)

They demonstrate an established market for machine-readable financial
sentiment, events, entities, and alternative-data analytics. Their primary
public buyer and data shape are different from V7's discretionary trader
annotating exact chart evidence. They nevertheless show that provenance,
taxonomy, time alignment, delivery rights, and enterprise-grade data quality
are part of the competitive standard when a product calls its output a
financial dataset.

## Competitive Inference

As of the survey date, no reviewed public product documentation described the
complete V7 chain as one user-owned workflow:

```text
historical Replay
  -> exact-Bar geometry and typed semantic annotation
  -> evidence relations and no-future provenance
  -> Setup/Outcome definitions and Study Cases
  -> immutable Study Cohorts
  -> versioned, exportable training/evaluation dataset packages
```

This is an inference from reviewed public material, not a claim that no
company anywhere has similar private technology. The practical conclusion is
not “there are no competitors.” Competition can enter from four directions:

1. journals and Replay products can deepen their semantic evidence model;
2. chart-AI products can retain structured source data instead of screenshots;
3. general annotation platforms can add a financial chart ontology and custom
   front end;
4. institutional data providers can package richer technical-market labels.

V7's opportunity is the intersection, while its risk is being out-distributed
by a strong product in any one adjacent category.

## Candidate Differentiation

The strongest candidate differentiation discussed was not an indicator or a
single model. It was the combined evidence contract:

- canonical market-coordinate anchors rather than screenshot-only labels;
- typed semantic entities and relations rather than flat tags;
- mandatory observation cutoff and separation from later outcomes;
- versioned ontology, parameters, overrides, and reviewer actions;
- positive, negative, near-miss, ambiguous, and disagreement records;
- deterministic case/cohort statistics with raw-context drilldown;
- reproducible dataset splits and model/evaluation lineage;
- user-controlled export and replaceable AI/model providers;
- AI prelabeling which never silently becomes human-accepted truth.

The product would help a trader answer three different questions with evidence:

1. Does the Setup definition show an edge in the declared universe?
2. Did I recognize and label the Setup consistently?
3. Did my execution follow the accepted plan and risk rules?

Collapsing those questions into one win rate or one AI score would destroy the
core value proposition.

## AI And Open-Model Discussion

The discussion concluded that an open model can be used, but “fine-tune a day-
trading expert” is too broad a first target. A useful domain system would need
several layers:

- a base language/vision or multimodal model;
- retrieval over private definitions, cases, and accepted evidence;
- deterministic tools for Bars, statistics, cohort selection, and validation;
- supervised examples for bounded tasks such as artifact classification,
  relation extraction, evidence audit, or critique;
- preference data for ranking evidence-linked explanations;
- blind evaluation cases separated from training and discovery cohorts;
- explicit abstention and human review for ambiguous discretionary labels.

An open model can reduce provider dependency and support private/local use, but
it does not remove data-quality, compute, evaluation, security, or licensing
costs. Fine-tuning should be considered only after a bounded task and blind
evaluation show that retrieval plus deterministic tools and prompting are
insufficient.

The candidate flywheel is:

```text
Replay and human semantic review
  -> accepted annotation records
  -> reproducible dataset package
  -> model/prelabel/evaluation run
  -> disagreement and hard-case queue
  -> better human-reviewed evidence
```

The flywheel is valuable even if no model is ever trained: it still improves
research quality, consistency, and auditability.

## Commercialization Discussion

### Why Someone Could Pay When The Core Is Open Source

Possible reasons discussed, none yet accepted:

- a hosted service avoids deployment, upgrades, backups, monitoring, and model
  serving;
- cross-device/team workflows need identity, permissions, review queues,
  shared definitions, and durable synchronization;
- managed private AI and reproducible evaluation require compute and operator
  expertise;
- broker/data integrations, compliance controls, support, and service-level
  commitments have continuing operational value;
- curated private organization templates and governed collaboration can be
  more valuable than access to source code;
- enterprises may pay for on-premises support, security review, migration, and
  long-term maintenance.

Open source can create trust, local-first adoption, extensibility, and a lower-
risk exit path for users. It does not automatically create a hosted customer
base. A commercial service still needs a clear operational advantage and a
user group whose recurring problem is costly enough to pay for.

### Market-Data Cost As A Major Obstacle

The user identified licensed, redistributable market data as a probable major
barrier for a SaaS covering index futures, commodity futures, FX, and crypto.
The concern is accepted as a serious constraint but not yet quantified into a
business decision:

- professional/non-professional status and exchange agreements vary;
- real-time, delayed, historical, display, non-display, derived-data, and
  redistribution rights are separate products;
- exchange, vendor, symbol, geography, and subscriber reporting can change
  both cost and operational burden;
- a multi-asset bundled SaaS can incur costs before it has enough sticky users;
- three months of data, hosting, support, and compliance runway may be hard to
  fund for an unproven product.

The candidate low-risk path is therefore bring-your-own-data/local-first first,
with software producing private user-owned evidence. Hosted data entitlement,
vendor partnerships, or redistribution should be evaluated only against a
measured cohort of retained users and written vendor terms. Semantic labels do
not automatically escape the license of the underlying raw Bars, images, or
derived data.

### Candidate Commercial Paths

The discussion left several paths open:

1. **Open-source local workstation only.** Lowest rights and service burden;
   sustainability may rely on sponsorship or consulting.
2. **Hosted control plane / private sync.** Users provide or authorize data;
   the service sells operations, collaboration, backup, and private AI.
3. **Managed self-hosting or enterprise support.** Organizations retain data
   and deployment control while paying for support and governance.
4. **Commercial semantic packages or research workflow packs.** Requires clear
   licensing and must not turn one disputed trading interpretation into hidden
   core truth.
5. **Opt-in shared benchmark or data cooperative.** Potential network effects,
   but requires consent, contributor rights, privacy, quality weighting,
   deduplication, source-data licensing, and governance.
6. **Dataset marketplace.** Highest potential scope and highest legal,
   integrity, incentive, moderation, and cold-start risk; not a near-term
   assumption.

No path is selected. In particular, open-sourcing the application is not
permission to pool user annotations or licensed chart data.

## Alternatives Considered And Current Disposition

| Alternative | Current disposition | Reason retained or not selected |
| --- | --- | --- |
| another Replay/journal SaaS | not selected as defining position | crowded; does not by itself solve evidence quality |
| screenshot-first AI grader | useful optional surface, not source truth | fast onboarding but weak canonical provenance |
| automatic SMC signal product | not selected | disputed semantics and automation risk obscure validation |
| general-purpose annotation SaaS | not selected | conflicts with SMC/ICT focus and product ownership |
| proprietary “trading expert” model | not selected as moat | model is replaceable and hard to audit without evidence |
| institutional financial-data vendor | not selected | rights, capital, buyer, and distribution model differ |
| local-first evidence dataset workstation | promoted by `ADR-V7-003` | strengthens both human validation and future AI use |
| hosted/private/team service | open | requires retained users, security, identity, and operating economics |
| public pooled dataset/marketplace | open and high-risk | unresolved consent, rights, quality, and governance |

## Conflicts And Dependencies

### With `MEMO-V7-001`

The general plugin-platform memo considers distribution and a marketplace.
This memo does not require either. The accepted semantic packages are an
architecture boundary; they are not yet a third-party commercial ecosystem.

### With `MEMO-V7-002`

An evidence-grade minute-based dataset is useful without seconds/ticks. A
future second-level product may improve simulated-live analysis, but would add
data cost, compute, storage, leakage, and resolution-provenance requirements.
It cannot be used as a prerequisite for the current product position.

### With `MEMO-V7-003`

This memo supplies a candidate durable product output for the Research,
Training, and Trading Review loops. It does not decide whether those loops are
one module, multiple modules, first-party workflows, plugins, or Agent tools;
nor does it decide Agent autonomy or longitudinal coaching policy.

### With `ADR-V7-001`

Semantic datasets must reference the accepted `SemanticArtifact` and
`DrawingEntity` model rather than introduce a parallel tag store. FVG remains
a semantic artifact with evidence and projections, not a rectangle label in a
training-only schema.

## Evidence Required Before A Commercial Decision

- repeated evidence that target users complete annotation/review rather than
  only opening Replay;
- retention and cohort evidence showing the problem recurs often enough to
  justify a subscription or support contract;
- interviews which distinguish willingness to pay for hosting, sync, team
  review, private AI, support, or data access;
- measured annotation time and the improvement from deterministic/AI prelabels;
- dataset quality measures: agreement, ambiguity, correction, leakage,
  definition drift, and blind evaluation performance;
- written quotes and rights matrices from candidate market-data vendors for
  the exact display/non-display/historical/redistribution use;
- realistic hosting, storage, egress, model inference/training, support,
  security, and compliance costs;
- a brand/trademark and public-name review;
- a privacy, contributor-license, deletion, export, and model-training consent
  design before any multi-user or pooled data path;
- proof that the commercial layer can be removed without making local user data
  unreadable or non-exportable.

## What Would Change The Current Position

- strong evidence that users value Replay but will not create structured
  evidence may shift priority toward friction reduction or automated prelabels;
- a competitor publicly delivering the complete exact-Bar semantic-case-to-
  dataset chain may narrow the differentiation claim;
- unaffordable data rights may permanently favor bring-your-own-data and
  managed self-hosting over a bundled-data SaaS;
- poor expert agreement on important semantic types may favor storing multiple
  interpretations and confidence rather than one gold label;
- blind evaluation showing no benefit from domain-specific data may defer
  fine-tuning in favor of retrieval and deterministic tools;
- proven team/institution demand may justify identity, review workflow, and
  private deployment before consumer SaaS.

## Promotion Checklist For Remaining Questions

Before promoting any unresolved commercial or shared-data position:

- [ ] identify the paying user and recurring job-to-be-done;
- [ ] choose one delivery model and document its removal/exit path;
- [ ] quantify exact market-data and infrastructure rights/costs;
- [ ] define user-data ownership, export, deletion, privacy, and training
  consent;
- [ ] define human/AI responsibility and evaluation gates;
- [ ] select a public brand only after conflict and trademark review;
- [ ] reconcile plugin, seconds/tick, and Agent-system memo dependencies;
- [ ] write a separate accepted ADR with explicit non-goals;
- [ ] allocate a delivery id only after that ADR is accepted.

## Position History

- **2026-08-09 — initial commercial question.** Commercialization should not
  proceed without a convincing user pain point and paying user.
- **2026-08-09 — pain point clarified.** The strongest problem is the inability
  to separate strategy edge, Setup recognition, and execution discipline from
  screenshots and unstructured journals.
- **2026-08-09 — open-source/SaaS discussion.** Hosting, operations,
  collaboration, private AI, support, and governance may be chargeable even
  when local core software is open, but no business model was selected.
- **2026-08-09 — data-economics concern.** Redistributable multi-asset data may
  be the largest early SaaS barrier; bring-your-own-data/local-first remains the
  lower-risk candidate.
- **2026-08-09 — AI discussion.** Open models and fine-tuning are feasible only
  as bounded, evaluated consumers of high-quality evidence; the model is not
  the source of truth.
- **2026-08-09 — output insight.** V7 can produce its own user-reviewed semantic
  annotation data as a valuable product output even without model training.
- **2026-08-09 — competitive survey.** Adjacent products are numerous, but the
  reviewed public material did not document the complete Replay-to-versioned-
  evidence-dataset chain as one user-owned workflow.
- **2026-08-09 — partial promotion.** `ADR-V7-003` accepts the evidence-grade
  semantic dataset product position and invariants. All commercial, hosted,
  pooled-data, branding, and implementation questions above remain open.
