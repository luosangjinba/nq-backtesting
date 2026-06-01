import { timestampRangeToXRange, timestampToXCoordinate } from '../time-overlays/time-coordinate.js';

const DEFAULT_OPTIONS = {
  fillColor: 'rgba(255, 213, 79, 0.26)',
  borderColor: 'rgba(255, 236, 179, 0.96)',
  minWidth: 12,
  minHeight: 8,
  lineWidth: 2,
  markerSize: 5,
};

function withAlpha(color, alpha) {
  const match = String(color).match(/^rgba\(([^)]+)\)$/i);
  if (!match) return color;
  const parts = match[1].split(',').map((part) => part.trim());
  if (parts.length < 3) return color;
  return `rgba(${parts[0]}, ${parts[1]}, ${parts[2]}, ${alpha})`;
}

function getChartInstance(context) {
  return context?.getChart?.() || null;
}

function getDisplayBars(context) {
  const bars = context?.getDisplayBars?.();
  return Array.isArray(bars) ? bars : [];
}

function getXCoordinate(context, timestamp) {
  return timestampToXCoordinate({
    chartInstance: getChartInstance(context),
    displayBars: getDisplayBars(context),
    timeframe: context?.timeframe,
    timestamp,
  });
}

function getPriceCoordinate(context, price) {
  const y = context?.priceToCoordinate?.(price);
  return y === null || y === undefined ? null : y;
}

function getRangeRect(context, geometry) {
  const chartInstance = getChartInstance(context);
  const xRange = timestampRangeToXRange({
    chartInstance,
    displayBars: getDisplayBars(context),
    timeframe: context?.timeframe,
    startTimestamp: geometry.startTimestamp,
    endTimestamp: geometry.endTimestamp,
  });
  const y1 = getPriceCoordinate(context, geometry.topPrice);
  const y2 = getPriceCoordinate(context, geometry.bottomPrice);
  if (!xRange || y1 === null || y2 === null) return null;
  return {
    x1: xRange.from,
    x2: xRange.to,
    y1,
    y2,
  };
}

function normalizeRect(rect, hRatio, vRatio, options) {
  let x = Math.min(rect.x1, rect.x2) * hRatio;
  let y = Math.min(rect.y1, rect.y2) * vRatio;
  let width = Math.abs(rect.x2 - rect.x1) * hRatio;
  let height = Math.abs(rect.y2 - rect.y1) * vRatio;
  const minWidth = options.minWidth * hRatio;
  const minHeight = options.minHeight * vRatio;

  if (width < minWidth) {
    x -= (minWidth - width) / 2;
    width = minWidth;
  }
  if (height < minHeight) {
    y -= (minHeight - height) / 2;
    height = minHeight;
  }

  return { x, y, width, height };
}

function getFlashOpacity(progress) {
  const clamped = Math.min(1, Math.max(0, progress));
  const pulse = 0.35 + Math.abs(Math.sin(clamped * Math.PI * 4)) * 0.65;
  return Math.max(0, 1 - clamped) * pulse;
}

function drawRangeRect(ctx, rect, scope, source) {
  const options = source._options;
  const hRatio = scope.horizontalPixelRatio;
  const vRatio = scope.verticalPixelRatio;
  const ratio = Math.min(hRatio, vRatio);
  const opacity = getFlashOpacity(source._progress);
  if (opacity <= 0.02) return;

  const { x, y, width, height } = normalizeRect(rect, hRatio, vRatio, options);
  ctx.save();
  ctx.fillStyle = withAlpha(options.fillColor, 0.26 * opacity);
  ctx.fillRect(x, y, width, height);

  ctx.strokeStyle = withAlpha(options.borderColor, 0.96 * opacity);
  ctx.lineWidth = options.lineWidth * ratio;
  ctx.setLineDash([]);
  ctx.strokeRect(x, y, width, height);

  const centerY = y + height / 2;
  ctx.strokeStyle = withAlpha(options.borderColor, 0.72 * opacity);
  ctx.lineWidth = Math.max(1, options.lineWidth - 0.5) * ratio;
  ctx.setLineDash([5 * hRatio, 5 * hRatio]);
  ctx.beginPath();
  ctx.moveTo(x, centerY);
  ctx.lineTo(x + width, centerY);
  ctx.stroke();
  ctx.restore();
}

class PdaLocateFlashRenderer {
  constructor(view) {
    this._view = view;
  }

