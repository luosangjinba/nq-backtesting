# V7 Foundation Interaction Contract

Status: binding product-behavior inventory (2026-07-19)

## Purpose

V6 is a product-behavior and failure-evidence reference, not an implementation
template. The machine-readable companion
`v7-foundation-interactions.json` records the detailed foundation interactions
that V7 must preserve or deliberately re-derive.

Each foundation interaction declares:

- the user intent and visible states;
- the single command and runtime owner;
- runtime completion and browser-visible completion;
- failure behavior and last-accepted-snapshot policy;
- persistence behavior;
- the cross-product axes that require later test disposition.

No interaction may rely on mouse movement, resize, wheel input, retry timing,
or a second event-driven materialization path to become correct.

## Foundation Boundary

Foundation scope includes Session creation/isolation/restore, chart entry,
Manual and Auto Replay transport, timeframe and ETH/RTH projection, history
loading, viewport wall/reset behavior, multi-pane layout, pane-local instrument
and timeframe, and bounded loading/error presentation for those actions.

Capabilities outside the accepted foundation are recorded only as unplanned
post-foundation candidates. They are not a second-phase plan, feature promise,
priority list, or acceptance scope. A later product-planning step must decide
whether they exist, how they behave, and in which phase they belong.

The first visible foundation slice still renders honest loading, empty, error,
stale, unavailable, and ready states. This is presentation correctness, not an
attempt to implement unplanned post-foundation modules.

## Change Rule

An interaction can enter a planned phase only through a reviewed delivery step
that changes the contract, machine-readable matrix, negative controls, roadmap,
and human acceptance checklist together. Implementations cannot quietly expand
foundation acceptance by exposing a placeholder control.
