# V7 Task And Requirement Numbering

Status: binding delivery rule (R12.7 implementation, multi-mode host review open, 2026-08-06)

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

The current repository-changing delivery step is `R12.7`, the unified local,
cloud-IP, and domain deployment entry with transactionally persisted host
profile. R12.1–R12.6 retain their committed implementation and open host gates.
R11.1 remains the automatically
closed cross-runtime architecture-integrity recovery; R12 does not reopen it.
R8 remains closed at R8.16 commit `364c6b27`; R9.1–R9.4 and R10.1–R10.10 retain their
recorded implementation and human-review states, and the phase-one overall
checklist and H087/H088/H091 remain open. R11.1 is one recovery commit with
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

## Other Stable IDs

- `H###`: executable or planned harness invariant; ids never change meaning.
- `UX-FND-###`: foundation user-interaction contract.
- `UX-POST-###`: unplanned post-foundation candidate. It records only an
  extension boundary and is not a roadmap or phase commitment.
- `ADR-V7-###`: future architecture decisions when a choice needs a dedicated
  decision record.
- `BUG-V7-####`: stable black-box regression identity. R8 begins with
  `BUG-V7-0001` through `BUG-V7-0005`; ids never change meaning after issue.

Requirement and bug ids describe product truth; delivery ids describe when
repository evidence changed. One delivery step may protect several requirement
ids, but its session record must list them explicitly.
