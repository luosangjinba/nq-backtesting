# V6 First Validation Vertical Slice Plan — Step 461

Status: accepted delivery order (2026-07-15)

## Outcome

The first post-foundation product delivery is one traceable Validation Campaign
loop on the existing Replay workstation:

`playbook version -> campaign -> blind trial -> generic observation + trade plan -> outcome/R -> result drillback`

This is the smallest slice that tests the current product direction. It also
creates reusable bricks for Free Practice and future mode policies without
building three mode shells first.

## Delivery Rules

- Preserve current low-ceremony Replay behavior; campaign fields are required
  only inside the validation workflow.
- Establish the owning domain and public interface before adding UI behavior.
- Keep artifacts distinct and link them by stable ids.
- Capture prospective evidence from Replay's published cursor/no-future state;
  never read hidden bars through a feature shortcut.
- Keep the first observation generic. Semantic Drawing plugins and chart
  overlays remain outside this sequence until their unresolved contracts close.
- Use migration-backed local persistence with transactions/indexes for durable
  artifacts; JSON remains import/export only.
- Every aggregate must drill back to its source trial and evidence.
- Do not claim tick-accurate execution from the current `1m` dataset.

## Entry Gate

Step 462 restored the repeated Manual Next/leftward-history latency regression
without weakening the 160 ms threshold or changing Replay truth. The product
sequence may now enter Step 463.

## Ordered Steps

### Step 462 — Restore Replay/History Latency Gate

Diagnose the repeated 219.2 ms / 188.3 ms Manual Next failures in the canonical
Replay/leftward-history concurrency gate. Fix only the owning hot path, retain
the 160 ms limit, and rerun the full canonical suite.

Status: complete; focused samples 55.9–99.0 ms and canonical 14/14.

### Step 463 — Validation Domain Spine

Define minimal versioned contracts, lifecycle invariants, repository interface,
and migration-backed local persistence for `playbookVersion`,
`validationCampaign`, and `trial`.

Gate:

- create/get/list round trips survive repository reload;
- a campaign references an immutable playbook version;
- a trial references one campaign and has explicit lifecycle state;
- domain/repository code has no DOM, chart-engine, Replay implementation, or
  market-bar API import;
- no production UI is added.

Status: complete. The three artifacts now have pure constructors/transitions,
an async repository, versioned IndexedDB schema/migration, transactional
reference checks, and reload coverage without UI or Replay implementation
coupling.

### Step 464 — Blind Trial Coordinator

Add a thin coordinator that starts/resumes a trial through commands/events and
captures the Replay session/cursor/visible-through references exposed by public
contracts. It must not own or mutate Replay state directly.

### Step 465 — Generic Observation And Evidence Snapshot

Persist one text/category observation plus canonical time-price/pane/timeframe
references and provenance. Use a non-overlay UI first if that is the smallest
honest surface; do not enable Semantic Drawing writes.

### Step 466 — Prospective Trade Plan

Record direction, entry, stop, target, and invalidation separately from the
observation. Commit the pre-result revision and distinguish later review edits.

### Step 467 — Simulated Outcome And R

Record execution/outcome facts separately, calculate bounded `R`, and disclose
the ambiguity of within-minute stop/target ordering.

### Step 468 — Summary And Evidence Drillback

Show one small campaign summary and navigate a result back to its original
trial/evidence context through public navigation contracts.

### Step 469 — Trial Acceptance

Run focused regression packs and human use on real trials. Semantic vocabulary,
plugin UI, and broader analytics may be reconsidered only after the thin loop
demonstrates trustworthy provenance and low recording friction.

## Not In This Sequence

- separate God View, Pseudo-Live, or Live Reproduction workspaces;
- Semantic Drawing UI, geometry editing, plugin loading, or an ICT ontology;
- generic TradingView drawing tools;
- automatic FVG/OB/sweep detection or AI analysis;
- a large analytics dashboard;
- broker connectivity, live market ingestion, or tick-data infrastructure;
- unrelated Settings, indicator, or workstation parity work.

## Authorization Boundary

Steps 462-463 completed the bounded foundation repair and validation domain
spine. Step 464 is now the next authorized target. This does not pre-authorize
product Steps 465-469: each Step requires focused inspection, verification,
and an independent commit, and may revise later detail without breaking the
accepted product/ownership invariants.
