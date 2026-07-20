import {
  ColorType,
  CrosshairMode,
} from '../../node_modules/lightweight-charts/dist/lightweight-charts.standalone.production.mjs';

export const CANDLE_OPTIONS = Object.freeze({
  borderDownColor: '#ff667d',
  borderUpColor: '#2dd4a7',
  downColor: '#ff667d',
  wickDownColor: '#ff667d',
  wickUpColor: '#2dd4a7',
  upColor: '#2dd4a7',
});

export const CHART_OPTIONS = Object.freeze({
  autoSize: true,
  layout: Object.freeze({
    background: Object.freeze({ color: '#0b1118', type: ColorType.Solid }),
    attributionLogo: false,
    fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif',
    textColor: '#74869a',
  }),
  grid: Object.freeze({
    horzLines: Object.freeze({ color: 'rgba(42, 58, 76, 0.34)' }),
    vertLines: Object.freeze({ color: 'rgba(42, 58, 76, 0.28)' }),
  }),
  crosshair: Object.freeze({ mode: CrosshairMode.Normal }),
  rightPriceScale: Object.freeze({
    borderColor: '#263545',
    minimumWidth: 68,
    scaleMargins: Object.freeze({ bottom: 0.12, top: 0.1 }),
  }),
  timeScale: Object.freeze({
    borderColor: '#263545',
    fixLeftEdge: false,
    lockVisibleTimeRangeOnResize: true,
    rightBarStaysOnScroll: false,
    secondsVisible: false,
    timeVisible: true,
  }),
});
