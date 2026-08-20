# Session — H121 Cross-Timeframe FVG Review-Blocker Repair

Date: 2026-08-19

Status: blockers repaired; automated gates pass; H121 human review must restart

## Authority And Scope

The product owner authorized only the H121 blockers observed during focused
review: cross-timeframe FVG degeneration, exact source Pane identity,
multi-Pane rollback and interaction release, an actionable no-Campaign state,
and automated 1m/15m visual evidence. This authority does not include
right-click drawing, generalized plugin Settings, another plugin, P1b.4,
Community/Worker, Journal, Dataset Builder, AI, or H121 acceptance.

## Root Cause

1. A valid canonical FVG uses a Rectangle plus a horizontal CE Segment. When a
   1m FVG lies wholly inside one accepted 15m bucket, containing-bucket
   projection maps both time anchors to the same target anchor. Rectangle
   projection already treated this as target unavailability, but Segment
   projection re-ran canonical normalization and raised `SEGMENT_DEGENERATE`.
2. the toolbar armed a tool from the active Pane stored in the last accepted
   Workspace publication. Pure focus changes can occur without a new accepted
   chart publication, so this value could lag the Pane clicked by the user.
3. the projection error interrupted Inspector reconciliation. Because an open
   dirty Inspector correctly owns the Workspace interaction gate, the UI then
   appeared locked even though the primary defect was projection failure.
4. a Session with no active Campaign displayed only an explanation and Close;
   it did not offer a direct route to the Campaign surface.

## Repair

- Segment anchor projection now returns unavailable only when target mapping
  collapses both anchors exactly. Canonical creation and restoration still
  reject truly identical anchors, while vertical and horizontal Segments stay
  valid.
- the Replay Workspace command port supplies its command-time `activePaneId` to
  the manual workflow. Accepted Workspace evidence validates that explicit Pane
  before acquiring its exact Chart bar-picker.
- the existing multi-Pane prepare/apply/rollback/finalize owner remains the sole
  settlement boundary. Regression coverage proves no partial accepted or
  Preview projection survives and cancel releases Inspector, picker, and busy
  state.
- the empty capture dialog now explains Campaign ownership and offers
  `Go to Validation`; navigation remains outside Campaign business truth.

## Evidence

- Geometry and FVG package Harnesses prove canonical degeneracy remains closed
  while one-bucket target collapse yields no 15m projection.
- production manual FVG workflow coverage uses actual Lightweight Charts with
  a 1m source Pane and 15m target Pane. The 1m Rectangle/CE is painted and
  hittable; the collapsed 15m projection is absent and not hittable; Preview,
  cancel, reload, and native chart interaction remain correct.
- the same workflow proves an explicitly focused 15m Pane becomes the stored
  source Pane and source timeframe even when accepted response-plan focus still
  names the 1m Pane.
- Campaign production-route Chromium proves `Go to Validation`, return to the
  same Session, the complete H121 tracer bullet, desktop/narrow rendering, and
  zero page errors.
- H121 Node negative controls, H121 browser evidence, annotation context atomic
  rollback, Replay Workspace composition, production architecture, production
  source quality, and `git diff --check` pass.

## Governance Result

H121 remains `executable`, human-review-required, and unaccepted with no
acceptance evidence. H117 remains unchanged. The ten-item H121 human review
must restart from item 1; no later product or plugin slice starts from this
repair.
