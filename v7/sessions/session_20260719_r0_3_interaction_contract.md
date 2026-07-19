# V7 R0.3 Foundation Interaction Contract — 2026-07-19

## Trigger

The user confirmed that simulated orders, Journal, Validation Campaigns,
general settings/shortcuts, operational recovery, indicators, drawings, and
plugin UI are mostly second-phase features rather than foundation milestone
closure requirements. The user also requested the V7 task-numbering rule.

## Decision

Foundation interactions receive stable `UX-FND-###` ids and explicit owners,
commands, visible completion, failure, persistence, and coverage axes. Deferred
interactions receive `UX-P2-###` ids and cannot become foundation gates.

Repository-changing delivery steps use immutable `R<n>.<m>` ids. Each such step
has one bounded commit and one human gate. Rejected work keeps its identity and
replacement work consumes a new id.

## Scope

R0.3 adds product contracts, one validator, and four intentional violations. It
adds no production runtime, persistence implementation, chart, data request, or
browser UI.

## Manual Review

Review the 18 foundation interactions, six deferred capability families,
owners, visible outcomes, phase classification, coverage axes, and numbering
rules. Automated evidence cannot accept this step.
