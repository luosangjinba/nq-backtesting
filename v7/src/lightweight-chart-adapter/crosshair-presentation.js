function candle(bar) {
  if (!bar) return null;
  return Object.freeze({
    close: Number(bar.close),
    high: Number(bar.high),
    low: Number(bar.low),
    open: Number(bar.open),
  });
}

function observation(bar, state) {
  return Object.freeze({
    bar: candle(bar),
    displayEpochMs: bar?.displayEpochMs ?? null,
    state,
  });
}

/** Own read-only current/latest candle lookup for one chart series. */
export function createCrosshairPresentationIndex() {
  let bars = Object.freeze([]);
  let byDisplayEpochMs = new Map();

  function latest() {
    return bars.length > 0 ? observation(bars.at(-1), 'latest') : observation(null, 'empty');
  }

  return Object.freeze({
    latest,
    selectedAt(displayEpochMs) {
      const selected = byDisplayEpochMs.get(displayEpochMs) ?? null;
      return selected ? observation(selected, 'selected') : latest();
    },
    setBars(nextBars) {
      bars = Object.freeze([...nextBars]);
      byDisplayEpochMs = new Map(bars.map((bar) => [bar.displayEpochMs, bar]));
    },
  });
}
