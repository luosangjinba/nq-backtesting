# V7 R13.9a Stage Architecture Review

Status: review complete; three blocking preconditions recorded; no production
behavior changed

Date: 2026-08-09

Reviewed baseline: `38c5c106` (`R13.9` accepted)

## Purpose

This checkpoint reapplies V7's modularity and decoupling standard after the
first complete Annotation path:

```text
Geometry
  -> Annotation Runtime
  -> Chart Projection
  -> Interaction
  -> Persistence
  -> Context Projection
  -> Semantic Package Registry
  -> first-party Liquidity Level package
```

The review is evidence-only. It does not add a business feature, rewrite the
accepted BSL/SSL behavior, or authorize R13.10. A finding is `BLOCKING` only
when copying the current contract into a second semantic package would make
meaning non-portable, non-reproducible, or lifecycle-unsafe. `DEBT` records a
bounded growth risk whose current behavior and ownership remain correct.

## Automated Baseline

The repository gates pass without an accepted exception:

- production architecture: 59 modules, 131 dependency edges, 115 construction
  sites, 23 writer sites, zero blocking analyzer findings, and 15 negative
  controls;
- architecture hardening: 107 rules and 15 negative controls;
- module assembly: 59 public entries, 24 lifecycle modules, and 21 optional-
  removal cases;
- writer closure: 18 declared surfaces, 23 observed writer files, and eight
  negative controls;
- source quality: 403 files, 32,280 effective lines, 3,395 functions, and 384 public exports, with 22 negative controls;
- H107: 22 negative controls including real-Chromium no-future evidence.

These gates prove the declared graph and existing behavior. They do not by
themselves prove that a second package can express richer provenance or that
asynchronous cleanup cannot overlap a new package generation; those questions
required the manual probes below.

## Passing Boundaries

### PASS-1 — Business ids stay package-local

`liquidity.bsl`, `liquidity.ssl`, BSL/SSL labels, and their tool ids occur only
inside `optional.semantic-liquidity-level`. Annotation Runtime, persistence,
Chart, Replay, Bar Data, context projection, and the Registry contain no
concrete liquidity branch.

### PASS-2 — Owner and writer closure remains intact

`optional.annotation-runtime` is the only Annotation Document writer;
`adapter.annotation-persistence` is the only Annotation byte writer; and
Chart primitives remain inside the Chart-owned projection adapter. Semantic
packages receive none of those owner handles.

### PASS-3 — Optional removal is real

Zero-package boot, missing/disabled/failed package behavior, unresolved
Artifact retention, independent module Harnesses, and all 21 assembly-removal
cases pass. Removing semantic packages does not remove generic Drawing,
Replay, or Chart behavior.

### PASS-4 — Dependency direction is one way

The first-party package imports only the Semantic Registry public entry and
receives Geometry through an explicit composition port. Registry and Runtime
communicate through the injected draft-reading contract. There is no package
import from core Chart/Replay/Bar Data/Workspace owners and no owner-internal
cross-module import.

### PASS-5 — UI and vendor authority stays out of business packages

Static inspection found no DOM, Canvas, Lightweight Charts, storage, fetch,
WebSocket, or database access in Semantic Registry or Liquidity Level code.
The package emits portable projection inputs and Inspector schemas; the host
retains rendering and interaction ownership.

### PASS-6 — Current no-future and failure isolation behavior is valid

The accepted BSL/SSL slice hides both projection and Inspector meaning before
its observation cutoff, restores them afterward, and leaves candles unchanged.
A policy crash withdraws only the failed package's definitions; other packages
and generic Annotation remain usable.

## Blocking Findings

### BLOCKING-1 — Core provenance is the first package's schema

`annotation-runtime/semantic-artifact.js` requires one exact provenance field
set containing `manualAnchors` and `sourceBars`. `annotation-persistence/
annotation-wire.js` repeats the same set as its canonical known fields. A
trusted second package cannot add the R13.1-required definition/profile
identity, detector identity, per-attribute baseline/effective source, override
provenance, or creator namespace: Runtime rejects the otherwise portable draft
with `SEMANTIC_ARTIFACT_PROVENANCE_INVALID`.