  draw(target) {
    target.useBitmapCoordinateSpace((scope) => {
      const drawing = this._view._drawing;
      if (!drawing) return;

      const ctx = scope.context;
      const source = this._view._source;
      const options = source._options;
      const hRatio = scope.horizontalPixelRatio;
      const vRatio = scope.verticalPixelRatio;
      const ratio = Math.min(hRatio, vRatio);
      const opacity = getFlashOpacity(source._progress);
      if (opacity <= 0.02) return;

      if (drawing.kind === 'range') {
        drawRangeRect(ctx, drawing.rect, scope, source);
        return;
      }

      ctx.save();
      ctx.strokeStyle = withAlpha(options.borderColor, 0.96 * opacity);
      ctx.fillStyle = withAlpha(options.borderColor, 0.86 * opacity);
      ctx.lineWidth = options.lineWidth * ratio;
      ctx.setLineDash([]);

      if (drawing.kind === 'line') {
        const x1 = drawing.x1 * hRatio;
        const x2 = drawing.x2 * hRatio;
        const y = drawing.y * vRatio;
        ctx.beginPath();
        ctx.moveTo(x1, y);
        ctx.lineTo(x2, y);
        ctx.stroke();
      } else if (drawing.kind === 'pointSet') {
        const points = drawing.points;
        if (drawing.referenceY !== null && points.length > 1) {
          const xs = points.map((point) => point.x * hRatio);
          const y = drawing.referenceY * vRatio;
          ctx.setLineDash([5 * hRatio, 5 * hRatio]);
          ctx.beginPath();
          ctx.moveTo(Math.min(...xs), y);
          ctx.lineTo(Math.max(...xs), y);
          ctx.stroke();
          ctx.setLineDash([]);
        }
        points.forEach((point) => {
          const x = point.x * hRatio;
          const y = point.y * vRatio;
          const size = options.markerSize * ratio;
          ctx.beginPath();
          ctx.arc(x, y, size, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
        });
      } else if (drawing.kind === 'fib') {
        const startX = drawing.start.x * hRatio;
        const startY = drawing.start.y * vRatio;
        const endX = drawing.end.x * hRatio;
        const endY = drawing.end.y * vRatio;
        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.lineTo(endX, endY);
        ctx.stroke();

        const leftX = Math.min(startX, endX);
        const rightX = Math.max(startX, endX);
        drawing.levels.forEach((level) => {
          const y = level.y * vRatio;
          ctx.beginPath();
          ctx.moveTo(leftX, y);
          ctx.lineTo(rightX, y);
          ctx.stroke();
        });
      }

      ctx.restore();
    });
  }
}

class PdaLocateFlashView {
  constructor(source) {
    this._source = source;
    this._drawing = null;
  }

  update() {
    const source = this._source;
    const context = source._chartContext;
    const geometry = source._geometry;

    if (geometry.kind === 'range') {
      const rect = getRangeRect(context, geometry);
      this._drawing = rect ? { kind: 'range', rect } : null;
      return;
    }

    if (geometry.kind === 'line') {
      const xRange = timestampRangeToXRange({
        chartInstance: getChartInstance(context),
        displayBars: getDisplayBars(context),
        timeframe: context?.timeframe,
        startTimestamp: geometry.startTimestamp,
        endTimestamp: geometry.endTimestamp,
      });
      const y = getPriceCoordinate(context, geometry.price);
      this._drawing = xRange && y !== null ? { kind: 'line', x1: xRange.from, x2: xRange.to, y } : null;
      return;
    }

    if (geometry.kind === 'pointSet') {
      const points = geometry.points
        .map((point) => ({
          x: getXCoordinate(context, point.timestamp),
          y: getPriceCoordinate(context, point.price),
        }))
        .filter((point) => point.x !== null && point.y !== null);
      const referenceY = getPriceCoordinate(context, geometry.referencePrice);
      this._drawing = points.length ? { kind: 'pointSet', points, referenceY } : null;
      return;
    }

    if (geometry.kind === 'fib') {
      const start = {
        x: getXCoordinate(context, geometry.start.timestamp),
        y: getPriceCoordinate(context, geometry.start.price),
      };
      const end = {
        x: getXCoordinate(context, geometry.end.timestamp),
        y: getPriceCoordinate(context, geometry.end.price),
      };
      const levels = geometry.levels
        .map((level) => ({ y: getPriceCoordinate(context, level.price) }))
        .filter((level) => level.y !== null);
      this._drawing =
        start.x !== null && start.y !== null && end.x !== null && end.y !== null && levels.length
          ? { kind: 'fib', start, end, levels }
          : null;
      return;
    }

    this._drawing = null;
  }

  renderer() {
    return new PdaLocateFlashRenderer(this);
  }
}

export class PdaLocateFlashPrimitive {
  constructor(chartContext, geometry, options = {}) {
    this._chartContext = chartContext;
    this._geometry = geometry;
    this._options = { ...DEFAULT_OPTIONS, ...options };
    this._progress = 0;
    this._view = new PdaLocateFlashView(this);
    this._requestUpdate = null;
  }

  attached({ requestUpdate }) {
    this._requestUpdate = requestUpdate;
    this._requestUpdate?.();
  }

  detached() {
    this._requestUpdate = null;
  }

  setProgress(progress) {
    this._progress = progress;
    this._requestUpdate?.();
  }

  updateAllViews() {
    this._view.update();
  }

  paneViews() {
    return [this._view];
  }
}

export class PdaRangeLocateFlashPrimitive extends PdaLocateFlashPrimitive {}
