const DEFAULT_CROSSHAIR = Object.freeze({
  horzLine: Object.freeze({ labelVisible: true, visible: true }),
  vertLine: Object.freeze({
    color: '#758696', labelBackgroundColor: '#4c525e', labelVisible: true, visible: true, width: 1,
  }),
});

const TRUNCATION_CROSSHAIR = Object.freeze({
  horzLine: Object.freeze({ labelVisible: false, visible: false }),
  vertLine: Object.freeze({
    color: '#2962ff', labelBackgroundColor: '#2962ff', labelVisible: true, visible: true, width: 2,
  }),
});

function indexedBars(bars) {
  return new Map(bars.map((bar) => [bar.displayEpochMs, bar]));
}

/** Translate native chart clicks back to projected source bucket starts. */
export function createReplayTruncationInteraction({ chart, host, onSelect }) {
  let active = false;
  let barsByDisplayEpochMs = new Map();

  const onClick = (event) => {
    if (!active) return;
    const displayEpochMs = typeof event.time === 'number' ? Math.round(event.time * 1_000) : null;
    const bar = displayEpochMs === null ? null : barsByDisplayEpochMs.get(displayEpochMs) ?? null;
    host.dataset.lastTruncationLogical = event.logical === undefined ? 'none' : String(event.logical);
    host.dataset.lastTruncationSelection = bar ? 'bar' : 'outside-data';
    if (bar) host.dataset.lastTruncationStartEpochMs = String(bar.startEpochMs);
    onSelect(bar ? Object.freeze({
      displayEpochMs: bar.displayEpochMs,
      startEpochMs: bar.startEpochMs,
    }) : null);
  };
  chart.subscribeClick(onClick);
  chart.subscribeDblClick(onClick);

  return Object.freeze({
    dispose() {
      chart.unsubscribeClick(onClick);
      chart.unsubscribeDblClick(onClick);
      barsByDisplayEpochMs.clear();
    },
    setActive(value) {
      active = value === true;
      host.dataset.truncationSelection = active ? 'active' : 'inactive';
      chart.applyOptions({ crosshair: active ? TRUNCATION_CROSSHAIR : DEFAULT_CROSSHAIR });
    },
    setBars(bars) { barsByDisplayEpochMs = indexedBars(bars); },
  });
}
