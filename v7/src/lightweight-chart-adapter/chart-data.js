function chartBar(bar) {
  return Object.freeze({
    close: bar.close,
    high: bar.high,
    low: bar.low,
    open: bar.open,
    time: bar.displayEpochMs / 1_000,
  });
}

/** Reuse an immutable projected prefix while converting only the changed Chart tail. */
export function createChartData(workspaceSnapshot, previousBars, previousData) {
  const bars = workspaceSnapshot.bars;
  let sharedPrefixLength = 0;
  const sharedLimit = Math.min(bars.length, previousBars.length);
  while (sharedPrefixLength < sharedLimit
    && bars[sharedPrefixLength] === previousBars[sharedPrefixLength]) {
    sharedPrefixLength += 1;
  }
  return Object.freeze([
    ...previousData.slice(0, sharedPrefixLength),
    ...bars.slice(sharedPrefixLength).map(chartBar),
  ]);
}

export function maximumDisplayGapMs(data) {
  let maximum = 0;
  for (let index = 1; index < data.length; index += 1) {
    maximum = Math.max(maximum, (data[index].time - data[index - 1].time) * 1_000);
  }
  return maximum;
}
