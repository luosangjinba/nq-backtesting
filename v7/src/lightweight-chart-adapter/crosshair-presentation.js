function candle(bar) {
  if (!bar) return null;
  return Object.freeze({
    close: Number(bar.close),
    high: Number(bar.high),
    low: Number(bar.low),
    open: Number(bar.open),
  });
}

function observation(entry, state) {
  const bar = entry?.bar ?? null;
  const previousClose = entry?.previousClose;
  const changeValue = bar && Number.isFinite(previousClose)
    ? Number(bar.close) - Number(previousClose)
    : null;
  return Object.freeze({
    bar: candle(bar),
    change: Number.isFinite(changeValue) ? Object.freeze({
      percent: previousClose === 0 ? null : (changeValue / previousClose) * 100,
      value: changeValue,
    }) : null,
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
      bars = Object.freeze(nextBars.map((bar, index) => Object.freeze({
        bar,
        previousClose: index > 0 ? Number(nextBars[index - 1].close) : null,
      })));
      byDisplayEpochMs = new Map(bars.map((entry) => [entry.bar.displayEpochMs, entry]));
    },
  });
}
