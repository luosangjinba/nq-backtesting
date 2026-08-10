# V7 R13.9b Semantic Contract Hardening

Status: implementation authorized; binding contract

Date: 2026-08-09

Depends on: accepted R13.9 and completed R13.9a architecture review

## Purpose

R13.9b repairs the three extension blockers found by the R13.9a review before
another business semantic package is introduced. It changes no visible drawing
interaction, adds no FVG/evidence resolver, and does not authorize R13.10.

The bounded outcome is a package-neutral, reproducible Semantic Artifact
envelope plus serialized package-generation cleanup. A second synthetic package
must be able to carry richer evidence without editing Annotation core.

## Ownership

- Annotation Runtime remains the sole accepted Artifact/document writer.
- Semantic Package Registry owns package/type activation, construction draft
  branding, exact compatibility resolution, and lifecycle serialization.
- Annotation Persistence owns document-schema migration and opaque wire-field
  preservation.
- A semantic package owns only its definition policies and its portable
  `packageProvenance` payload. It receives no Runtime, Chart, Replay, Bar Data,
  DOM, storage, or network owner handle.

## Semantic Artifact Schema 2

Every newly accepted Artifact stores one host-stamped construction identity:

```text
definition {
  status: "recorded"
  packageId
  packageVersion
  definitionId
  definitionVersion
}
```

`packageId` and `packageVersion` come from the active package manifest.
`definitionId` and `definitionVersion` come from the registered branded type
definition. A package construction result cannot supply or override them.

The universal provenance header remains host validated:

```text
provenance {
  constructionSource
  createdAtEpochMs
  instrumentId
  manualAnchors[]
  observedAtReplayCutoffEpochMs
  packageProvenance
  promotedFromDrawingId
  recognitionSource
  sourceBars[]
  sourceTimeframeId
}
```

`manualAnchors` and `sourceBars` are universal evidence categories and retain
their exact no-future validation. `packageProvenance` is one deeply immutable,
plain, JSON-portable package evidence record. It may contain definition/profile,
detector, creator namespace, parameter baseline/effective/override provenance,
or other package-owned evidence. Core validates portability but never branches
on its keys.

Artifact `typeId`/`typeVersion` continue to identify the semantic type contract;
the separate `definition` identity proves which implementation meaning created
the immutable evidence.

## Exact Resolution

An Artifact is resolved only when all of these match the active registration:

- `typeId` and `typeVersion`;
- `definition.packageId` and package manifest version;
- `definition.definitionId` and definition version;
- `definition.status === "recorded"`.

A package upgrade that leaves `typeVersion` unchanged cannot silently claim an
older Artifact. Mismatch, disabled/missing package, or legacy-unrecorded
identity stays preserved and read-only with no type-specific projection or
resolved Inspector policy.

## Migration

Annotation Document schema advances from `1` to `2`. Persistence migrates a
schema-1 document before Runtime restoration:

- existing Artifact provenance gains `packageProvenance: {}` when absent;
- existing Artifacts without construction identity gain:

```text
definition {
  status: "legacy-unrecorded"
  packageId: null
  packageVersion: null
  definitionId: null
  definitionVersion: null
}
```

This migration does not invent historical identity. Such Artifacts remain
durable, exportable, inspectable as unresolved host records, and unavailable to
type-specific policies until an explicit future migration is authorized.

Repository-entry and export-envelope versions remain unchanged because the
nested Annotation Document is independently versioned. Unknown document,
Artifact, definition, provenance, presentation, and scope fields continue to
round-trip through the adapter-owned opaque sidecar.

## Lifecycle Serialization

A synchronous construct/project/inspect policy crash immediately withdraws the
failed package, invalidates its draft generation, and starts tracked disposal.
The Registry operation queue must await that failed-generation cleanup before
activating another generation of the same package. Cleanup failure fails the
next lifecycle operation closed; it is never hidden behind a successful
activation.

Registry disposal waits for all tracked failed-generation cleanup and active
package disposal before reaching `disposed`. At no point may two generations of
one package be live concurrently.

## Required Evidence — H108

The focused Harness must prove:

1. a second synthetic package carries nested definition/profile, detector, and
   per-attribute provenance through construct, Runtime acceptance, durable
   reload, export/import, disable, and re-enable;
2. package/definition construction identity is host stamped and immutable;
3. a same-type package or definition version replacement cannot resolve an
   older Artifact;
4. schema-1 migration preserves bytes truthfully as `legacy-unrecorded`, with
   package evidence available canonically rather than hidden in the opaque
   sidecar;
5. delayed failed-generation disposal completes before reactivation begins,
   and cleanup failure prevents activation;
6. the existing BSL/SSL H107 path and all architecture, writer, assembly,
   source-quality, persistence, and regression gates continue to pass.

R13.9b has no intended visual change and therefore needs no separate human
visual acceptance window.

## Explicit Non-Goals

- FVG, EQL/EQH, detector, Evidence Resolver, or automatic construction;
- public third-party package loading, permissions, signatures, Marketplace, or
  arbitrary package JavaScript;
- semantic editing, package migrations, or legacy Artifact reinterpretation;
- production toolbar, Inspector redesign, Chart behavior, or Replay changes;
- R13.10.
