# V7 R13.10b Exact Bar Picker

Status: accepted 2026-08-09; H110 automated and human visual gates complete

Date: 2026-08-09

Depends on: accepted R13.10a, R13.5 interaction arbitration, and R13.4 Chart projection

## Outcome

R13.10b adds only the exact loaded-Bar selection capability required by later
evidence-derived semantic packages. It activates removable
`optional.annotation-bar-picker` under the existing
`annotation-interaction-controller` owner and extends the existing
Chart-owned interaction port with one mutually exclusive Bar Picker lease.

The Picker emits a branded immutable value containing exactly:

```text
schemaVersion = 1
paneId
barStartEpochMs
```

It does not create an R13.10a Evidence Selection, acquire neighboring Bars,
move Replay, write an Annotation, select a semantic type, or construct FVG.
The later composition step must verify Pane/snapshot identity and explicitly
adapt this value to the accepted Evidence Resolver input.

## Upstream Reuse Decision

The implementation uses the official Lightweight Charts 5.2 interaction
surface rather than a community drawing runtime:

- `IChartApi.subscribeCrosshairMove` provides candidate movement;
- `IChartApi.subscribeClick` provides the accepting click;
- `MouseEventParams.seriesData` contains the original series item at the event,
  while `point` and `time` may be absent outside available data;
- the official `highlight-bar-crosshair` Primitive remains the visual pattern
  source for highlighting one Bar-width region.

Sources:

- <https://tradingview.github.io/lightweight-charts/docs/api/interfaces/IChartApi>
- <https://tradingview.github.io/lightweight-charts/docs/api/interfaces/MouseEventParams>
- <https://github.com/tradingview/lightweight-charts/blob/ef7335a8007236eac38bd50cacddc305c7fcb293/plugin-examples/src/plugins/highlight-bar-crosshair/highlight-bar-crosshair.ts>

The previously audited community drawing managers still combine Chart,
interaction, Drawing state, or persistence ownership. R13.10b therefore adds
no dependency and retains ADR-V7-002 unchanged.

## Owner Flow

```text
fixture / later host UI
  -> optional.annotation-bar-picker
       owns armed/candidate/selected/cancelled transient state only
  -> optional.annotation-chart-projection interaction port
       owns the one shared exclusive Chart lease
       owns Lightweight Charts subscriptions and display-to-market mapping
  -> Lightweight Charts loaded Series event data
```

The controller never receives a DOM node, Chart, Series, Canvas, Bar Data
runtime, Workspace, Replay, Annotation Runtime, repository, network, or
storage handle. The Chart adapter never creates a semantic selection or writes
accepted Annotation state.

`optional.annotation-bar-picker` may be omitted independently. Removing its
required Chart projection port also removes the Picker through normal
ModuleHost dependency resolution. Existing Segment/Rectangle interaction
remains usable without the Picker.

## Exactness Rule

The Chart adapter resolves the selected start from
`MouseEventParams.seriesData.get(series).time`, not from a rounded pixel,
logical index, crosshair label, or nearest-time search. It accepts only finite
Unix timestamps already represented by the mounted Series, then invokes the
existing composition-supplied display-to-market-time resolver.

Therefore:

- a gap or off-data click emits no selection;
- one click cannot synthesize a Bar that was not loaded;
- Pane identity travels with the exact Bar start;
- the controller rejects structural lookalikes and stale/equal event sequence;
- R13.10a still rejects a missing, unclosed, or post-cutoff Bar. The Picker
  does not duplicate that owner policy.

## Interaction Contract

1. The host explicitly arms one opaque Picker id.
2. Hovering a loaded candle publishes at most the latest exact candidate.
3. One primary click accepts exactly one selection and returns the controller
   to idle.
4. Escape, secondary button, context menu, focus loss, explicit cancel, or
   disposal releases the lease and emits zero selection. A focus-loss emitted
   during an already active primary Picker press receives a 150ms completion
   window: normal pointer-up accepts and clears the timer; unresolved real
   focus loss still cancels when the window expires. Idle focus loss remains
   immediate.
5. Secondary-button cancellation suppresses the native context menu for the
   same consumed interaction.
6. Bar picking does not disable native pan, wheel zoom, scale, or crosshair
   behavior. The official click event remains the primary acceptance path. A
   bounded browser fallback captures only the latest official `seriesData`
   candidate on primary pointer-down at the window capture layer, before a
   vendor container listener can consume that event. It accepts on pointer-up
   only when movement stays within the Picker's 8px click slop. Drawing retains
   its independent 3px drag threshold. If the official click event transiently
   lacks `seriesData`, the adapter may reuse the last exact official candidate
   only when the click remains within 12px on the time axis. It never derives
   a Bar from pointer coordinates; a pan-sized movement emits no selection and
   leaves the Picker armed.
