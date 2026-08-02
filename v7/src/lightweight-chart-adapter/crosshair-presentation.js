function candle(bar) {
  if (!bar) return null;
  return Object.freeze({
    close: Number(bar.close),
    high: Number(bar.high),
    low: Number(bar.low),
    open: Number(bar.open),
    volume: bar.volume === null ? null : Number(bar.volume),
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

  function indexAt(displayEpochMs) {
    let low = 0;
    let high = bars.length - 1;
    while (low <= high) {
      const middle = Math.floor((low + high) / 2);
      const value = bars[middle].displayEpochMs;
      if (value === displayEpochMs) return middle;
      if (value < displayEpochMs) low = middle + 1;
      else high = middle - 1;
    }
    return -1;
  }

  function entry(index) {
    return index < 0 ? null : Object.freeze({
      bar: bars[index],
      previousClose: index > 0 ? Number(bars[index - 1].close) : null,
    });
  }

  function latest() {
    return bars.length > 0 ? observation(entry(bars.length - 1), 'latest') : observation(null, 'empty');
  }

  return Object.freeze({
    barAt(displayEpochMs) {
      return bars[indexAt(displayEpochMs)] ?? null;
    },
    latest,
    selectedAt(displayEpochMs) {
      const selected = entry(indexAt(displayEpochMs));
      return selected ? observation(selected, 'selected') : latest();
    },
    setBars(nextBars) { bars = nextBars; },
    timeLabelAt(displayEpochMs) {
      const bar = bars[indexAt(displayEpochMs)] ?? null;
      return Object.freeze({
        epochMs: bar?.labelDate ? null : (bar?.startEpochMs ?? displayEpochMs),
        labelDate: bar?.labelDate ?? null,
      });
    },
  });
}
