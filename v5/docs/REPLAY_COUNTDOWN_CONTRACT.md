# V5 Replay Countdown Contract

The bar countdown is replay-derived display state. It is not a chart setting
calculation owned by route UI.

## Owner

- Replay runtime owns countdown derivation because it owns replay cursor,
  display timeframe, replay timeframe, and session end.
- Chart presentation runtime owns only the `showBarCountdown` display
  preference.
- Route UI renders the latest countdown snapshot and does not calculate the
  remaining time itself.

## Input State

- `cursorTimestamp`
- `displayTimeframe`
- `session.timeframe`
- `session.sessionEnd`

## Output Shape

`REPLAY_COMMANDS.GET_STATE` includes:

```js
{
  countdown: {
    active: boolean,
    remainingSeconds: number | null,
    closeTimestamp: string | null,
    label: string
  }
}
```

`label` is `M:SS` below one hour and `H:MM:SS` at one hour or above.

## Rules

- Countdown does not request bars.
- Countdown does not mutate replay cursor, reveal state, display bars, chart
  series, or session persistence.
- Countdown close timestamp is capped at `sessionEnd`.
- Settings `showBarCountdown` only controls route visibility.
- Future session-break support must extend this contract before changing UI
  semantics.
