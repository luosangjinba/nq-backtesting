# V7 Evidence-Grade Semantic Dataset Product Output

Decision id: `ADR-V7-003`

Status: accepted binding product decision

Date: 2026-08-09 PDT

Decided by: product owner

## Decision Summary

V7 will treat a user-owned, AI-ready semantic annotation dataset as a
first-class product output of the existing validation and Replay workstation.
The product position is:

> an evidence-grade semantic dataset production workstation for discretionary
> trading research

This position extends, rather than replaces, the accepted local-first SMC/ICT
validation product. Historical Replay remains the primary controlled
observation environment. Drawing and Semantic Annotation provide the evidence
substrate. Research, Training, and Trading Review may later consume the same
evidence, but do not gain ownership of Replay, Chart, Bar Data, Annotation, or
the source dataset.

V7 is therefore not positioned merely as another trade journal, Replay
player, chart-screenshot grader, automatic FVG indicator, generic labeling
platform, or financial-data vendor. Its differentiating output is structured,
versioned evidence which can be traced back to the exact chart and market-data
context in which a human observation was made.

## Accepted Product Outcome

Validation remains the user outcome. The accepted additional output is a
portable body of semantic evidence which can support:

- deterministic personal research and comparison of Setup hypotheses;
- reproducible Study Cases and frozen Study Cohorts;
- deliberate-practice and Trading Review evidence;
- supervised fine-tuning, preference data, retrieval, and evaluation sets for
  replaceable AI models or agents;
- human and machine audits which drill every conclusion back to raw chart
  context.

Annotation quantity alone is not the product outcome. A dataset is valuable
only when its meaning, observation boundary, provenance, revision, and source
rights are explicit enough for another person or process to reproduce what the
record claims.

## Accepted Data Pipeline

The conceptual pipeline is binding even though executable dataset schemas are
deferred:

```text
accepted market evidence
  -> DrawingEntity / SemanticArtifact records
  -> typed relations and Study Case references
  -> Dataset Builder selection and transformation
  -> versioned Annotation Dataset Package
  -> deterministic analytics and/or replaceable AI consumer
```

The Annotation Document is not silently redefined as a model-training file.
It remains the source record owned by the Annotation Runtime. A later Dataset
Builder must read immutable revisions through explicit contracts and produce a
separate package with its own manifest, split policy, lineage, and hashes. It
must not mutate source annotations to satisfy one model format.

The public contract names for the Dataset Builder, package schema, split
manifest, and export adapters are not selected by this decision.

## Binding Evidence Invariants

Every later dataset-producing implementation must preserve all of the
following:

1. **Exact market anchors.** Evidence is anchored to canonical instrument,
   timestamp, price, Bar/data revision, and relevant Pane/Session context; a
   screenshot may be an export but is not authoritative evidence.
2. **Typed entities and relations.** FVG, BSL, liquidity sweep, displacement,
   mitigation, contradiction, and similar claims use versioned semantic types
   and relations rather than flat strings or presentation colors.
3. **No-future observation boundary.** The accepted Replay cutoff or
   equivalent `visibleThrough` boundary is retained so later outcome Bars
   cannot leak into decision-time evidence.
4. **Epistemic separation.** Observation, Interpretation, Decision, and
   Outcome remain distinguishable. A later result cannot be rewritten as
   something the user knew at the time.
5. **Versioned meaning.** Ontology/type-package version, parameter definition,
   overrides, reviewer action, and evidence revision are retained. A label
   whose meaning changed is a new revision, not silent drift.
6. **Traceable aggregation.** A metric, finding, case, cohort, or training row
   can drill down to the exact accepted source evidence and raw chart context.
7. **Reproducible packaging.** A later Dataset Builder records inclusion and
   exclusion policy, source revisions, transformation version, hashes, and
   deterministic train/validation/blind/preference split identity where used.
8. **User ownership and portability.** The user can export their records in a
   documented, non-provider-exclusive form. Hosting or AI integration must not
   make the only usable copy proprietary to one service.
9. **Human acceptance of gold labels.** AI and deterministic detectors may
   prelabel, retrieve, prioritize, or identify inconsistencies. Their output
   becomes accepted evidence only through an explicit attributable human
   action or a separately approved deterministic policy; model confidence is
   not ground truth.
10. **Evidence-linked AI output.** An AI finding, critique, recommendation, or
    proposed definition must cite the records and versions that support and
    contradict it. Unsupported narrative is advisory text, not research
    evidence.

## Ownership And Modularity

The existing V7 owner rules remain binding:

- only Bar Data Runtime requests and caches Bars;
- only Replay Runtime owns cursor and reveal state;
- only Chart Runtime writes Chart surfaces;
- only Annotation Runtime writes accepted Drawing/Semantic Annotation state;
- a future Research or Dataset module references immutable source records and
  owns only its own cases, cohorts, manifests, transformations, or exports;
