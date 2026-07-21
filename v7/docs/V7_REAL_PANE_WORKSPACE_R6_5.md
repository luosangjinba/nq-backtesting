# V7 Real Pane Workspace — R6.5

Status: implemented; awaiting interaction and visual acceptance (2026-07-21)

## Outcome

R6.5 mounts the headless R6.1–R6.4 contracts in the real NQ-primary browser workspace.
Single-Pane mode and two-Pane mode use the same Pane records, data composition,
Viewport owners, chart adapters, and Workspace Transaction path.

The visible controls now provide:

- one- or two-Pane layout;
- active-Pane NQ/ES and fixed-TF selection;
- Session-wide ETH/RTH selection;
- Pane-local native drag/wheel wall and Reset View;
- shared Manual Next, Manual Previous, one-step Autoplay and Pause;
- Restart to the Session start;
- quick GoTo for Next Day Open, Next Session, Asian, London, and New York;
- exact New York date/time GoTo through the shared Calendar Surface.

`Auto ×1` deliberately exposes the R6.4 one-step Autoplay contract. It proves
that the Autoplay action materializes every Pane and enters Replay-owned
`playing` state, without pretending that R7's timer/cadence loop exists.

## Chart Mapping Decision

Official Lightweight Charts 5.2 native Panes were tested first. They share one
chart time scale, so they are suitable for future same-time-axis indicator
main/sub-panes. V7 product Panes must allow different instruments, TFs, and
Viewport walls. Each product Pane therefore owns one chart host and one real
adapter instance.

`createLightweightPaneSetAdapter` is the only complete-Pane chart-writer port.
It stages every result, invokes child applications within one complete visible
boundary, then publishes the accepted Pane membership/focus/empty state. New
hosts remain hidden while prepared. CSS pins every host to its Pane bounds; the
browser gate explicitly rejects the earlier full-width-but-clipped geometry.

## Owner Flow

UI controls dispatch intent only. `Pane Workspace State` composes branded Pane
values and Viewport controllers. `Workspace Execution` owns transient pending,
feedback, and history coalescing but no product state. Replay Navigation plans
one response for every Pane. Pane Data Composition acquires through the sole
Bar Data Runtime, owns Pane-local accepted source ledgers, and invokes the pure
Projection Domain. Workspace Transaction Runtime remains the only coordinator.

Focus changes are data-command-free. Instrument, TF, layout, ETH/RTH, and
history replacements use an exact retained-cursor Pane-set transaction. Replay
actions use the R6.4 target proposal path. Primary-instrument visibility is
clamped to the Session range, so Restart can retain older chart context while
publishing no Session-visible bar before the start cutoff.

## Gate

`tests/replay-pane-workspace-browser-harness.js` proves:

- real NQ/`1m` and ES/`4h` charts in stable Pane order;
- host geometry equals Pane geometry and each host owns real canvases;
- focus alone creates no Workspace revision;
- active-Pane instrument/TF does not leak into the inactive Pane;
- native input changes only its Pane Viewport;
- Next, Previous, one-step Autoplay, Restart, and ETH/RTH visibly apply both
  Panes under one Replay/workspace revision;
- quick New York GoTo and exact New York cutoff both use the shared path;
- one/two-Pane transitions and a fixed `1440x900` mixed visual fixture;
- no browser errors.

The established single-Pane browser Harness also remains green, including 100
aggregate Next samples and the high-TF history responsiveness gate.

## Deferred

- continuous Autoplay cadence, speed, and restoration remain R7;
- durable layout/selection restore remains R7;
- Economic Calendar/events remain an optional later business module;
- indicator main/sub-pane work may use native Lightweight Charts Panes later,
  but cannot replace or merge the independent product-Pane owner model.
