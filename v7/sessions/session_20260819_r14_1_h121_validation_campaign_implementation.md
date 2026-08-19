# Session — R14.1/H121 FVG + SMA Validation Campaign Implementation

Date: 2026-08-19

Status: exact implementation and automated evidence complete; focused human
acceptance pending

## Authority And Scope

The product owner separately authorized the previously accepted R14.1/H121
implementation action. This session implements only the eight removable
modules in the binding specification, consumes only existing manual FVG and
SMA(close,20) evidence, registers H121 as executable/human-review-required, and
does not start P1c.4, P1b.4, another plugin, Community/Worker, Journal,
Dataset Builder, AI, or MEMO-V7-005 work. H117 remains executable, unaccepted,
and its Developer Kit fingerprint baseline is untouched.

## Implemented Closure

- strict portable Campaign/Definition/Citation/Case/Outcome/Cohort/Analysis/
  Verification/RawContext records with canonical SHA-256 and hard ceilings;
- reversible index/document CAS persistence at the exact accepted keys, plus
  the existing state-sync allowlist;
- read-only public FVG and SMA evidence adapters with no-future/source currency
  fences and degraded historical-read behavior when providers are absent;
- later Outcome acquisition only through Bar Data/Replay/Workspace owners,
  preserving honest same-Bar ambiguity;
- sole-writer Campaign runtime with immutable revisions, fixed Cohort metrics,
  drill-down, source verification, raw-context intent, and deterministic local
  audit JSON;
- Campaign list/detail route and Replay capture/outcome attachments, including
  Campaign-only poison isolation and 1280px/620px production fixtures;
- package-neutral composition seams; removing the full Campaign closure leaves
  Session, Replay, FVG, SMA, Bar Data, Workspace, and Chart ownership intact.

## Architecture And Source Closure

The implementation retains exactly eight new removable descriptors. Production
architecture records 84 modules, 183 dependency edges, 155 construction sites,
34 observed writer files, 28 exact writer surfaces, and zero findings. Source
quality records 642 files, 60,061 effective lines, 6,152 functions, and 650 public
exports with zero exception or finding. Campaign document, Campaign
storage, and Campaign DOM each have one executable sole-writer detector.

## Automated Evidence

- H121 Node domain/runtime/persistence/security/negative controls pass with 19
  declared negative fixtures;
- H121 real production-route Chromium evidence passes at 1280x800 and 620x800;
- Campaign index/document state-service allowlisting, client hydration, and
  exact cross-profile restore pass through two isolated Chromium profiles;
- production architecture, writer closure, source quality, module assembly,
  application-host lifecycle, deployed-runtime, and standalone-runtime gates
  pass;
- H118, H119, and H120 pass without changing their accepted state; H117 remains
  unchanged and unaccepted;
- the complete production matrix passes all 10 scenarios and 8 matrix-negative
  controls; its two pre-existing visual failures reproduce by their exact
  registered fingerprints, with no new known failure;
- Sessions and Replay visual baselines changed only for the new Validation rail
  entry and the two Campaign actions; the existing date-picker visual failure
  baseline remains deliberately untouched;
- `git diff --check` passes before the implementation commit.

Automated passage does not accept H121. The exact next action is the focused
ten-item review in
`../docs/V7_FVG_SMA_VALIDATION_CAMPAIGN_R14_1_HUMAN_REVIEW.md`.

A separately authorized pre-next-step architecture audit subsequently found
and repaired strict topology, exact Outcome/source identity, cancellation,
no-future, optional-removal, and file-responsibility gaps. Its durable evidence
is `session_20260819_r14_1_h121_post_implementation_architecture_audit.md`.
H121 remains executable and unaccepted; H117 remains unchanged.