- AI providers and model runtimes are adapters behind replaceable contracts;
- semantic types remain removable packages and cannot gain direct Chart,
  Replay, Bar Data, persistence, or unrelated feature-module authority.

No route, AI adapter, export adapter, or semantic package may become a second
annotation store. Model-ready representations are derived packages or caches,
not a new source of truth.

## Human And AI Boundary

Domain expertise is part of dataset quality. AI can reduce the cost of finding
candidates and checking consistency, but it cannot silently settle ambiguous
SMC/ICT interpretation, define outcomes after seeing the result, or turn a
large weakly reviewed corpus into evidence-grade truth.

The preferred future workflow is human-governed active labeling:

```text
human definition
  -> deterministic/AI candidate or prelabel
  -> evidence-linked human review
  -> accepted/rejected/ambiguous record
  -> versioned quality and disagreement evidence
```

Disagreement, ambiguity, rejection reason, and reviewer confidence are useful
dataset evidence and should not be discarded merely to force one clean label.
The underlying model is replaceable; the durable product value lies in the
evidence graph, provenance, review history, and reproducible evaluation.

## Data Rights And Distribution Boundary

V7 may create value without buying and redistributing a global market-data
catalog. The near-term boundary is software plus private, user-controlled
dataset production over data the user is authorized to use.

Every export capable of leaving the local workspace must be able to retain:

- market-data source and dataset/revision identity;
- source resolution and observation window;
- license or rights metadata known to V7;
- whether raw Bars, derived coordinates, images, features, or semantic labels
  are included;
- author/reviewer provenance and permitted distribution scope when available.

Open-source software does not grant redistribution rights to vendor market
data. A public pooled corpus, benchmark, marketplace, or hosted dataset must
not be inferred from this decision. It requires a separate rights model,
explicit contributor consent, privacy policy, licensing review, and accepted
product decision.

## Selected And Rejected Positions

Selected:

- validation and Replay remain the product foundation;
- structured semantic evidence becomes a first-class portable output;
- model-ready datasets are reproducible derivations from accepted source
  evidence;
- AI assists under explicit provenance and human governance;
- local-first/private use is the safe initial distribution boundary.

Rejected as the defining V7 position:

- a screenshot-first AI chart grader whose source truth is pixels;
- a journal which stores prose/tags without exact market evidence;
- a generic horizontal labeling platform competing on arbitrary media types;
- an automated signal product presenting semantic detection as trading truth;
- a proprietary model or aggregated market-data feed as the core moat;
- silent aggregation or resale of user labels and licensed Bars.

These rejections concern product identity and ownership. They do not prohibit
screenshots, Journal views, detector suggestions, compatible export formats,
or optional hosted services when those features obey this decision.

## Relationship To Existing Records

- `ADR-V7-001` supplies the accepted Drawing/Semantic Annotation terminology,
  plugin boundary, evidence provenance, and sole-writer ownership this decision
  consumes.
- `ADR-V7-002` allows reviewed Primitive implementation patterns without
  importing a second drawing owner; it does not determine dataset semantics.
- `MEMO-V7-003` is partially promoted: its exact semantic cases, immutable
  cohorts, deterministic metrics, no-future evidence, and evidence-linked
  Agent outputs are accepted as product-direction constraints. Its complete
  Research/Training/Trading Review system shape, Agent autonomy, module split,
  provider, and business model remain unresolved.
- `MEMO-V7-004` preserves the competitive-landscape discussion, alternative
  positions, branding risk, commercial paths, and unresolved market questions
  which informed this decision but were not themselves decided.
- `MEMO-V7-001` remains open for broader futures-product scope, Setup/AI,
  concrete plugin runtime/SDK, remote distribution, commercialization, and
  Marketplace. Later ADR-V7-004 partially promotes its Core/Community taxonomy
  and phased platform direction; this ADR itself accepts only the existing
  removable semantic-package principle, not that broader platform plan.

## Explicit Non-Authorization Boundary

This decision allocates no delivery number and authorizes no production code.
It does not authorize:

- a Dataset Builder, dataset schema, export UI, or training pipeline;
- an LLM, local model, hosted AI provider, fine-tuning job, or coding Agent;
- a Research, Training, Trading Review, Journal, campaign, or detector module;
- accounts, teams, collaboration, cloud synchronization, or a hosted SaaS;
- a public/shared dataset, benchmark, marketplace, label exchange, or data
  resale;
- automatic semantic truth, autonomous trading, execution, or financial
  advice;
- a new R13 implementation step or changes to the pending R13.6 human gate.

Each capability requires a separately bounded contract, ownership audit,
privacy/security and data-rights review where applicable, executable evidence,
and explicit user authorization.

## Acceptance Record

The product owner accepted the final position on 2026-08-09: V7's structured,
evidence-grade semantic annotation data is a first-class product output and the
foundation for future AI-assisted Research, Training, and Trading Review. The
discussion and still-open alternatives remain in `MEMO-V7-004` rather than
being converted into hidden roadmap commitments.
