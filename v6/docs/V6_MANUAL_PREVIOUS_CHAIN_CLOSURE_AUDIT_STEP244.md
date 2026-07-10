# V6 Manual Previous Chain Closure Audit - Step 244

## Scope

Steps 235-243 implemented the Manual Previous / Step Back chain:

- Step 235 selected the owner path.
- Step 236 added replay-domain previous cursor movement.
- Step 237 defined chart-entry replacement semantics.
- Step 238 implemented chart-entry manual Previous.
- Step 239 registered browser wiring while the transport remained reserved.
- Step 240 made viewport cursor preservation explicit.
- Step 241 added transport readiness.
- Step 242 wired the transport Previous button.
- Step 243 covered visible multi-pane transport rewind.

## Current Owner Map

- Replay domain owns previous cursor state, `previousAvailable`, and
  `replay:rewound`.
- Chart-entry manual Previous owns dispatching replay previous and replacing
  pane-local chart-data for target panes.
- Chart-data owns pane-local series records through `REPLACE_BARS`.
- Chart viewport owns cursor intent updates and projection preservation through
  replay/chart-data events.
- Shell transport owns only button enabled state and command dispatch.
- Chart adapter, indicators, trading, orders, prop-firm rules, and journal
  workflows do not own Manual Previous behavior.

## Audit Findings

- No duplicate chart-data rollback/remove path exists.
- Manual Next and Manual Previous remain separate chart-entry runtimes; shared
  extraction is not required yet because the asymmetric append/replace behavior
  is still clearer at the runtime boundary.
- Early Step 234-237 static smokes had stale assertions that transport must not
  contain a previous action. Those assertions were valid before Step 242 and are
  now updated to preserve the historical "do not implement in this step" doc
  checks while accepting the current Step 242 transport owner path.
- The Step 239-241 browser smokes were already updated during Step 242 to avoid
  stale assumptions about the now-enabled button.
- Historical session notes that say the transport was disabled are retained as
  step-local history. Current behavior is documented in Steps 242-244.

## Remaining Risk

The chain does not yet add an ArrowLeft keyboard shortcut. That is intentionally
deferred because keyboard focus/editable-target/menu exclusions should be tested
as their own UI behavior.

## Next Foundation Priority

The next bounded foundation slice should leave Manual Previous alone and return
to chart foundation stability. Recommended next step:

**Step 245 - Replay/Transport Chain Regression Pack**

Run and stabilize a compact regression pack around replay transport, leftward
history, multi-pane layout, reset view, and display timeframe switching. This
should confirm the Manual Previous chain did not regress the broader chart
foundation before starting a new feature area.
