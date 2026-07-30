# V7 Task And Requirement Numbering

Status: binding delivery rule (R8 recovery update, 2026-07-30)

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

The current delivery step is `R8.4`, the pure Raw Coverage Lease contract. R8
follows immutable pre-remediation checkpoint `fa561599`; R8.1 is commit
`7dbabbed`, R8.2 is commit `f19b7f32`, and R8.3 is commit `60b92d93`. R8.5 may
not begin until the R8.4 commit and evidence have been reported. Every R8 step
is one commit and stops after that commit; broad `R<n>` headings remain
milestones only.

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
