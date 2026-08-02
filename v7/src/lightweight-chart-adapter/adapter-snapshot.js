function canvasSnapshot({ chartOptions, host, priceScaleOptions }) {
  return Object.freeze({
    backgroundColor: chartOptions.layout.background.color,
    crosshairColor: host.dataset.crosshairColor,
    crosshairOpacityPercent: Number(host.dataset.crosshairOpacityPercent),
    crosshairStyle: host.dataset.crosshairStyle,
    crosshairWidth: Number(host.dataset.crosshairWidth),
    nativeHorzCrosshair: Object.freeze({
      color: chartOptions.crosshair.horzLine.color,
      style: chartOptions.crosshair.horzLine.style,
      width: chartOptions.crosshair.horzLine.width,
    }),
    nativeVertCrosshair: Object.freeze({
      color: chartOptions.crosshair.vertLine.color,
      style: chartOptions.crosshair.vertLine.style,
      width: chartOptions.crosshair.vertLine.width,
    }),
    scaleFontSize: chartOptions.layout.fontSize,
    scaleMargins: Object.freeze({ ...priceScaleOptions.scaleMargins }),
    scaleTextColor: chartOptions.layout.textColor,
  });
}

function seriesSnapshot({ currentPriceName, seriesOptions }) {
  return Object.freeze({
    borderDownColor: seriesOptions.borderDownColor,
    borderUpColor: seriesOptions.borderUpColor,
    borderVisible: seriesOptions.borderVisible,
    downColor: seriesOptions.downColor,
    currentPriceNameOnly: currentPriceName.snapshot(),
    lastValueVisible: seriesOptions.lastValueVisible,
    priceFormat: Object.freeze({
      minMove: seriesOptions.priceFormat.minMove,
      precision: seriesOptions.priceFormat.precision ?? null,
      type: seriesOptions.priceFormat.type,
    }),
    priceLineColor: seriesOptions.priceLineColor,
    priceLineVisible: seriesOptions.priceLineVisible,
    title: seriesOptions.title,
    upColor: seriesOptions.upColor,
    wickDownColor: seriesOptions.wickDownColor,
    wickUpColor: seriesOptions.wickUpColor,
    wickVisible: seriesOptions.wickVisible,
  });
}

function timeSnapshot(chartOptions, host, latestCandleTime) {
  return Object.freeze({
    dateFormat: host.dataset.dateFormat,
    dayOfWeekVisible: host.dataset.dayOfWeekVisible === 'true',
    displayTimezone: host.dataset.displayTimezone,
    hourFormat: host.dataset.hourFormat,
    latestCrosshair: latestCandleTime === null
      ? null : chartOptions.localization.timeFormatter(latestCandleTime),
    latestTimeTick: latestCandleTime === null
      ? null : chartOptions.timeScale.tickMarkFormatter(latestCandleTime, 3, 'en-US'),
    sampleCrosshair: chartOptions.localization.timeFormatter(1_777_639_400),
    sampleTimeTick: chartOptions.timeScale.tickMarkFormatter(1_777_639_400, 3, 'en-US'),
  });
}

export function createAdapterSnapshot({
  adapterRevision,
  appliedData,
  appliedFutureTimeAxisData,
  barCount,
  chart,
  currentPriceName,
  host,
  libraryVersion,
  priceScale,
  series,
  seriesDataRevision,
  seriesWriterSnapshot,
  viewport,
}) {
  const latestCandleTime = appliedData.at(-1)?.time ?? null;
  const firstFutureTime = appliedFutureTimeAxisData[0]?.time ?? null;
  const chartOptions = chart.options();
  const priceScaleOptions = priceScale.options();
  const seriesOptions = series.options();
  return Object.freeze({
    adapterRevision,
    barCount,
    canvasPresentation: canvasSnapshot({ chartOptions, host, priceScaleOptions }),
    firstFutureTimeAxisCoordinate: firstFutureTime === null
      ? null : chart.timeScale().timeToCoordinate(firstFutureTime),
    futureTimeAxisPointCount: appliedFutureTimeAxisData.length,
    lastApplyMs: Number(host.dataset.lastApplyMs || 0),
    lastMutationMode: host.dataset.lastMutationMode ?? null,
    lastMutationMs: Number(host.dataset.lastMutationMs || 0),
    lastPaintMs: Number(host.dataset.lastPaintMs || 0),
    lastPaintProof: host.dataset.lastPaintProof ?? null,
    libraryVersion,
    latestCandleCoordinate: latestCandleTime === null
      ? null : chart.timeScale().timeToCoordinate(latestCandleTime),
    latestFutureTimeAxisEpochMs: appliedFutureTimeAxisData.at(-1)?.time * 1_000 ?? null,
    logicalRange: chart.timeScale().getVisibleLogicalRange(),
    painted: host.dataset.painted === 'true',
    priceRange: priceScale.getVisibleRange(),
    timePresentation: timeSnapshot(chartOptions, host, latestCandleTime),
    gridVisible: host.dataset.gridVisible === 'true',
    bodyVisible: host.dataset.bodyVisible === 'true',
    bordersVisible: host.dataset.bordersVisible === 'true',
    pricePrecision: host.dataset.pricePrecision ?? 'auto',
    seriesDataRevision,
    seriesWriter: seriesWriterSnapshot,
    seriesPresentation: seriesSnapshot({ currentPriceName, seriesOptions }),
    wicksVisible: host.dataset.wicksVisible === 'true',
    viewportIntent: viewport.snapshot(),
  });
}
