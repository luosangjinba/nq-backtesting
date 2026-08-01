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

/** Translate native chart clicks back to projected source bucket starts. */
export function createReplayTruncationInteraction({ chart, host, interactionIndex, onSelect }) {
  let active = false;
  let normalCrosshair = DEFAULT_CROSSHAIR;

  const onClick = (event) => {
    if (!active) return;
    const displayEpochMs = typeof event.time === 'number' ? Math.round(event.time * 1_000) : null;
    const bar = displayEpochMs === null ? null : interactionIndex.barAt(displayEpochMs);
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
    },
    setActive(value) {
      active = value === true;
      host.dataset.truncationSelection = active ? 'active' : 'inactive';
      chart.applyOptions({ crosshair: active ? TRUNCATION_CROSSHAIR : normalCrosshair });
    },
    setNormalCrosshair(value) {
      normalCrosshair = value;
      if (!active) chart.applyOptions({ crosshair: normalCrosshair });
    },
  });
}