The review reproduced this by registering a valid independent type whose
provenance added only `definitionProfile`; Registry construction succeeded and
the sole Runtime writer rejected the draft. This is a core-schema dependency
on the first business slice, even though no concrete BSL/SSL string appears in
core.

Impact: R13.10 FVG cannot satisfy ADR-V7-001's reproducible definition and
parameter-provenance contract without putting business evidence into an
unrelated field or editing core for every package.

### BLOCKING-2 — Construction package identity is discarded

Registry drafts carry `packageId` and package generation, but
`annotation-runtime/semantic-port.js` drops them while creating the stored
Artifact. The durable Artifact contains `typeId` and `typeVersion` but no
construction `packageId`, `packageVersion`, definition/profile identity, or
equivalent immutable reference.

The review created an Artifact under package version `1.0.0`, then resolved the
unchanged Artifact with a replacement manifest at `2.0.0`. Because the stored
Artifact had no construction identity, Registry reported it as resolved by
`2.0.0`. Inspector therefore describes the currently installed package rather
than proving which package meaning produced the evidence.

Impact: semantic datasets, research statistics, revalidation, and AI exports
would not be reproducible across a package upgrade even when the type version
was accidentally left unchanged.

### BLOCKING-3 — Policy-failure cleanup can overlap re-enable

Synchronous construction/projection/Inspector policy failure calls
`SemanticPackageRegistry.#failPolicySync`. It marks the record failed and
starts `instance.dispose()` in an untracked Promise. No Registry lifecycle
operation remains active while that asynchronous cleanup runs.

The review used a delayed disposer and reproduced this order:

```text
activate-1
dispose-start-1
activate-2
dispose-end-1
```

Impact: a stateful future package can have two generations alive together, and
late cleanup from the failed generation may release resources used by the new
generation. This contradicts deterministic disable/re-enable and lifecycle
isolation even though the current stateless Liquidity package is unaffected.

## Non-Blocking Debt And Split Triggers

### DEBT-1 — Three files are near the source-policy ceiling

- `annotation-chart-projection/lightweight-annotation-interaction-port.js`:
  387 effective lines;
- `annotation-persistence/annotation-wire.js`: 384 effective lines;
- `annotation-semantic-registry/semantic-package-registry.js`: 364 effective
  lines.

Their current functions remain bounded and their responsibilities are still
cohesive. No size exception is required. Before adding another gesture family,
persistence migration/entity family, or Registry lifecycle capability,
respectively split the relevant internal boundary instead of extending the
same file.

### DEBT-2 — Portable-value validation is intentionally duplicated but may drift

Geometry, Semantic Registry, and Annotation Runtime each protect their own
portable-value boundary. This currently avoids owner-internal imports and the
behaviors agree. If R13.9 remediation changes the Semantic Artifact envelope,
decide explicitly whether to retain boundary-local validators or introduce one
small pure shared contract; do not solve duplication by importing another
state owner's internals.

## Required Remediation Before R13.10

The review recommends one separately authorized `R13.9b Semantic Contract
Hardening` step before Evidence Resolver or FVG work. Its binding specification
must settle, at minimum:

1. a host-owned universal provenance header plus one first-class portable
   package evidence/definition payload, rather than a BSL-shaped exact record;
2. immutable construction identity covering package, type, definition/profile,
   detector when applicable, and their exact versions;
3. a migration and unresolved round trip in which package-owned provenance is
   available again to the compatible package, not hidden only in the adapter's
   opaque sidecar;
4. tracked policy-failure cleanup which blocks or rejects re-enable until the
   failed generation has completed disposal;
5. a second synthetic package Harness proving richer provenance, version-
   stable resolution, reload/import/export, absent-package survival, and no
   lifecycle overlap;
6. focused internal splits for Registry lifecycle and Artifact wire codecs if
   the remediation would otherwise extend the three growth hotspots.

R13.9 and H107 remain accepted because their bounded BSL/SSL behavior satisfies
their contract. R13.10 remains unauthorized and blocked on the separately
specified and accepted remediation above.
