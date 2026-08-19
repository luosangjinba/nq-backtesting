# V7 Task And Requirement Numbering

Status: binding delivery rule; latest allocated repository step is P1c.3;
H120 is accepted, P1c.3 is closed, the FVG + SMA business Demo remains an
unaccepted documentation candidate with no id, MEMO-V7-005 is non-binding with
no id, and H117 is unchanged (2026-08-18)

## Delivery IDs

`R<n>` is a roadmap milestone. It groups an architectural outcome and is not
itself assumed to be one commit.

`R<n>.<m>` is the smallest delivery step:

- exactly one bounded repository commit;
- automated evidence before and after the commit;
- exactly one human acceptance gate;
- monotonically increasing within its milestone;
- never reused, renamed, or silently amended after review.

If a step is rejected, its commit and session record remain evidence. The
replacement receives the next unused step id and links the rejected step. A
bug fix, documentation correction, or harness repair that changes repository
state is therefore a new `R<n>.<m>` step, not an unnumbered patch.

The later Plugin Platform program uses `P<phase>` and `P<phase>.<slice>` ids
under the same non-reuse, bounded-delivery, evidence, and human-gate rules.
Those ids do not renumber or supersede the R-series history.

The preceding repository-changing delivery step was `P1c.2`, Calculated-Series
Chart-Owned Projection. A separate 2026-08-13 product-owner
instruction authorized its accepted specification and allocated H119. The
synthetic removable projection transaction, Chart-owned admission seam,
adapter-private one-chart Main/internal resource bridge, and real Chromium
evidence are implemented. The first H119 review on 2026-08-17 rejected native
line/area/baseline whitespace bridging; the expressly authorized bounded
correction now segments contiguous value runs and adds real-pixel no-bridge
evidence. The product owner accepted the corrected focused gate on 2026-08-17;
H119 is accepted and P1c.2 is closed. At that closure it added no Profile
execution availability, named Indicator, live instance/persistence/UI,
Community/Worker, P1b.4, product route wiring, or H117 change.

The product owner subsequently authorized a documentation candidate for one
complete Core Moving Averages/SMA vertical slice, accepted all ten material
decisions without amendment, and issued a separate implementation instruction.
`P1c.3` and H120 are now allocated. The exact one-definition slice is
implemented, automated H120 passes, and the product owner accepted the focused
production-route review on 2026-08-18. H120 is `accepted`, remains
human-review-required, and P1c.3 is closed. The latest allocated step remains
P1c.3: a recommended P1c.4/H121 candidate has not been allocated. No other
plugin, generic layout slice, P1b.4, Community/Worker, business implementation,
or H117 change is authorized by this acceptance.

The product owner then authorized a documentation-only FVG + SMA Validation
Campaign / Study Case Demo candidate. It has no delivery id, Harness id,
implementation authority, or acceptance state. Drafting that candidate does
not allocate P1c.4/H121 or supersede the rule that any repository-changing
business slice requires a separately accepted specification and explicit
implementation instruction.

The later MEMO-V7-005 Evidence Collection Dashboard / explicit multi-dataset
Chart application / Setup-free Phenomenon Study / semantic visual grammar
record is a registered non-decision memo, not a delivery candidate. Its fifteen
open questions allocate no `R`, `P`, or `H` id, do not amend the FVG + SMA
candidate, and cannot authorize implementation.

`R13.5` was the Segment Interaction And Preview step. R13.2 remains the pure
removable Geometry boundary, R13.3 remains
the removable Session document writer, and R13.4 remains the removable
Chart-owned accepted-projection transaction. R13.5 adds one removable generic
Segment gesture controller plus Chart-owned normalized interaction and
transient Preview ports in a test-only visual fixture; it does not wire
production drawing UI.
ADR-V7-002 is an accepted pre-implementation decision rather than an R13.6
delivery step. It freezes the required community-reuse evidence, approves only
official Lightweight Charts Primitive/rendering patterns, adds no production
dependency, and leaves R13.6 unauthorized and unimplemented.
The V7.0.0 foundation milestone is accepted; R12.1–R12.8 retain their committed
implementation and non-blocking host follow-up. R11.1 remains the automatically
closed cross-runtime architecture-integrity recovery; R12 does not reopen it.
R8 remains closed at R8.16 commit `364c6b27`; R9.1–R9.4 and R10.1–R10.10 retain their
recorded implementation and follow-up states. R11.1 is one recovery commit with
inseparable W1–W8 workstreams; those workstream labels are not delivery IDs.
H092 records the automatically accepted staged-discard safety invariant for
R12.1. H093 records the standalone V7 runtime invariant for R12.2. H094 records
the minimum-memory/adaptive-resource invariant for R12.3. H095 records the
bounded swap-accounting recovery for R12.4. H096 records the network-free warm
Replay and compensated single-flight Autoplay invariant for R12.5. H097 records
automatic first/repeat/bootstrap detection and safe idempotent Caddy-layout
migration for R12.6.
H098 records unified exposure selection, strict saved-profile reuse, bounded
public-IP discovery, private-domain TLS, and owned IP-to-domain Caddy migration
for R12.7. Broad `R<n>` headings remain milestones only.
H099 records exact health-only importer composition, honest read-only Market
Data fallback, unavailable Maintenance-control removal, and internal Replay
error-code translation for R12.8.
ADR-V7-001 records the accepted R13.1 terminology, owner, persistence, projection,
no-future, manual-curve versus calculated-series boundary, plugin-first
first-party semantic package boundary, dual user creation paths,
recognition/construction provenance, host-rendered Property Inspector, and
implementation order. H100 records R13.2's exact market-coordinate, immutable,
portable, extensible, and removable Geometry boundary; R13.2 did not itself
authorize an Annotation document writer.
H101 records R13.3's sole Annotation Document writer, exact revisions,
Session isolation, reversible failure handling, zero semantic packages, and
optional removal. H102 records R13.4's exact accepted projection receipt,
reversible primitive lifecycle, Chart-only visual ownership, and candle/
Workspace non-mutation. H103 records R13.5's exclusive Chart-arbitrated
gesture, bounded transient Preview, one-shot generic-Drawing command, zero-
commit cancellation, native interaction restoration, and disposal boundary.
H103's required human visual gate is accepted; R13.6 and every production-
visible drawing behavior remain unauthorized.
ADR-V7-002 records the pinned community candidate, compatibility, license, and
owner-boundary gate that must be applied before any later R13.6 specification.

## Other Stable IDs

- `H###`: executable or planned harness invariant; ids never change meaning.
- `UX-FND-###`: foundation user-interaction contract.
- `UX-POST-###`: unplanned post-foundation candidate. It records only an
  extension boundary and is not a roadmap or phase commitment.
- `ADR-V7-###`: future architecture decisions when a choice needs a dedicated
  decision record.
- `MEMO-V7-###`: stable non-decision memo identity. A memo preserves a dated
  unresolved position and authorizes neither delivery nor implementation. The
  canonical registry is `V7_NON_DECISION_MEMO_REGISTRY.md`.
- `BUG-V7-####`: stable black-box regression identity. R8 begins with
  `BUG-V7-0001` through `BUG-V7-0005`; ids never change meaning after issue.

Requirement and bug ids describe product truth; delivery ids describe when
repository evidence changed. One delivery step may protect several requirement
ids, but its session record must list them explicitly.
