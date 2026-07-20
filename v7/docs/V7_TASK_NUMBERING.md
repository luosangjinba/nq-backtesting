# V7 Task And Requirement Numbering

Status: binding delivery rule (2026-07-19)

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

The current completed step is `R4.4`. Later R4 work receives the next unused
`R4.<m>` id before implementation; the broad `R4` heading remains a milestone
only.

## Other Stable IDs

- `H###`: executable or planned harness invariant; ids never change meaning.
- `UX-FND-###`: foundation user-interaction contract.
- `UX-POST-###`: unplanned post-foundation candidate. It records only an
  extension boundary and is not a roadmap or phase commitment.
- `ADR-V7-###`: future architecture decisions when a choice needs a dedicated
  decision record.
- `BUG-V7-####`: future accepted black-box regression identity.

Requirement and bug ids describe product truth; delivery ids describe when
repository evidence changed. One delivery step may protect several requirement
ids, but its session record must list them explicitly.
