import { timestampToXCoordinate } from './time-coordinate.js';

const DEFAULT_BAND_OPTIONS = {
  height: 5,
  topOffset: 2,
  fillColor: 'rgba(255, 193, 7, 0.24)',
  lineColor: 'rgba(255, 193, 7, 0.50)',
  lineWidth: 1,
  labelColor: 'rgba(255, 224, 130, 0.88)',
  labelFont: 'bold 11px sans-serif',
  labelXOffset: 6,
  labelYOffset: 13,
};

class KillzoneBandRenderer {
  constructor(view) {
    this._view = view;
  }

  draw(target) {
    target.useBitmapCoordinateSpace((scope) => {
      const band = this._view._band;
      if (!band || band.x1 === null || band.x2 === null) return;

      const source = this._view._source;
      const options = source._options;
      const ctx = scope.context;
      const hRatio = scope.horizontalPixelRatio;
      const vRatio = scope.verticalPixelRatio;
      const ratio = Math.min(hRatio, vRatio);
      const x1 = Math.round(Math.min(band.x1, band.x2) * hRatio) + 0.5;
      const x2 = Math.round(Math.max(band.x1, band.x2) * hRatio) + 0.5;
      const y = Math.round(options.topOffset * vRatio) + 0.5;
      const height = Math.max(1, Math.round(options.height * vRatio));

      ctx.save();
      ctx.fillStyle = band.fillColor || options.fillColor;
      ctx.fillRect(x1, y, Math.max(1, x2 - x1), height);
      ctx.strokeStyle = band.lineColor || options.lineColor;
      ctx.lineWidth = options.lineWidth * ratio;
      ctx.beginPath();
      ctx.moveTo(x1, y + height);
      ctx.lineTo(x2, y + height);
      ctx.stroke();

      if (band.label) {
        ctx.fillStyle = band.labelColor || options.labelColor;
        ctx.font = options.labelFont;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        ctx.fillText(
          band.label,
          x1 + options.labelXOffset * hRatio,
          y + options.labelYOffset * vRatio
        );
      }
      ctx.restore();
    });
  }
}

class KillzoneBandView {
  constructor(source) {
    this._source = source;
    this._band = null;
  }

  update() {
    const source = this._source;
    this._band = {
      ...source._band,
      x1: timestampToXCoordinate({
        chartInstance: source._chart,
        displayBars: source._displayBars,
        timeframe: source._timeframe,
        timestamp: source._band.startTimestamp,
      }),
      x2: timestampToXCoordinate({
        chartInstance: source._chart,
        displayBars: source._displayBars,
        timeframe: source._timeframe,
        timestamp: source._band.endTimestamp,
      }),
    };
  }

  renderer() {
    return new KillzoneBandRenderer(this);
  }
}

export class KillzoneBandPrimitive {
  constructor(chart, displayBars, timeframe, band, options = {}) {
    this._chart = chart;
    this._displayBars = displayBars;
    this._timeframe = timeframe;
    this._band = band;
    this._options = { ...DEFAULT_BAND_OPTIONS, ...options };
    this._view = new KillzoneBandView(this);
    this._requestUpdate = null;
  }

  attached({ requestUpdate }) {
    this._requestUpdate = requestUpdate;
    this._requestUpdate?.();
  }

  detached() {
    this._requestUpdate = null;
  }

  requestUpdate() {
    this._requestUpdate?.();
  }

  updateAllViews() {
    this._view.update();
  }

  paneViews() {
    return [this._view];
  }
}
