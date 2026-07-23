# V7 Layout Sync Contract — R6.10a

Status: executable contract and durable Crosshair migration (2026-07-22)

## Product Policy

Layout Sync is one Session-workspace policy with exactly five switches:

| Key | Default | Intended consumer |
| --- | --- | --- |
| Symbol | on | Pane Workspace instrument replacement |
| Interval | off | Pane Workspace timeframe replacement |
| Crosshair | off | Chart adapter crosshair projection |
| Time | off | inert compatibility field; no real-time consumer |
| Date range | off | inert compatibility field; deliberately deferred |

ETH/RTH and Replay are deliberately absent. Both remain Session-wide and always
apply to every Pane because all Panes share one Replay clock.

R6.10a exposes no inert future controls. It migrates only the already accepted
Crosshair control into this policy. Symbol and Interval later received real
consumers. Real-time Time was rejected and removed, while Date range was
deliberately deferred at R6 closure; both fields remain serialized only for
compatibility and have no production controls or projections.

## Ownership

- `core.layout-sync-domain` owns the immutable exact five-boolean value,
  registered keys, defaults, and version-one wire schema. It owns no mutable
  state, DOM, Pane, Replay, bars, chart, or Viewport.
- `core.session-store` is the only durable writer. The accepted policy is stored
  inside the explicitly keyed Session workspace alongside Pane Layout.
- `adapter.replay-workspace-ui` owns the layout-menu DOM and one small projection
  controller. It saves first, then projects the accepted Crosshair value.
- `adapter.lightweight-chart` remains the only owner that changes native chart
  Crosshair behavior.

The policy is not a second workflow coordinator. Symbol and Interval consumers
issue one complete Workspace replacement intent, never one command per Pane.
If Time or Date range is ever reconsidered from new product evidence, it must
use official chart APIs behind the adapter, suppress projection feedback, and
cannot become persisted chart coordinates.

## Session Workspace Schema

Current configured Session workspaces use schema version 5:

```text
{
  schemaVersion: 5,
  state: "configured",
  paneLayout: <v7.pane-layout wire>,
  layoutSync: <v7.layout-sync wire>
}
```

Schemas 1–4 remain valid migration inputs. Reading an older record does not
write it. The next accepted Pane Layout or Layout Sync save lazily writes schema
5 with the reviewed default policy unless a policy has already been accepted.
The migration does not move Replay or activation identity.

## Commit And Failure Rules

- one toggle saves the complete policy through Session Store before changing
  its accepted UI/chart projection;
- failed persistence restores the previous switch and adapter projection;
- a toggle creates no Replay proposal, Workspace transaction, Bar Data request,
  series-data write, Pane focus change, or Viewport revision;
- reopening the same Session restores its accepted policy;
- another Session starts from defaults and cannot inherit the first Session's
  policy;
- missing, extra, non-boolean, forged, or unsupported wire values fail with a
  stable Layout Sync domain error.

## Existing-Approach Audit

Lightweight Charts 5.2 already provides relevant presentation primitives:
`subscribeCrosshairMove` plus `setCrosshairPosition` /
`clearCrosshairPosition`, and visible logical/time-range subscriptions plus
setters. `setVisibleRange` clips to existing data, so any reconsidered
Date-range work would need to choose logical-range behavior deliberately where
time extrapolation is required. The awesome-tradingview catalog contains no multi-chart synchronization
owner that fits V7's one-way ownership and atomic replacement rules.

V6 is retained only as product evidence for the five labels/defaults. Its
command/event fan-out and component-local boolean ownership are rejected.

## Gate

- `tests/layout-sync-domain-harness.js` binds defaults, branding, immutable
  updates, exact serialization, and fixture-backed negative controls;
- `tests/session-store-harness.js` binds schema-5 migration, Session isolation,
  durable restoration, and CAS failure behavior;
- `tests/layout-sync-controller-harness.js` binds persist-before-project and
  failed-save restoration;
- `tests/replay-layout-workspace-browser-harness.js` binds reviewed defaults,
  Crosshair behavior, zero Replay/Workspace revision movement, and Session
  re-entry restoration;
- architecture/module/source-quality Harnesses bind the new owner, public port,
  durable writer, and documented critical rule.

The Crosshair persistence change is interaction-visible and remains executable
until the combined R6.10 human gate accepts it with the later controls.
