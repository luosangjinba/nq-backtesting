# Session — R13.9 Semantic Package Registry And Liquidity Level

Date: 2026-08-09

Status: accepted; automated and human H107 gates complete

## Scope

R13.9 adds the first trusted-build Semantic package vertical slice above the
accepted generic Annotation owners. It introduces no dynamic third-party code,
automatic liquidity detection, production toolbar, FVG, Evidence Resolver,
trade signal, Bar Data request, Replay write, or R13.10 work.

## Implementation

- a removable Registry owns exact compatibility, package lifecycle, definition
  collisions, failure isolation, branded drafts, tools, projection subjects,
  and host-rendered Inspector schemas;
- the sole Annotation Runtime accepts generic Artifact creation and atomic
  Drawing promotion with retain/archive choices, history, undo/redo, and exact
  revision checks without any BSL/SSL branch;
- the existing persistence envelope preserves unresolved and unknown Artifact,
  provenance, relation, attribute, Presentation, and scope fields without a
  schema-version change;
- the first-party liquidity package registers human-asserted
  `liquidity.bsl@1.0.0` and `liquidity.ssl@1.0.0` over exact horizontal Segment
  anchors, explicit Replay cutoff provenance, and minimal Semantic/History
  property schemas;
- package disable removes tools and projections while retaining the unchanged
  Artifact; compatible re-enable restores both at the same document revision.

## Automated Evidence

H107 passes 22 declared negative controls covering manifest compatibility,
collisions, stale/forged drafts, future anchors, invalid promotion, exact
revisions, package failure isolation, unresolved durability, and lifecycle.
The real Chromium fixture proves cyan generic Drawing → amber BSL promotion,
host-owned Inspector groups, Replay before/after hide/restore, package
disable/re-enable, and byte-identical candlestick data.

The first human pass found that `Before observed` hid the projection but left
the previously selected package Inspector fields visible. That contradicted
the no-future contract. The correction adds a cutoff-safe host Inspector entry:
before observation it returns no resolution or package-defined fields and the
surface shows only `Not visible before observation cutoff`; moving after the
cutoff restores the unchanged resolved view. The real-Chromium H107 assertion
now binds both projection and Inspector suppression.

Production assembly contains 61 public modules, 25 lifecycle modules, and 24
optional-removal cases. Architecture evidence contains 61 modules, 132
dependency edges, 115 construction sites, 18 declared writer surfaces, 23
observed writer files, and zero findings. Current source evidence contains 628 files, 58,339 effective lines, 5,981 functions, and 647 public exports with no
accepted exception.

## Human Acceptance Evidence

The user accepted the corrected local fixture on 2026-08-09. The accepted flow
confirmed the initial cyan horizontal Segment, BSL/SSL promotion, the
host-rendered Semantic/History panel, package disable/re-enable, native Chart
drag/wheel behavior, and Replay no-future behavior. In particular, moving
before observation hides both the projection and every prior resolved
Inspector field and shows only the generic cutoff message; moving after the
cutoff restores the unchanged resolved view. H107 is accepted. R13.10 remains
unauthorized.
