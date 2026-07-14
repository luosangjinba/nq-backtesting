# V6 Compact Replay Status Presentation - Step 430

Date: 2026-07-14

## Decision

The full-width Replay footer is real state presented at the wrong abstraction
level. Step 431 will replace its seven engineering badges with one compact,
application-owned Replay status surface. Replay Runtime remains authoritative;
the view model may classify and present its state but must not infer or mutate
Replay progress.

This decision changes presentation only. It does not change session creation,
cursor materialization, hidden-future protection, transport commands, or event
contracts.

## User-Facing State Contract

The compact surface has two independent parts: one primary lifecycle message
and one optional protection assurance.

| Source condition | Primary copy | Visibility |
| --- | --- | --- |
| no loaded Replay / `idle` | `Preparing replay…` | visible while the workstation is not operable |
| `ready`, `playing`, or `paused` | `Replay ready` | visible; Play/Pause is not repeated |
| `ended` | `Replay complete` | visible |
| an explicit load/runtime failure when such a payload is available | `Replay unavailable` | visible with exceptional styling; detailed errors stay diagnostic |

The protection assurance is `Future data hidden`. It is shown only when a
loaded Replay has `totalBars - revealedCount > 0`. It disappears when there is
no loaded coverage or no remaining protected bar. It never renders the raw
hidden count.

Unknown non-empty runtime statuses must degrade to `Replay unavailable` rather
than exposing an internal status token. A safe detailed error design is outside
this cleanup step; Step 431 must not invent error ownership that Replay Runtime
does not yet provide.

## Information That Is Not Permanent Chrome

The following values remain authoritative and testable but are not rendered as
default badges:

- internal `sessionId`;
- `startTime`, `cursorTime`, and `endTime`;
- `revealedCount`, `totalBars`, and derived `hiddenCount`;
- raw Replay runtime status;
- duplicate Playback/Play/Pause wording.

Start/end/cursor inspection may later belong to a genuine session summary.
That future surface must consume the same owner state instead of restoring this
footer.

## Diagnostic Contract

The compact status root will expose a machine-readable snapshot through
`data-v6-replay-diagnostics`. The property value is serialized JSON with this
stable versioned shape:

```text
{
  version: 1,
  sessionId,
  startTime,
  cursorTime,
  endTime,
  revealedCount,
  totalBars,
  hiddenCount,
  runtimeStatus
}
```

Missing identifiers/times use `null`; counts use non-negative numbers; status
uses a string. Tests should inspect the model's structured diagnostic object
first and this DOM property only for view/controller integration. They must not
require hidden diagnostic text nodes or obsolete English badge strings.

This is a read-only presentation snapshot, not a command channel or a second
Replay state owner.

## Placement And Accessibility

- retain the bottom status row established by Step 429, but shrink it to its
  compact content instead of filling it with seven badges;
- align the compact surface to the chart's lower-left edge;
- preserve the Step 429 Replay Transport clearance calculation against the
  actual status-row rectangle;
- use one polite live status region; protection assurance is readable text and
  must not rely on color or iconography alone;
- do not place status over the chart, in the Replay Transport, or in Pane-local
  OHLC readouts.

## Step 431 Acceptance Boundary

Step 431 may change only the status model, renderer markup, and required layout
styling/tests. It must preserve Replay Runtime ownership and all current Replay
commands/events. Step 432 owns the broader semantic and responsive regression
matrix plus mandatory human visual acceptance.

