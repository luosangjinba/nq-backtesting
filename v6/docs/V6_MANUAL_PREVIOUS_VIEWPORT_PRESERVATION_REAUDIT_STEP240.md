# V6 Manual Previous Viewport Preservation Reaudit - Step 240

## Decision

Manual Previous does not need a chart-entry-owned viewport projection signal
before the transport button is enabled. The existing chart-data revision event
is the correct owner path for projection/latest-logical-index updates after
chart-data replacement.

The missing owner work was replay cursor propagation. `REPLAY_EVENTS.REWOUND`
now feeds the chart viewport runtime cursor update path, matching the existing
Loaded/Advanced/Reset ownership. This keeps cursor timestamp updates inside the
viewport runtime instead of letting chart-entry manual Previous mutate viewport
state directly.

## Owner Boundaries

- Replay runtime owns cursor movement and emits `REPLAY_EVENTS.REWOUND`.
- Chart-entry manual Previous dispatches replay Previous and replaces pane-local
  chart-data only.
- Chart-data runtime emits `CHART_DATA_EVENTS.BARS_CHANGED`; viewport runtime
  projects chart-data revisions from that event.
- Chart viewport runtime owns viewport intent cursor updates and preserves
  default/manual origin, span, and latest offset.
- The reserved shell Previous transport remains disabled and unwired.

## Coverage

`v6/tests/manual-previous-viewport-preservation-step240-smoke.js` verifies:

- the transport Previous button remains disabled and has no transport action;
- default-wall intent preserves origin/span/latest offset after direct manual
  Previous;
- manual-wall intent preserves origin/span/latest offset/projection origin after
  direct manual Previous;
- viewport `intent.cursorTimestamp` follows the rewound replay cursor for both
  default and manual wall cases;
- chart-data after Previous does not extend beyond the rewound cursor.

## Deferred

Step 240 intentionally does not enable shell transport, change reset behavior,
or touch indicator, trading, order-ticket, prop-firm, or journal workflows.
Transport enablement should be a separate step after disabled/enabled button
state and at-start behavior are explicit.
