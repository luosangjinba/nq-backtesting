# V7 Session Isolation Acceptance Matrix

This is the first black-box product gate. R0 records it; later steps automate
and execute it. Distinct sessions A and B use visibly different date ranges.

| Case | Required outcome |
| --- | --- |
| Create A, leave, create B | B contains no A metadata, cursor, panes, or bars |
| Open A, immediately open B, release delayed A work | only B can commit or become visible |
| A -> B -> A | reopened A uses a new activation generation and only A state |
| Advance A, open B | B cursor remains its own starting cursor |
| Change A TF/hours/layout, open B | B retains its own pane intents |
| Hard refresh while B active | only B's persisted workspace is restored |
| Delete/close A while A work is pending | late A success/failure is ignored |
| Cache contains same instrument/window for A and B | raw bars may be reused, session state may not |

Failure of any row blocks chart, TF, ETH/RTH, multi-pane, and transport work.
