function requireFunction(target, name) {
  if (typeof target?.[name] !== 'function') {
    throw new Error(`Lightweight chart adapter requires ${name}.`);
  }
  return target[name].bind(target);
}

function resolveCandlestickSeries(chart, engine, seriesOptions) {
  if (typeof chart.addSeries === 'function' && engine?.CandlestickSeries) {
    return chart.addSeries(engine.CandlestickSeries, seriesOptions);
  }
  if (typeof chart.addCandlestickSeries === 'function') {
    return chart.addCandlestickSeries(seriesOptions);
  }
  throw new Error('Lightweight chart adapter requires a candlestick series API.');
}

function normalizeSeriesBar(bar) {
  return {
    close: Number(bar.close),
    high: Number(bar.high),
    low: Number(bar.low),
    open: Number(bar.open),
    time: Number(bar.timestamp ?? bar.time),
  };
}

function normalizeCrosshairBar(data = {}, fallbackTime = null) {
  const timestamp = Number(data.timestamp ?? data.time ?? fallbackTime);
  const bar = {
    close: Number(data.close),
    high: Number(data.high),
    low: Number(data.low),
    open: Number(data.open),
    timestamp,
  };
  return Object.values(bar).every(Number.isFinite) ? bar : null;
}

function normalizeCrosshairEvent(param = {}, seriesApi = null) {
  const data = seriesApi && typeof param.seriesData?.get === 'function'
    ? param.seriesData.get(seriesApi)
    : null;
  const bar = data ? normalizeCrosshairBar(data, param.time) : null;
  return {
    bar,
    paneIndex: Number.isFinite(Number(param.paneIndex)) ? Number(param.paneIndex) : null,
    point: param.point
      ? {
          x: Number(param.point.x),
          y: Number(param.point.y),
        }
      : null,
    time: param.time ?? data?.time ?? null,
  };
}

function cloneRange(range) {
  return range ? {
    from: normalizeLogicalValue(range.from),
    to: normalizeLogicalValue(range.to),
  } : null;
}

function normalizeLogicalValue(value) {
  const number = Number(value);
  const rounded = Math.round(number);
  return Math.abs(number - rounded) < 1e-9 ? rounded : number;
}

export function createLightweightChartAdapter({
  chartOptions = {},
  engine = globalThis.LightweightCharts,
  seriesOptions = {},
} = {}) {
  let chart = null;
  let series = null;
  let host = null;
  let lastDataLength = 0;
  let lastVisibleLogicalRange = null;

  function mount(nextHost) {
    if (!nextHost) {
      throw new Error('Lightweight chart adapter host is required.');
    }
    if (chart) {
      throw new Error('Lightweight chart adapter is already mounted.');
    }
    const createChart = requireFunction(engine, 'createChart');
    host = nextHost;
    chart = createChart(host, chartOptions);
    series = resolveCandlestickSeries(chart, engine, seriesOptions);
    return snapshot();
  }

  function ensureMounted() {
    if (!chart || !series) {
      throw new Error('Lightweight chart adapter is not mounted.');
    }
  }

  function setData(bars = []) {
    ensureMounted();
    const data = bars.map(normalizeSeriesBar);
    series.setData(data);
    lastDataLength = data.length;
    return snapshot();
  }

  function update(bar) {
    ensureMounted();
    series.update(normalizeSeriesBar(bar));
    lastDataLength += 1;
    return snapshot();
  }

  function setVisibleLogicalRange(range) {
    ensureMounted();
    const normalizedRange = cloneRange(range);
    chart.timeScale().setVisibleLogicalRange(normalizedRange);
    lastVisibleLogicalRange = normalizedRange;
    return snapshot();
  }

  function resetPriceScale() {
    ensureMounted();
    const priceScale = typeof series.priceScale === 'function'
      ? series.priceScale()
      : chart.priceScale?.('right');
    priceScale?.applyOptions?.({ autoScale: true });
    return snapshot();
  }

  function setCrosshairPosition({ price, time } = {}) {
    ensureMounted();
    const normalizedPrice = Number(price);
    if (!Number.isFinite(normalizedPrice) || time == null) {
      return snapshot();
    }
    try {
      chart.setCrosshairPosition?.(normalizedPrice, time, series);
    } catch {
      return snapshot();
    }
    return snapshot();
  }

  function clearCrosshairPosition() {
    ensureMounted();
    chart.clearCrosshairPosition?.();
    return snapshot();
  }

  function measureVisibleLogicalRange() {
    ensureMounted();
    const measured = cloneRange(chart.timeScale().getVisibleLogicalRange?.());
    if (measured) {
      lastVisibleLogicalRange = measured;
    }
    return measured;
  }

  function subscribeVisibleLogicalRangeChange(handler) {
    ensureMounted();
    if (typeof handler !== 'function') {
      throw new Error('Lightweight chart adapter visible range handler is required.');
    }
    const timeScale = chart.timeScale();
    if (typeof timeScale.subscribeVisibleLogicalRangeChange !== 'function') {
      return () => {};
    }
    const listener = (range) => {
      const normalizedRange = cloneRange(range);
      if (normalizedRange) {
        lastVisibleLogicalRange = normalizedRange;
      }
      handler(normalizedRange);
    };
    timeScale.subscribeVisibleLogicalRangeChange(listener);
    return () => {
      timeScale.unsubscribeVisibleLogicalRangeChange?.(listener);
    };
  }

  function subscribeCrosshairMove(handler) {
    ensureMounted();
    if (typeof handler !== 'function') {
      throw new Error('Lightweight chart adapter crosshair handler is required.');
    }
    if (typeof chart.subscribeCrosshairMove !== 'function') {
      return () => {};
    }
    const listener = (param) => {
      handler(normalizeCrosshairEvent(param, series));
    };
    chart.subscribeCrosshairMove(listener);
    return () => {
      chart.unsubscribeCrosshairMove?.(listener);
    };
  }

  function resize({ height, width } = {}) {
    ensureMounted();
    if (typeof chart.resize === 'function') {
      chart.resize(Number(width), Number(height));
    }
    return snapshot();
  }

  function destroy() {
    chart?.remove?.();
    chart = null;
    series = null;
    host = null;
    lastDataLength = 0;
    lastVisibleLogicalRange = null;
  }

  function snapshot() {
    return {
      dataLength: lastDataLength,
      mounted: Boolean(chart && series && host),
      visibleLogicalRange: cloneRange(lastVisibleLogicalRange),
    };
  }

  return {
    clearCrosshairPosition,
    destroy,
    measureVisibleLogicalRange,
    mount,
    resize,
    resetPriceScale,
    setCrosshairPosition,
    setData,
    setVisibleLogicalRange,
    snapshot,
    subscribeCrosshairMove,
    subscribeVisibleLogicalRangeChange,
    update,
  };
}
