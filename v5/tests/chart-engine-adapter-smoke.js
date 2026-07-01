import assert from 'node:assert/strict';
import { createChartEngineAdapter } from '../src/runtime/chart-engine-adapter.js';

function createElement(tagName) {
  const listeners = new Map();
  return {
    tagName,
    children: [],
    className: '',
    dataset: {},
    style: {},
    attributes: {},
    title: '',
    textContent: '',
    isConnected: true,
    clientWidth: 800,
    append(child) {
      this.children.push(child);
    },
    replaceChildren(...children) {
      this.children = children;
    },
    setAttribute(name, value) {
      this.attributes[name] = value;
    },
    addEventListener(type, handler) {
      const handlers = listeners.get(type) || [];
      handlers.push(handler);
      listeners.set(type, handlers);
    },
    removeEventListener(type, handler) {
      const handlers = listeners.get(type) || [];
      listeners.set(type, handlers.filter((candidate) => candidate !== handler));
    },
    dispatchEvent(event) {
      event.preventDefault ||= () => {
        event.defaultPrevented = true;
      };
      (listeners.get(event.type) || []).forEach((handler) => handler(event));
    },
    getBoundingClientRect() {
      return {
        left: 0,
        width: this.clientWidth,
      };
    },
  };
}

function bar(minute, open) {
  return {
    time: `2026-06-01T09:${String(minute).padStart(2, '0')}:00.000Z`,
    open,
    high: open + 1,
    low: open - 1,
    close: open + 0.5,
  };
}

function flushFrame() {
  return new Promise((resolve) => setTimeout(resolve, 20));
}

const documentRef = { createElement };

const fallbackVisibleRangeEvents = [];
const fallbackCrosshairEvents = [];
const fallbackHost = createElement('div');
const fallback = createChartEngineAdapter({ engine: null, documentRef });
fallback.mount(fallbackHost, {
  displayContext: {
    rightOffsetBars: 2,
    margins: { topPercent: 8, bottomPercent: 12 },
  },
  onVisibleRangeChange: (range) => fallbackVisibleRangeEvents.push(range),
  onCrosshairChange: (crosshair) => fallbackCrosshairEvents.push(crosshair),
});
fallback.setBars([bar(30, 100), bar(31, 101)], { fullBarCount: 12 });
fallback.setVisibleRange({
  from: Date.parse('2026-06-01T09:30:00.000Z') / 1000,
  to: Date.parse('2026-06-01T09:31:00.000Z') / 1000,
});
fallbackHost.children[0].dispatchEvent({
  type: 'mousemove',
  clientX: 800,
  clientY: 120,
});
fallbackHost.children[0].dispatchEvent({
  type: 'mouseleave',
});
fallbackHost.children[0].dispatchEvent({
  type: 'mousedown',
  button: 0,
  clientX: 400,
});
fallbackHost.children[0].dispatchEvent({
  type: 'mousemove',
  clientX: 800,
});
fallbackHost.children[0].dispatchEvent({
  type: 'mouseup',
});
fallbackHost.children[0].dispatchEvent({
  type: 'wheel',
  clientX: 400,
  deltaY: -1,
});

assert.equal(fallback.readState().engineType, 'dom-fallback');
assert.equal(fallback.readState().barCount, 2);
assert.equal(fallback.readState().fullBarCount, 12);
assert.equal(fallbackHost.dataset.chartEngine, 'dom-fallback');
assert.equal(fallbackHost.children[0].dataset.renderedBarCount, '2');
assert.equal(fallbackHost.children[0].dataset.fullBarCount, '12');
assert.equal(fallbackCrosshairEvents.length, 2);
assert.deepEqual(fallbackCrosshairEvents[0], {
  active: true,
  time: '2026-06-01T09:31:00.000Z',
  price: 101.5,
  bar: {
    time: '2026-06-01T09:31:00.000Z',
    open: 101,
    high: 102,
    low: 100,
    close: 101.5,
  },
  point: { x: 800, y: 120 },
});
assert.deepEqual(fallbackCrosshairEvents[1], { active: false });
assert.equal(fallbackVisibleRangeEvents.length, 2);
assert.deepEqual(fallbackVisibleRangeEvents[0], {
  from: Date.parse('2026-06-01T09:29:30.000Z') / 1000,
  to: Date.parse('2026-06-01T09:30:30.000Z') / 1000,
});
assert.deepEqual(fallbackVisibleRangeEvents[1], {
  from: Date.parse('2026-06-01T09:29:30.000Z') / 1000,
  to: Date.parse('2026-06-01T09:30:30.000Z') / 1000,
});
fallback.destroy();
assert.equal(fallbackHost.children.length, 0);

