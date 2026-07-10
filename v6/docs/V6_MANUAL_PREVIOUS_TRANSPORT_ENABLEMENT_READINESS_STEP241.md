# V6 Manual Previous Transport Enablement Readiness - Step 241

## Decision

The shell transport should eventually dispatch the existing chart-entry manual
Previous command directly:

`CHART_ENTRY_MANUAL_PREVIOUS_COMMANDS.PREVIOUS`

No extra domain command or chart-data rollback path is needed. Replay remains
the cursor owner, chart-entry remains the chart-data replacement owner, and
viewport remains the intent/projection owner.

## Readiness Model

Replay state now exposes `previousAvailable`, derived in the replay domain:

- `cursorIndex > 0` means a previous replay bar exists;
- if `cursorIndex` is absent, `revealedCount > 1` is accepted as a fallback;
- at replay start, Previous is unavailable;
- after one manual Next, Previous is available;
- after rewinding from cursor 1 to cursor 0, Previous becomes unavailable;
- after rewinding from cursor 2 to cursor 1, Previous remains available.

The transport reads only this boolean readiness field and listens to
`REPLAY_EVENTS.REWOUND` so the future enabled button will immediately reflect
the new previous availability after a click.

## Current Button State

Step 241 intentionally keeps `data-v6-transport-step-back` disabled and without
`data-v6-transport-action`. The button now exposes readiness through
`data-v6-transport-previous-available`, while the transport root exposes
`data-previous-available`.

This keeps the shell visually and behaviorally disabled while making the
enablement condition explicit and testable without making shell UI own replay
cursor semantics.

## Next Step

The next bounded implementation step can wire the button by adding the
transport action only when `previousAvailable` is true, then dispatching
`CHART_ENTRY_MANUAL_PREVIOUS_COMMANDS.PREVIOUS` through the existing transport
action path.
