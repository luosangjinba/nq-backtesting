import {
  normalizeContext,
  toChartBar,
} from './chart-engine-context.js';
import {
  applyFallbackMetadata,
  applyFallbackPresentation,
} from './chart-engine-dom-metadata.js';
import {
  createRuntimeCanvas,
  inferVisibleRangeFromBars,
  rangeSpanSeconds,
  renderFallbackBars,
  visibleBarsForRange,
} from './chart-engine-fallback-rendering.js';
import { markReplayTrace } from './replay-trace.js';

export function createFallbackInstance({ documentRef }) {
  let host = null;
  let canvas = null;
  let bars = [];
  let fullBarCount = 0;
  let displayContext = normalizeContext();
  let visibleRange = null;
  let metadata = {};
  let onVisibleRangeChange = null;
  let onCrosshairChange = null;
  let dragState = null;

  function activeVisibleRange() {
    return visibleRange ? { ...visibleRange } : inferVisibleRangeFromBars(bars);
  }

  function emitVisibleRangeChange(range) {
    if (!range || !onVisibleRangeChange) return;
    visibleRange = { ...range };
    onVisibleRangeChange({ ...range });
  }

  function canvasWidth() {
    const rect = canvas?.getBoundingClientRect?.();
    return Math.max(1, Number(rect?.width || canvas?.clientWidth || 1));
  }

  function emitFallbackCrosshair(event) {
    if (!onCrosshairChange || dragState || !bars.length) return;
    const candidates = visibleBarsForRange(bars, activeVisibleRange());
    if (!candidates.length) return;
    const rect = canvas?.getBoundingClientRect?.();
    const left = Number(rect?.left || 0);
    const width = canvasWidth();
    const ratio = Math.min(1, Math.max(0, (Number(event.clientX || left) - left) / width));
    const index = Math.min(candidates.length - 1, Math.max(0, Math.round(ratio * (candidates.length - 1))));
    const bar = candidates[index];
    onCrosshairChange({
      active: true,
      time: bar.time,
      price: Number(bar.close),
      bar: toChartBar(bar),
      point: {
        x: Number(event.clientX || 0),
        y: Number(event.clientY || 0),
      },
    });
  }

  function clearFallbackCrosshair() {
    onCrosshairChange?.({ active: false });
  }

  function onPointerDown(event) {
    const range = activeVisibleRange();
    if (!range || event.button > 0) return;
    dragState = {
      startX: Number(event.clientX || 0),
      range,
    };
    event.preventDefault?.();
  }

  function onPointerMove(event) {
    if (!dragState) return;
    const deltaX = Number(event.clientX || 0) - dragState.startX;
    const secondsPerPixel = rangeSpanSeconds(dragState.range) / canvasWidth();
    const shiftSeconds = Math.round(-deltaX * secondsPerPixel);
    emitVisibleRangeChange({
      from: dragState.range.from + shiftSeconds,
      to: dragState.range.to + shiftSeconds,
    });
    event.preventDefault?.();
  }

  function onMouseMove(event) {
    if (dragState) {
      onPointerMove(event);
      return;
    }
    emitFallbackCrosshair(event);
  }

  function onPointerUp() {
    dragState = null;
  }

  function onWheel(event) {
    const range = activeVisibleRange();
    if (!range) return;
    const span = rangeSpanSeconds(range);
    const rect = canvas?.getBoundingClientRect?.();
    const left = Number(rect?.left || 0);
    const width = canvasWidth();
    const pointerRatio = Math.min(1, Math.max(0, (Number(event.clientX || left + (width / 2)) - left) / width));
    const anchor = range.from + (span * pointerRatio);
    const zoomFactor = Number(event.deltaY || 0) < 0 ? 0.8 : 1.25;
    const nextSpan = Math.max(60, Math.round(span * zoomFactor));
    emitVisibleRangeChange({
      from: Math.round(anchor - (nextSpan * pointerRatio)),
      to: Math.round(anchor + (nextSpan * (1 - pointerRatio))),
    });
    event.preventDefault?.();
  }

  function bindFallbackInput() {
    if (!canvas?.addEventListener) return;
    canvas.addEventListener('mousedown', onPointerDown);
    canvas.addEventListener('mousemove', onMouseMove);
    canvas.addEventListener('mouseup', onPointerUp);
    canvas.addEventListener('mouseleave', onPointerUp);
    canvas.addEventListener('mouseleave', clearFallbackCrosshair);
    canvas.addEventListener('wheel', onWheel, { passive: false });
  }

  function unbindFallbackInput() {
    if (!canvas?.removeEventListener) return;
    canvas.removeEventListener('mousedown', onPointerDown);
    canvas.removeEventListener('mousemove', onMouseMove);
    canvas.removeEventListener('mouseup', onPointerUp);
    canvas.removeEventListener('mouseleave', onPointerUp);
    canvas.removeEventListener('mouseleave', clearFallbackCrosshair);
    canvas.removeEventListener('wheel', onWheel);
  }

  function render() {
    if (!host || !canvas) return;
    canvas.replaceChildren();
    applyFallbackPresentation(canvas, displayContext);
    applyFallbackMetadata(canvas, metadata);
    canvas.dataset.chartCanvas = 'true';
    canvas.dataset.renderedBarCount = String(bars.length);
    canvas.dataset.fullBarCount = String(fullBarCount);

    if (bars.length) {
      renderFallbackBars(documentRef, canvas, bars, displayContext, fullBarCount);
      return;
    }

    const empty = documentRef.createElement('span');
    empty.className = 'chart-empty-state';
    empty.textContent = 'Chart runtime ready';
    canvas.append(empty);
  }

  return {
    engineType: 'dom-fallback',
    mount(nextHost, options = {}) {
      host = nextHost;
      displayContext = normalizeContext(options.displayContext);
      onVisibleRangeChange = typeof options.onVisibleRangeChange === 'function'
        ? options.onVisibleRangeChange
        : null;
      onCrosshairChange = typeof options.onCrosshairChange === 'function'
        ? options.onCrosshairChange
        : null;
      canvas = createRuntimeCanvas(documentRef);
      canvas.style.cursor = 'grab';
      canvas.style.userSelect = 'none';
      host.replaceChildren();
      host.dataset.chartRuntimeMounted = 'true';
      host.dataset.chartEngine = 'dom-fallback';
      host.append(canvas);
      bindFallbackInput();
      render();
    },
    setBars(nextBars = [], options = {}) {
      markReplayTrace('fallback.setBars.start', { barCount: nextBars.length });
      bars = [...nextBars];
      fullBarCount = Number(options.fullBarCount ?? bars.length);
      if (options.displayContext) {
        displayContext = normalizeContext(options.displayContext);
      }
      metadata = options.metadata ? { ...options.metadata } : metadata;
      render();
      markReplayTrace('fallback.setBars.end', { barCount: bars.length, fullBarCount });
    },
    setMetadata(nextMetadata = {}) {
      metadata = { ...metadata, ...nextMetadata };
      if (canvas) {
        applyFallbackMetadata(canvas, metadata);
      }
    },
    setVisibleRange(range) {
      visibleRange = range ? { ...range } : null;
    },
    setPresentation(context = {}) {
      displayContext = normalizeContext(context);
      render();
    },
    appendBars(nextBars = [], options = {}) {
      markReplayTrace('fallback.append.start', {
        appendedCount: nextBars.length,
        appendMode: options.appendMode || '',
      });
      const appendedBars = [...nextBars];
      bars = Array.isArray(options.renderedBars)
        ? [...options.renderedBars]
        : [
          ...bars,
          ...appendedBars,
        ];
      fullBarCount = Number(options.fullBarCount ?? bars.length);
      if (options.displayContext) {
        displayContext = normalizeContext(options.displayContext);
      }
      metadata = options.metadata ? { ...options.metadata } : metadata;
      render();
      markReplayTrace('fallback.append.end', {
        appendedCount: appendedBars.length,
        fullBarCount,
        appendMode: options.appendMode || '',
      });
    },
    readState() {
      return {
        engineType: 'dom-fallback',
        mounted: Boolean(host),
        barCount: bars.length,
        fullBarCount,
        visibleRange: visibleRange ? { ...visibleRange } : null,
      };
    },
    destroy() {
      unbindFallbackInput();
      host?.replaceChildren();
      host = null;
      canvas = null;
      bars = [];
      visibleRange = null;
      onVisibleRangeChange = null;
      onCrosshairChange = null;
      dragState = null;
    },
  };
}
