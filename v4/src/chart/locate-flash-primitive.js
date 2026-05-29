import { timestampRangeToXRange } from '../time-overlays/time-coordinate.js';

const DEFAULT_OPTIONS = {
  fillColor: 'rgba(255, 213, 79, 0.30)',
  lineColor: 'rgba(255, 236, 179, 0.92)',
  minWidth: 20,
  lineWidth: 2,
};

function withAlpha(color, alpha) {
  const match = String(color).match(/^rgba\(([^)]+)\)$/i);
  if (!match) return color;
  const parts = match[1].split(',').map((part) => part.trim());
  if (parts.length < 3) return color;
  return `rgba(${parts[0]}, ${parts[1]}, ${parts[2]}, ${alpha})`;
}

class LocateFlashRenderer {
  constructor(view) {
    this._view = view;
  }

  draw(target) {
    target.useBitmapCoordinateSpace((scope) => {
      const range = this._view._range;
      if (!range) return;

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

      let x = Math.min(range.from, range.to) * hRatio;
      let width = Math.abs(range.to - range.from) * hRatio;
      const minWidth = options.minWidth * hRatio;
      if (width < minWidth) {
        x -= (minWidth - width) / 2;
        width = minWidth;
      }

      const height = scope.bitmapSize.height;
      ctx.save();
      ctx.fillStyle = withAlpha(options.fillColor, 0.30 * opacity);
      ctx.fillRect(x, 0, width, height);

      ctx.strokeStyle = withAlpha(options.lineColor, 0.92 * opacity);
      ctx.lineWidth = options.lineWidth * ratio;
      ctx.setLineDash([]);
      ctx.strokeRect(x, 0, width, height);

      const centerX = x + width / 2;
      ctx.strokeStyle = withAlpha(options.lineColor, 0.75 * opacity);
      ctx.lineWidth = Math.max(1, options.lineWidth - 0.5) * ratio;
      ctx.beginPath();
      ctx.moveTo(centerX, 0);
      ctx.lineTo(centerX, height);
      ctx.stroke();
      ctx.restore();
    });
  }
}

class LocateFlashView {
  constructor(source) {
    this._source = source;
    this._range = null;
  }

  update() {
    const source = this._source;
    const options = {
      chartInstance: source._chart,
      displayBars: source._displayBars,
      timeframe: source._timeframe,
    };
    this._range = timestampRangeToXRange({
      ...options,
      startTimestamp: source._startTimestamp,
      endTimestamp: source._endTimestamp,
    }) || timestampRangeToXRange({
      ...options,
      startTimestamp: source._fallbackStartTimestamp,
      endTimestamp: source._fallbackEndTimestamp,
    });
  }

  renderer() {
    return new LocateFlashRenderer(this);
  }
}

export class LocateFlashPrimitive {
  constructor(chart, displayBars, timeframe, startTimestamp, endTimestamp, options = {}) {
    this._chart = chart;
    this._displayBars = displayBars;
    this._timeframe = timeframe;
    this._startTimestamp = startTimestamp;
    this._endTimestamp = endTimestamp;
    this._fallbackStartTimestamp = options.fallbackStartTimestamp;
    this._fallbackEndTimestamp = options.fallbackEndTimestamp;
    this._options = { ...DEFAULT_OPTIONS, ...options };
    this._progress = 0;
    this._view = new LocateFlashView(this);
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
