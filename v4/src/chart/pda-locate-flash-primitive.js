import { timestampRangeToXRange } from '../time-overlays/time-coordinate.js';

const DEFAULT_OPTIONS = {
  fillColor: 'rgba(255, 213, 79, 0.26)',
  borderColor: 'rgba(255, 236, 179, 0.96)',
  minWidth: 12,
  minHeight: 8,
  lineWidth: 2,
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

class PdaRangeLocateFlashRenderer {
  constructor(view) {
    this._view = view;
  }

  draw(target) {
    target.useBitmapCoordinateSpace((scope) => {
      const rect = this._view._rect;
      if (!rect) return;

      const source = this._view._source;
      const options = source._options;
      const ctx = scope.context;
      const hRatio = scope.horizontalPixelRatio;
      const vRatio = scope.verticalPixelRatio;
      const ratio = Math.min(hRatio, vRatio);
      const progress = Math.min(1, Math.max(0, source._progress));
      const pulse = 0.35 + Math.abs(Math.sin(progress * Math.PI * 4)) * 0.65;
      const opacity = Math.max(0, 1 - progress) * pulse;
      if (opacity <= 0.02) return;

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
    });
  }
}

class PdaRangeLocateFlashView {
  constructor(source) {
    this._source = source;
    this._rect = null;
  }

  update() {
    const source = this._source;
    const context = source._chartContext;
    const chartInstance = getChartInstance(context);
    const xRange = timestampRangeToXRange({
      chartInstance,
      displayBars: getDisplayBars(context),
      timeframe: context?.timeframe,
      startTimestamp: source._geometry.startTimestamp,
      endTimestamp: source._geometry.endTimestamp,
    });
    const y1 = context?.priceToCoordinate?.(source._geometry.topPrice);
    const y2 = context?.priceToCoordinate?.(source._geometry.bottomPrice);

    if (!xRange || y1 === null || y1 === undefined || y2 === null || y2 === undefined) {
      this._rect = null;
      return;
    }

    this._rect = {
      x1: xRange.from,
      x2: xRange.to,
      y1,
      y2,
    };
  }

  renderer() {
    return new PdaRangeLocateFlashRenderer(this);
  }
}

export class PdaRangeLocateFlashPrimitive {
  constructor(chartContext, geometry, options = {}) {
    this._chartContext = chartContext;
    this._geometry = geometry;
    this._options = { ...DEFAULT_OPTIONS, ...options };
    this._progress = 0;
    this._view = new PdaRangeLocateFlashView(this);
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
