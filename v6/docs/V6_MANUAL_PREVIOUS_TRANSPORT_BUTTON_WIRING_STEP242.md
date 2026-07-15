# V6 Manual Previous Transport Button Wiring - Step 242

## Decision

The transport Previous button now uses the same shell action path as Next,
Play, and Restart. When replay state reports `previousAvailable: true`, the
button receives `data-v6-transport-action="previous"` and dispatches:

`CHART_ENTRY_MANUAL_PREVIOUS_COMMANDS.PREVIOUS`

When `previousAvailable` is false, the button is disabled and the transport
action attribute is removed.

## Boundaries

- Replay owns `previousAvailable` and cursor movement.
- Shell transport only enables/disables the button and dispatches the command.
- Chart-entry manual Previous owns chart-data replacement after replay rewind.
- Chart viewport owns intent cursor updates and projection preservation.
- Chart-data, indicators, trading, orders, prop-firm rules, and journal
  workflows are unchanged.

## Coverage

`v6/tests/manual-previous-transport-button-browser-step242-smoke.js` verifies:

- at replay start, Previous is disabled/actionless and clicking it does not move
  replay or chart-data;
- after two manual Next actions, Previous is enabled and dispatchable;
- clicking Previous rewinds one replay bar, replaces chart-data so no future
  bars remain beyond the cursor, and preserves manual viewport origin/span;
- after rewinding to cursor 1, Previous remains enabled;
- after rewinding to cursor 0, Previous becomes disabled/actionless again.

## Deferred

Step 242 does not add a keyboard shortcut. A future step can decide whether
ArrowLeft should map to Previous and can cover editable-target/menu-focus
exclusions separately.