const lightweightCalls = {
  created: 0,
  setData: [],
  setVisibleRange: [],
  setVisibleLogicalRange: [],
  applyOptions: [],
  seriesApplyOptions: [],
  priceScaleApplyOptions: [],
  subscribed: null,
  crosshairHandler: null,
  unsubscribed: null,
  unsubscribedCrosshair: null,
  removed: 0,
};
const fakeLightweightCharts = {
  createChart(host, options) {
    lightweightCalls.created += 1;
    lightweightCalls.host = host;
    lightweightCalls.options = options;
    return {
      addCandlestickSeries(options = {}) {
        lightweightCalls.seriesOptions = options;
        lightweightCalls.series = {
          setData(data) {
            lightweightCalls.setData.push(data);
          },
          priceScale() {
            return {
              applyOptions(optionsPayload) {
                lightweightCalls.priceScaleApplyOptions.push(optionsPayload);
              },
            };
          },
          applyOptions(optionsPayload) {
            lightweightCalls.seriesApplyOptions.push(optionsPayload);
          },
        };
        return lightweightCalls.series;
      },
      applyOptions(optionsPayload) {
        lightweightCalls.applyOptions.push(optionsPayload);
      },
      timeScale() {
        return {
          setVisibleLogicalRange(range) {
            lightweightCalls.setVisibleLogicalRange.push(range);
          },
          setVisibleRange(range) {
            lightweightCalls.setVisibleRange.push(range);
          },
          subscribeVisibleTimeRangeChange(handler) {
            lightweightCalls.subscribed = handler;
          },
          unsubscribeVisibleTimeRangeChange(handler) {
            lightweightCalls.unsubscribed = handler;
          },
        };
      },
      subscribeCrosshairMove(handler) {
        lightweightCalls.crosshairHandler = handler;
      },
      unsubscribeCrosshairMove(handler) {
        lightweightCalls.unsubscribedCrosshair = handler;
      },
      remove() {
        lightweightCalls.removed += 1;
      },
    };
  },
};

const visibleRangeEvents = [];
const lightweightCrosshairEvents = [];
const lightweightHost = createElement('div');
const lightweight = createChartEngineAdapter({
  engine: fakeLightweightCharts,
  documentRef,
});
lightweight.mount(lightweightHost, {
  displayContext: { rightOffsetBars: 3 },
  onVisibleRangeChange: (range, metadata) => visibleRangeEvents.push({ range, metadata }),
  onCrosshairChange: (crosshair) => lightweightCrosshairEvents.push(crosshair),
});
lightweight.setBars([bar(32, 102), bar(33, 103)], { fullBarCount: 8, followViewport: true });
lightweight.setPresentation({
  rightOffsetBars: 4,
  candleStyle: {
    body: { up: '#22c55e', down: '#dc2626' },
    border: { up: '#16a34a', down: '#991b1b' },
    wick: { up: '#86efac', down: '#fca5a5' },
  },
});
lightweight.setVisibleRange({
  from: Date.parse('2026-06-01T09:32:00.000Z') / 1000,
  to: Date.parse('2026-06-01T09:33:00.000Z') / 1000,
});
lightweightHost.children[0].dispatchEvent({
  type: 'mousedown',
  button: 0,
  clientX: 400,
});
lightweightCalls.subscribed({
  from: Date.parse('2026-06-01T09:31:00.000Z') / 1000,
  to: Date.parse('2026-06-01T09:33:00.000Z') / 1000,
});
lightweightCalls.crosshairHandler({
  time: Date.parse('2026-06-01T09:33:00.000Z') / 1000,
  price: 104,
  point: { x: 72, y: 44 },
  seriesData: new Map([[
    lightweightCalls.series,
    {
      time: Date.parse('2026-06-01T09:33:00.000Z') / 1000,
      open: 103,
      high: 104,
      low: 102,
      close: 103.5,
    },
  ]]),
});
await flushFrame();
lightweightCalls.crosshairHandler({});
await flushFrame();

