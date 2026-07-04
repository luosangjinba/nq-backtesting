# Step 537 V5 Multi-Pane Different-TF Next Projection

Date: 2026-07-04

## Trigger

Manual testing reported severe visible delay after clicking `Next` when two
replay panes use different timeframes.

## Diagnosis

The Step 534 fanout rebuild made same-timeframe panes update inside
`replay.next`, but different-timeframe panes still depended on the chart route's
`REPLAY_EVENTS.NEXT` projection handler. That handler runs after the replay
event and can load a display window later than the cursor advance.

## Plan

1. Document Step 537 and commit the plan.
2. Tighten browser coverage for the different-timeframe `Next` path.
3. Move different-timeframe pane projection into replay runtime's synchronous
   `Next` fanout before event emission.
4. Run targeted regression gates, then update TODO/session closeout.

## Status

In progress.
