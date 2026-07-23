import {
  ColorType,
  CrosshairMode,
  TickMarkType,
} from '../../node_modules/lightweight-charts/dist/lightweight-charts.standalone.production.mjs';
import {
  createTimePresentation,
  createWorkstationSettings,
} from '../workstation-settings/public.js';

export const EXCHANGE_TIME_ZONE = 'America/New_York';

function semanticTickType(type) {
  if (type === TickMarkType.Year) return 'year';
  if (type === TickMarkType.Month) return 'month';
  if (type === TickMarkType.DayOfMonth) return 'day';
  if (type === TickMarkType.TimeWithSeconds) return 'time-with-seconds';
  return 'time';
}

/** Map one Settings value to native Lightweight Charts time-formatting options. */
export function createChartTimePresentation(settings = createWorkstationSettings()) {
  const presentation = createTimePresentation(settings);
  return Object.freeze({
    tickMarkFormatter(value, type) {
      return presentation.formatAxisTick(Number(value) * 1_000, semanticTickType(type));
    },
    timeFormatter: (value) => presentation.formatChartCrosshair(Number(value) * 1_000),
  });
}

/** Backward-compatible default New York formatter used by adapter evidence. */
export function createExchangeTimePresentation(_locale = undefined) {
  return createChartTimePresentation(createWorkstationSettings());
}

const exchangeTimePresentation = createChartTimePresentation();

export const CANDLE_OPTIONS = Object.freeze({
  borderDownColor: '#f23645',
  borderUpColor: '#089981',
  downColor: '#f23645',
  wickDownColor: '#f23645',
  wickUpColor: '#089981',
  upColor: '#089981',
});

export const CHART_OPTIONS = Object.freeze({
  autoSize: true,
  localization: Object.freeze({ timeFormatter: exchangeTimePresentation.timeFormatter }),
  layout: Object.freeze({
    background: Object.freeze({ color: '#000000', type: ColorType.Solid }),
    attributionLogo: false,
    fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif',
    fontSize: 12,
    textColor: '#b8bdc5',
  }),
  grid: Object.freeze({
    horzLines: Object.freeze({ color: '#181818' }),
    vertLines: Object.freeze({ color: '#181818' }),
  }),
  crosshair: Object.freeze({ mode: CrosshairMode.Normal }),
  rightPriceScale: Object.freeze({
    borderColor: '#2b2b2b',
    minimumWidth: 68,
    scaleMargins: Object.freeze({ bottom: 0.12, top: 0.1 }),
  }),
  timeScale: Object.freeze({
    borderColor: '#2b2b2b',
    fixLeftEdge: false,
    lockVisibleTimeRangeOnResize: true,
    rightBarStaysOnScroll: false,
    secondsVisible: false,
    timeVisible: true,
    tickMarkFormatter: exchangeTimePresentation.tickMarkFormatter,
  }),
});