assert.equal(lightweight.readState().engineType, 'lightweight-charts');
assert.equal(lightweight.readState().barCount, 2);
assert.equal(lightweightCalls.created, 1);
assert.equal(lightweightHost.dataset.chartEngine, 'lightweight-charts');
assert.deepEqual(lightweightCalls.options.handleScroll, {
  mouseWheel: false,
  pressedMouseMove: true,
  horzTouchDrag: true,
  vertTouchDrag: false,
});
assert.deepEqual(lightweightCalls.options.handleScale, {
  axisPressedMouseMove: true,
  mouseWheel: true,
  pinch: true,
});
assert.equal(lightweightCalls.options.localization.priceFormatter(103.5), '103.50');
assert.deepEqual(lightweightCalls.options.grid, {
  vertLines: {
    color: 'rgba(55, 65, 81, 0.28)',
    style: 0,
    visible: true,
  },
  horzLines: {
    color: 'rgba(55, 65, 81, 0.28)',
    style: 0,
    visible: true,
  },
});
assert.deepEqual(lightweightCalls.options.crosshair, {
  vertLine: {
    color: 'rgba(148, 163, 184, 0.42)',
    width: 1,
    style: 2,
    labelBackgroundColor: '#334155',
  },
  horzLine: {
    color: 'rgba(148, 163, 184, 0.42)',
    width: 1,
    style: 2,
    labelBackgroundColor: '#334155',
  },
});
assert.deepEqual(lightweightCalls.options.timeScale, {
  borderColor: '#2b2f36',
  barSpacing: 10,
  minBarSpacing: 3,
  lockVisibleTimeRangeOnResize: true,
  rightBarStaysOnScroll: true,
  shiftVisibleRangeOnNewBar: false,
  fixLeftEdge: false,
  fixRightEdge: false,
  rightOffset: 3,
  tickMarkFormatter: lightweightCalls.options.timeScale.tickMarkFormatter,
});
assert.equal(
  lightweightCalls.options.timeScale.tickMarkFormatter(Date.parse('2026-06-01T09:33:00.000Z') / 1000),
  '09:33'
);
assert.equal(
  lightweightCalls.options.timeScale.tickMarkFormatter(Date.parse('2026-06-01T00:00:00.000Z') / 1000),
  '06-01'
);
assert.deepEqual(lightweightCalls.seriesOptions, {
  priceFormat: {
    type: 'price',
    precision: 2,
    minMove: 0.01,
  },
  upColor: '#26a69a',
  downColor: '#ef5350',
  borderUpColor: '#26a69a',
  borderDownColor: '#ef5350',
  wickUpColor: '#26a69a',
  wickDownColor: '#ef5350',
});
assert.deepEqual(lightweightCalls.seriesApplyOptions.at(-1), {
  priceFormat: {
    type: 'price',
    precision: 2,
    minMove: 0.01,
  },
  upColor: '#22c55e',
  downColor: '#dc2626',
  borderUpColor: '#16a34a',
  borderDownColor: '#991b1b',
  wickUpColor: '#86efac',
  wickDownColor: '#fca5a5',
});
assert.equal(lightweightHost.children[0].dataset.timeScaleBarSpacing, '10');
assert.equal(lightweightHost.children[0].dataset.timeScaleMinBarSpacing, '3');
assert.equal(lightweightHost.children[0].dataset.timeScaleLockOnResize, 'true');
assert.equal(lightweightHost.children[0].dataset.timeScaleRightBarStaysOnScroll, 'true');
assert.equal(lightweightHost.children[0].dataset.handleScrollMouseWheel, 'false');
assert.equal(lightweightHost.children[0].dataset.handleScrollPressedMouseMove, 'true');
assert.equal(lightweightHost.children[0].dataset.handleScaleMouseWheel, 'true');
assert.equal(lightweightHost.children[0].dataset.timeScaleRightOffset, '4');
assert.equal(lightweightHost.children[0].dataset.lightweightMarginTopPercent, '10');
assert.equal(lightweightHost.children[0].dataset.lightweightMarginBottomPercent, '8');
assert.equal(lightweightHost.children[0].dataset.priceScaleMarginTop, '0.1');
assert.equal(lightweightHost.children[0].dataset.priceScaleMarginBottom, '0.08');
assert.equal(lightweightHost.children[0].style.paddingTop, '');
assert.equal(lightweightHost.children[0].style.paddingBottom, '');
assert.equal(lightweightHost.children[0].style.paddingRight, '');
assert.equal(lightweightHost.children[0].dataset.pricePrecision, '2');
assert.equal(lightweightHost.children[0].dataset.priceMinMove, '0.01');
assert.equal(lightweightHost.children[0].dataset.candleBodyUp, '#22c55e');
assert.equal(lightweightHost.children[0].dataset.candleBorderDown, '#991b1b');
assert.deepEqual(
  lightweightCalls.setData[0].map((item) => item.time),
  [
    Date.parse('2026-06-01T09:32:00.000Z') / 1000,
    Date.parse('2026-06-01T09:33:00.000Z') / 1000,
  ]
);
assert.deepEqual(lightweightCalls.setVisibleLogicalRange[0], { from: 0, to: 4 });
assert.equal(lightweightHost.children[0].dataset.visibleLogicalRangeFrom, undefined);
assert.equal(lightweightHost.children[0].dataset.visibleLogicalRangeTo, undefined);
assert.deepEqual(lightweightCalls.applyOptions[0], {
  handleScroll: {
    mouseWheel: false,
    pressedMouseMove: true,
    horzTouchDrag: true,
    vertTouchDrag: false,
  },
  handleScale: {
    axisPressedMouseMove: true,
    mouseWheel: true,
    pinch: true,
  },
  grid: {
    vertLines: {
      color: 'rgba(55, 65, 81, 0.28)',
      style: 0,
      visible: true,
    },
    horzLines: {
      color: 'rgba(55, 65, 81, 0.28)',
      style: 0,
      visible: true,
    },
  },
  crosshair: {
    vertLine: {
      color: 'rgba(148, 163, 184, 0.42)',
      width: 1,
      style: 2,
      labelBackgroundColor: '#334155',
    },
    horzLine: {
      color: 'rgba(148, 163, 184, 0.42)',
      width: 1,
      style: 2,
      labelBackgroundColor: '#334155',
    },
  },
  localization: {
    priceFormatter: lightweightCalls.applyOptions[0].localization.priceFormatter,
  },
  timeScale: {
    barSpacing: 10,
    minBarSpacing: 3,
    lockVisibleTimeRangeOnResize: true,
    rightBarStaysOnScroll: true,
    shiftVisibleRangeOnNewBar: false,
    fixLeftEdge: false,
    fixRightEdge: false,
    rightOffset: 4,
    tickMarkFormatter: lightweightCalls.applyOptions[0].timeScale.tickMarkFormatter,
  },
});
assert.equal(
  lightweightCalls.applyOptions[0].timeScale.tickMarkFormatter(Date.parse('2026-06-01T09:33:00.000Z') / 1000),
  '09:33'
);
assert.deepEqual(lightweightCalls.priceScaleApplyOptions, [
  {
    scaleMargins: {
      top: 0.1,
      bottom: 0.08,
    },
  },
  {
    scaleMargins: {
      top: 0.1,
      bottom: 0.08,
    },
  },
  {
    scaleMargins: {
      top: 0.1,
      bottom: 0.08,
    },
  },
]);
assert.deepEqual(lightweightCalls.setVisibleRange[0], {
  from: Date.parse('2026-06-01T09:32:00.000Z') / 1000,
  to: Date.parse('2026-06-01T09:33:00.000Z') / 1000,
});
assert.deepEqual(visibleRangeEvents[0], {
  range: {
    from: Date.parse('2026-06-01T09:31:00.000Z') / 1000,
    to: Date.parse('2026-06-01T09:33:00.000Z') / 1000,
  },
  metadata: { source: 'lightweight-native' },
});
assert.deepEqual(lightweightCrosshairEvents[0], {
  active: true,
  time: Date.parse('2026-06-01T09:33:00.000Z') / 1000,
  price: 104,
  bar: {
    time: '2026-06-01T09:33:00.000Z',
    open: 103,
    high: 104,
    low: 102,
    close: 103.5,
  },
  point: { x: 72, y: 44 },
});
assert.deepEqual(lightweightCrosshairEvents[1], { active: false });
lightweight.destroy();
assert.equal(lightweightCalls.unsubscribed, lightweightCalls.subscribed);
assert.equal(lightweightCalls.unsubscribedCrosshair, lightweightCalls.crosshairHandler);
assert.equal(lightweightCalls.removed, 1);

console.log('v5 chart engine adapter smoke passed');