7. A Bar Picker lease and a two-anchor Drawing lease cannot overlap because
   both use the same Chart-owned active record.

## Visual Fixture

`tests/fixtures/annotation-bar-picker/` is test-only. It composes the Picker
with the already accepted transient Annotation Preview port:

- cyan Rectangle: current exact candidate candle;
- lime Rectangle: accepted exact candle;
- toolbar status: exact UTC Bar start and accepted count.

The Rectangle is centered on the target Bar's timestamp and spans exactly one
neighbor-to-neighbor slot. Its geometry retains target/next timestamps while a
bounded render option shifts both pixel edges by half that spacing; generic
Rectangle rendering is unchanged.

The Rectangle is presentation evidence only. It is not an Annotation document,
semantic Artifact, Evidence Bundle, or second Picker owner. The fixture does
not ship a production toolbar.

## H110 Automated Gate

`tests/annotation-bar-picker-harness.js` proves:

- branded/frozen exact selection and structural-lookalike rejection;
- one-shot candidate/select behavior and duplicate/stale event rejection;
- Escape, right-click, focus-loss, explicit cancellation, and disposal;
- shared-lease exclusion with the existing Drawing gesture;
- official Chart subscription/unsubscription and failure cleanup;
- real-click fallback acceptance after later candidate event ordering, plus
  rejection of pan-sized pointer movement;
- exact source-series timestamp conversion with no pixel rounding;
- no native navigation-option mutation and no candlestick data mutation;
- real-Chromium candidate highlight, click acceptance, exact timestamp, and
  visual settlement, including transient window blur between press and release;
- immediate idle focus-loss cancellation plus the bounded in-flight
  focus-loss completion window;
- 12 stable negative controls, public-entry assembly, and optional removal;
- no Bar request, Replay/Workspace/Annotation writer, storage, or network
  authority in the controller module.

## Human Acceptance — Accepted 2026-08-09

Open:

```text
http://127.0.0.1:8013/v7/tests/fixtures/annotation-bar-picker/
```

Perform this short check:

1. Click `Pick exact Bar`, move across several candles, and confirm the cyan
   highlight follows one candle at a time while the UTC candidate changes.
2. Click one candle and confirm the highlight becomes lime, the exact UTC time
   remains visible, and the tool returns to idle.
3. Arm again and press Escape; arm once more and right-click. Both must cancel
   without accepting another Bar, and right-click must not open the browser
   menu.
4. Without arming, drag and wheel the chart. Native navigation must still work.

The user completed this window and accepted R13.10b on 2026-08-09. The final
fixture confirmed one-candle cyan candidate tracking, one-click lime acceptance
with the exact UTC start, Escape/right-click cancellation without a native
context menu or extra selection, and unchanged unarmed Chart drag/wheel
navigation.

The first human pass found two fixture defects: the candidate box occupied the
right half of the target and left half of its neighbor, and one real click
cleared the candidate without accepting it. Both defects now have automated
regressions. The second human pass showed that a real vendor container could
consume pointer-down before the container-level fallback listener. The bounded
fallback now observes only armed in-plot pointer-down at window capture, while
all ownership and cancellation remain in the same Chart adapter. This gate is
intentionally reopened again for confirmation.

The next human retry still failed, exposing two event details absent from the
zero-motion automation: the vendor click may arrive with transiently empty
`seriesData`, and remote/physical clicks may jitter beyond the Drawing tool's
3px threshold. H110 now covers exact-candidate retention for a same-slot empty
official click, stale-candidate rejection for another slot, 6px click jitter,
and 40px pan rejection. The gate remains open.

The temporary visible diagnostic pass then identified the actual terminal cause without
ambiguity: `DOM=1down/1up/1click`, `move=0.0px`, and
`cancel=focus-loss`. The remote browser emits a transient window blur between
the otherwise complete zero-motion click events. H110 now injects that exact
blur between real Chromium mouse press and release and proves acceptance, while
a focus loss with no active pointer still cancels immediately.

The diagnostic strip was removed before closure; it is not part of the final
acceptance fixture or any production surface.

## Excluded

- Evidence snapshot composition or Resolver invocation;
- FVG Definition/Profile, three-candle construction, projection, or promotion;
- Artifact/Drawing creation and Property/Evidence Inspector changes;
- validated overrides, automatic detection, persistence, production toolbar,
  multi-user behavior, AI/analytics, or data acquisition;
- any new community dependency or alternate interaction owner;
- R13.10c or later work.

## Closure

R13.10b is closed as one separately committed step after the accepted human
gate and standing R13/architecture/source-quality evidence. R13.10c remains
separately unauthorized.
