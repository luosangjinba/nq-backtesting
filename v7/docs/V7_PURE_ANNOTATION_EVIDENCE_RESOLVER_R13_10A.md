# V7 R13.10a Pure Annotation Evidence Resolver

Status: accepted; H109 automated closure

Date: 2026-08-09

Depends on: accepted R13.8, R13.9, and R13.9b

## Purpose

R13.10a activates only the pure host-side boundary required before any FVG
workflow can select Bars or invoke a semantic package. It turns one supplied,
owner-accepted Session/Workspace/Pane/Replay snapshot plus one exact user
selection and one bounded requirement into an immutable `EvidenceBundle`.

This is deliberately separated from the former combined R13.10 candidate. It
adds no Bar Picker, FVG definition, Property Inspector control, semantic
override, Chart projection, browser UI, or production composition. Those
visible and business-specific concerns require later independently accepted
steps.

## Ownership And Module Boundary

`optional.annotation-evidence-resolver` is a removable, stateless module owned
by `annotation-evidence-resolver`.

- its sole required port is branded `core.session-identity`;
- it imports no Bar Data, Replay Runtime, Workspace Runtime, Annotation
  Runtime, semantic package, Chart, persistence, DOM, storage, or network
  owner;
- it owns no cache, provider, request queue, Replay cursor, mutable selection,
  accepted document, or lifecycle resource;
- composition is responsible for assembling an accepted snapshot from existing
  owner outputs and may separately request a new accepted snapshot before
  retrying;
- the resolver and every semantic package remain unable to pull missing Bars.

Removal therefore leaves Session, market data, Replay, Chart, generic Drawing,
and existing BSL/SSL behavior unchanged.

## Accepted Evidence Snapshot

The host creates one branded schema-1 snapshot with exact:

```text
sessionId
acceptedWorkspaceRevision
paneId
instrumentId
sourceTimeframeId
displayTimeframeId
datasetRevision
replayCutoffEpochMs
bars[]
artifacts[]
```

Every Bar contains exact start/end epochs and normalized OHLCV. Bars are
bounded to 20,000, ordered, unique, and non-overlapping. A displayed partial
tail Bar may exist in the snapshot because it is valid Pane presentation, but
it is not valid semantic evidence until its end epoch is at or before the
accepted Replay cutoff.

Every Artifact header contains only `artifactId`, exact positive `revision`,
and its observation cutoff. Artifact headers are bounded to 512 and unique by
id. Snapshot construction copies and freezes caller arrays and records; later
caller mutation cannot alter accepted evidence.

The snapshot is an ephemeral accepted-owner input, not a second market-data or
Annotation source of truth and not a persistence wire format.

## Selection And Requirement

The schema-1 exact selection contains:

```text
barStartEpochMs
artifactReferences[] { artifactId, revision }
```

R13.10a intentionally supports one selected Bar. R13.10b may later provide the
Chart interaction that produces that exact start epoch, but the resolver has no
pixel/logical-coordinate or UI concept.

The schema-1 bounded requirement contains:

```text
precedingBars             0..16
followingBars             0..16
maximumArtifactReferences 0..32
```

The resolved contiguous Bar window, including the selected Bar, cannot exceed
32 Bars. This mechanism is package-neutral: the later FVG definition can ask
for one preceding and one following Bar without adding `FVG` or another
business id to this module.

## Evidence Bundle

Successful resolution returns one branded deeply frozen schema-1 bundle with:

- branded Session identity, accepted Workspace revision, Pane id, and exact
  Replay cutoff;
- ordered Bar evidence with relative offsets around the selected Bar;
- immutable OHLCV values;
- exact Bar references carrying dataset revision, instrument, source and
  display timeframe ids, start/end epochs, and observation cutoff;
- selected Artifact references carrying exact id and revision.

The same accepted snapshot, selection, and requirement produce the same public
bundle. Resolution adds no wall-clock value, generated id, global sequence, or
environment-dependent field.

## Failure And No-Future Semantics

Resolution fails with stable `AnnotationEvidenceError` codes when:

- a public value is unbranded, malformed, unknown-field-bearing, or unbounded;
- the selected Bar or a required neighbor is absent;
- any required Bar is not fully closed by the accepted Replay cutoff;
- a selected Artifact is absent, has a different revision, is observed after
  the accepted cutoff, or exceeds the declared ceiling.

Protected invariant — no-future: a Bar with
`endEpochMs > replayCutoffEpochMs` and an Artifact with a later observation
cutoff are never returned. Failure emits no partial bundle and performs no
fallback request.

## H109 Evidence

The independent Harness proves:

1. an exact three-Bar neighborhood plus exact Artifact revision resolves with
   full dataset/instrument/source/display-timeframe/cutoff provenance;
2. identical inputs are deterministic and all returned nested values are
   frozen;
3. mutable input arrays/records cannot modify a branded accepted snapshot;
4. missing selected/preceding/following evidence fails without a request;
5. an unclosed confirming Bar and post-cutoff Artifact fail no-future checks;
6. missing, stale, duplicate, structural-lookalike, unknown-field, and
   unbounded inputs fail under 20 intentional negative controls;
7. production assembly imports the real public entry and boots with the
   optional module removed;
8. standing architecture, writer, hardening, and source-quality gates remain
   green.

There is no visual change and therefore no human acceptance window in
R13.10a.

## Explicit Non-Goals

- exact Bar picking, hover, selection handles, Chart gestures, or browser UI;
- FVG or any other business semantic type, detector, construction, or
  projection;
- Property Inspector evidence display, baseline/effective-source badges, or
  overrides;
- automatic neighbor acquisition, history extension, provider access, or
  retry orchestration;
- Annotation document writes, Artifact acceptance, persistence migration, or
  AI/Dataset Builder behavior;
- R13.10b or any later R13.10 sub-step.
