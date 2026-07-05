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

function cloneRange(range) {
  return range ? {
    from: Number(range.from),
    to: Number(range.to),
  } : null;
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

  function measureVisibleLogicalRange() {
    ensureMounted();
    const measured = cloneRange(chart.timeScale().getVisibleLogicalRange?.());
    if (measured) {
      lastVisibleLogicalRange = measured;
    }
    return measured;
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
    destroy,
    measureVisibleLogicalRange,
    mount,
    resize,
    setData,
    setVisibleLogicalRange,
    snapshot,
    update,
  };
}
