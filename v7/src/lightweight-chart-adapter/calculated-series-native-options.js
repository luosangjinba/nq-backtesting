import {
  AreaSeries,
  BaselineSeries,
  HistogramSeries,
  LineSeries,
  LineStyle,
  PriceScaleMode,
} from '../../node_modules/lightweight-charts/dist/lightweight-charts.standalone.production.mjs';

const SERIES_DEFINITIONS = Object.freeze({
  area: AreaSeries,
  baseline: BaselineSeries,
  histogram: HistogramSeries,
  line: LineSeries,
});

export function nativeLineStyle(pattern) {
  if (pattern === 'dashed') return LineStyle.Dashed;
  if (pattern === 'dotted') return LineStyle.Dotted;
  return LineStyle.Solid;
}

function decimalFormatter(decimals, suffix = '') {
  return (value) => `${Number(value).toFixed(decimals)}${suffix}`;
}

function volumeFormatter(decimals, compact) {
  if (!compact) return decimalFormatter(decimals);
  return (value) => {
    const absolute = Math.abs(value);
    const entry = absolute >= 1_000_000_000 ? [1_000_000_000, 'B']
      : absolute >= 1_000_000 ? [1_000_000, 'M']
        : absolute >= 1_000 ? [1_000, 'K'] : [1, ''];
    return `${(value / entry[0]).toFixed(decimals)}${entry[1]}`;
  };
}

export function nativePriceFormat(intent, priceIncrement = 0.01) {
  const { formatterId, options } = intent.formatter;
  const decimals = options.decimals;
  const formatter = formatterId === 'host.percentage'
    ? decimalFormatter(decimals, '%')
    : formatterId === 'host.volume'
      ? volumeFormatter(decimals, options.compact)
      : decimalFormatter(decimals);
  return Object.freeze({
    formatter,
    minMove: formatterId === 'host.price'
      ? Number(priceIncrement) : 10 ** -decimals,
    type: 'custom',
  });
}

const COMMON = Object.freeze({
  crosshairMarkerVisible: false,
  lastValueVisible: false,
  priceLineVisible: false,
});

export function nativeAnchorOptions(scale, nativeScaleId, priceIncrement) {
  const range = anchorScaleRange(scale);
  return Object.freeze({
    ...COMMON,
    autoscaleInfoProvider: () => (range === null ? null : {
      priceRange: { maxValue: range.maximum, minValue: range.minimum },
    }),
    color: 'rgba(0,0,0,0)',
    lineVisible: false,
    priceFormat: nativePriceFormat(scale.intent, priceIncrement),
    priceScaleId: nativeScaleId,
    title: '',
    visible: true,
  });
}

function scalarOptions(resource, nativeScaleId) {
  const common = {
    ...COMMON,
    priceScaleId: nativeScaleId,
    title: resource.title,
    visible: true,
  };
  if (resource.kind === 'line') return Object.freeze({
    ...common,
    color: resource.style.stroke.color,
    lineStyle: nativeLineStyle(resource.style.stroke.pattern),
    lineWidth: resource.style.stroke.width,
  });
  if (resource.kind === 'histogram') return Object.freeze({
    ...common,
    base: resource.style.baseValue,
    color: resource.style.positiveColor,
  });
  if (resource.kind === 'area') return Object.freeze({
    ...common,
    bottomColor: resource.style.bottomFillColor,
    lineColor: resource.style.stroke.color,
    lineStyle: nativeLineStyle(resource.style.stroke.pattern),
    lineWidth: resource.style.stroke.width,
    topColor: resource.style.topFillColor,
  });
  return Object.freeze({
    ...common,
    baseValue: Object.freeze({ price: resource.style.baseValue, type: 'price' }),
    bottomFillColor1: resource.style.bottomFillColor,
    bottomFillColor2: resource.style.bottomFillColor,
    bottomLineColor: resource.style.bottomStroke.color,
    lineStyle: nativeLineStyle(resource.style.topStroke.pattern),
    lineWidth: resource.style.topStroke.width,
    topFillColor1: resource.style.topFillColor,
    topFillColor2: resource.style.topFillColor,
    topLineColor: resource.style.topStroke.color,
  });
}

export function nativePlotDefinition(kind) {
  return SERIES_DEFINITIONS[kind];
}

export function nativePlotOptions(resource, nativeScaleId, { title = resource.title } = {}) {
  return scalarOptions({ ...resource, title }, nativeScaleId);
}

export function nativePlotData(resource, points = resource.points) {
  return Object.freeze(points.map((point) => {
    const time = point.displayEpochMs / 1_000;
    if (point.state === 'whitespace') return Object.freeze({ time });
    if (resource.kind !== 'histogram') return Object.freeze({ time, value: point.value });
    return Object.freeze({
      color: point.value >= resource.style.baseValue
        ? resource.style.positiveColor : resource.style.negativeColor,
      time,
      value: point.value,
    });
  }));
}

export function nativePriceLineOptions(resource) {
  return Object.freeze({
    axisLabelVisible: resource.style.labelVisibility === 'visible',
    color: resource.style.stroke.color,
    lineStyle: nativeLineStyle(resource.style.stroke.pattern),
    lineVisible: true,
    lineWidth: resource.style.stroke.width,
    price: resource.value,
    title: resource.title,
  });
}

export function nativeScaleMode(intent) {
  return intent.transform === 'logarithmic'
    ? PriceScaleMode.Logarithmic : PriceScaleMode.Normal;
}

export function anchorData(scale) {
  const range = anchorScaleRange(scale);
  if (scale.times.length === 0 || range === null) return Object.freeze([]);
  const { maximum, minimum } = range;
  const first = scale.times[0] / 1_000;
  const last = scale.times.at(-1) / 1_000;
  if (first === last || minimum === maximum) return Object.freeze([{ time: first, value: minimum }]);
  return Object.freeze([{ time: first, value: minimum }, { time: last, value: maximum }]);
}

export function anchorScaleRange(scale) {
  if (scale.extent.minimum === null) return null;
  let minimum = scale.extent.minimum;
  let maximum = scale.extent.maximum;
  if (scale.intent.zeroPolicy === 'include') {
    minimum = Math.min(0, minimum);
    maximum = Math.max(0, maximum);
  }
  if (scale.intent.domain.kind === 'symmetric-around-zero') {
    const magnitude = scale.intent.domain.magnitude === 'auto'
      ? Math.max(Math.abs(minimum), Math.abs(maximum)) : scale.intent.domain.magnitude;
    minimum = -magnitude;
    maximum = magnitude;
  }
  return Object.freeze({ maximum, minimum });
}

export function fixedScaleRange(intent) {
  if (intent.domain.kind === 'fixed') {
    return Object.freeze({ from: intent.domain.minimum, to: intent.domain.maximum });
  }
  if (intent.domain.kind === 'symmetric-around-zero' && intent.domain.magnitude !== 'auto') {
    return Object.freeze({ from: -intent.domain.magnitude, to: intent.domain.magnitude });
  }
  return null;
}
