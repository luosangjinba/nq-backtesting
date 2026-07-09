# V6 Step 201 - HTF Projection Integration Review

## Purpose

Step 201 reviews Steps 193-200 as one higher-timeframe projection chain before
starting new timeframe UI, indicator work, or broader chart features.

The review goal is not to add another runtime path. It is to confirm that the
existing HTF paths obey V6 ownership rules and that the next implementation
slice is selected from real remaining foundation risk.

## Completed HTF Chain

### Step 193 - Projection Domain

- Pure chart-data projection domain exists outside UI, replay, bar-data,
  chart-data runtime, and chart engine.
- Source bars are projected into ordered display OHLC bars.
- Cursor capping and bucket metadata live in the projection owner boundary.

### Step 194 - Projection Runtime

- `runtime.chart-data-projection` owns projection commands/events.
- Projection runtime is DOM-free and chart-engine-free.
- Chart-data runtime stores display bars but does not calculate aggregation.

### Step 195 - Initial Chart Entry

- Initial chart entry can project source bars to a pane display timeframe.
- Browser coverage proves a 5m initial chart entry renders through chart-data
  projection instead of chart-engine aggregation.

### Step 196 - Pane Reload

- Pane reload replacement routes HTF display bars through projection owner.
- Pane-local reload isolation remains preserved.

### Step 197 - Manual Next

- Manual-next fetches source timeframe bars and projects the cursor bucket for
  HTF panes.
- Visible latency is covered by a browser smoke.

### Step 198 - Leftward History

- Leftward-history prepends project source chunks before chart-data prepend for
  HTF panes.
- Visible range stability remains the priority.

### Step 199 - Auto-Play

- Auto-play remains a scheduler over manual-next.
- Auto-play does not dispatch projection, bar-data, or chart-data commands.
- HTF auto-play behavior is inherited from manual-next and has browser latency
  coverage.

### Step 200 - Reset View

- Reset view remains projection-owner agnostic.
- Reset uses applied display chart-data revision and pane snapshot data length,
  not raw source bars.
- HTF reset has browser coverage and does not mutate replay, chart-data,
  bar-data cache, or projection state.

## Allowed Projection Consumers

The only runtime paths that should dispatch `CHART_DATA_PROJECTION_COMMANDS`
after Step 201 are:

- chart entry projection preparation;
- pane reload chart-data replacement;
- chart entry manual next;
- leftward history extension.

Auto-play and reset view intentionally stay outside this list.

## Non-Owners

- Chart engine must render already-ordered display bars only.
- Chart-data runtime/store must store and merge display bars, not aggregate.
- Bar-data runtime must request/cache source windows, not own display
  projection or replay no-future filtering.
- Replay runtime owns cursor/reveal state only.
- UI controls dispatch intent only.

## Current Residual Risk

The main remaining foundation risk is pane identity consistency, not projection
math.

Several HTF paths now include a defensive active-pane fallback because the
chart surface uses pane ids such as `main`, while pane runtime records can
originate from `pane-default`. This fallback is contained, but it should be
reviewed before adding richer timeframe UI or indicator controls.

## Step 202 Recommendation

Do a pane identity and display-timeframe consistency review before expanding
timeframe UI or indicators.

Step 202 should answer:

- whether chart pane ids and pane runtime ids should be normalized at bootstrap;
- whether active-pane fallback should remain a compatibility behavior or be
  replaced by explicit pane records;
- whether every pane-local status/readout/control path observes the same
  display timeframe source.

## Acceptance

- Static guard proves all Step 193-200 HTF artifacts exist.
- Static guard proves projection routing scope remains explicit.
- Chart browser regression pack and boundary smoke pass.
