// 全局常量 — 单一事实来源，替代 v3 中 4 处重复的 timeframe map

export const API_BASE = 'http://127.0.0.1:8766';

export const TIMEFRAME_MAP = {
  1: '1M',
  5: '5M',
  15: '15M',
  30: '30M',
  60: '1H',
  240: '4H',
  1440: 'D',
  10080: '1W',
};

export const TIMEFRAME_TO_SECONDS = {
  '1M': 60,
  '5M': 300,
  '15M': 900,
  '30M': 1800,
  '1H': 3600,
  '4H': 14400,
  D: 86400,
  '1W': 604800,
};

export const DEFAULT_TIMEFRAME = 60;

export const CHART_THEME = {
  layout: {
    background: { color: '#131722' },
    textColor: '#d1d4dc',
  },
  grid: {
    vertLines: { color: '#1e222d' },
    horzLines: { color: '#1e222d' },
  },
  crosshair: {
    mode: 0, // Ordinary
  },
  rightPriceScale: {
    borderColor: '#2a2e39',
  },
  timeScale: {
    borderColor: '#2a2e39',
    timeVisible: true,
    secondsVisible: false,
  },
};

export const CANDLESTICK_STYLE = {
  upColor: '#26a69a',
  downColor: '#ef5350',
  borderDownColor: '#ef5350',
  borderUpColor: '#26a69a',
  wickDownColor: '#ef5350',
  wickUpColor: '#26a69a',
};

export const TIME_SCALE_DISPLAY = {
  barSpacing: 6,
  minBarSpacing: 2,
  rightOffset: 7,
  fixLeftEdge: false,
  fixRightEdge: false,
};

export const VIEWPORT_RIGHT_OFFSET_BARS = 7;

export const PDA_TYPES = [
  { id: 'bsl', name: 'BSL', category: 'point', color: '#26a69a', labelPosition: 'above' },
  { id: 'ssl', name: 'SSL', category: 'point', color: '#ef5350', labelPosition: 'below' },
  { id: 'fvg', name: 'FVG', category: 'range', color: '#ab47bc' },
  { id: 'ob', name: 'OB', category: 'range', color: '#ffa726' },
  { id: 'eqh', name: 'EQH', category: 'composite', color: '#26a69a', labelPosition: 'above' },
  { id: 'eql', name: 'EQL', category: 'composite', color: '#ef5350', labelPosition: 'below' },
];

export function timeframeToString(tf) {
  return TIMEFRAME_MAP[tf] || '1H';
}
