# V6 Global Time Format Settings Contract

Status: accepted future Settings requirement; runtime and UI implementation are deferred.

## Decision

V6 will expose one workstation-wide time presentation preference owned by the
global Settings runtime:

```js
timeFormat: '24h' | '12h'
```

The default is `24h`. Go-to, replay, Journal, Session, and chart modules must
not create their own copies of this preference.

This setting is separate from `displayTimezone`. Timezone selects which wall
clock a timestamp represents; time format selects how that wall clock is
presented. Changing one must not silently change the other.

## Canonical Data Boundary

The preference is presentation-only. Internal timestamps, persisted replay
state, session anchors, and Go-to schedule values remain canonical. Wall-clock
inputs continue to cross runtime and persistence boundaries as 24-hour
`HH:mm`; absolute instants continue to use the existing timestamp contract.

Selecting `12h` changes labels and controls such as `19:00` to `7:00 PM`. It
must not rewrite the stored value, move a replay cursor, alter an ET session
anchor, or change date/time arithmetic.

## Required Coverage

When Settings parity implements this preference, all user-facing workstation
time surfaces must consume the same Settings-backed presentation adapter:

- chart time axis and crosshair time labels;
- status/footer Start, Cursor, End, and similar timestamp readouts;
- Go-to menu, Custom Settings schedule controls, and navigation feedback;
- Session setup, replay-practice, and session-summary time displays;
- Journal timestamps and future evidence/statistics time displays.

New time surfaces must use that shared formatter instead of selecting a format
locally. Feature modules may subscribe to Settings state or receive formatted
presentation values through an explicit adapter; they must not directly
control each other.

## Input-Control Constraint

Native `<input type="time">` rendering follows browser and operating-system
locale behavior and cannot guarantee the application's selected 12/24-hour
presentation. A future implementation that promises consistent formatting
must use a controlled time selector (or an equivalent proven component) whose
display follows `timeFormat` while its public value remains canonical `HH:mm`.

## Migration And Failure Behavior

- Existing persisted Settings records without `timeFormat` resolve to `24h`.
- Invalid or unavailable persisted values resolve to `24h` through the
  Settings model rather than feature-specific fallback code.
- Adding the field requires one Settings schema/persistence migration and a
  Settings event update; consumers must not perform their own migration.

## Deferred Scope

This decision does not yet add `timeFormat` to the production Settings model,
render a toggle, replace time inputs, or install chart formatters. Those changes
belong to a bounded Settings-parity step after the current chart/replay
foundation acceptance gate closes.

The future implementation gate must cover default/migration behavior, both
formats across the required surfaces, timezone/format independence, canonical
Go-to values, persistence/reload, DST-sensitive anchors, and multi-pane chart
labels.
