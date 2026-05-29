import { timestampToXCoordinate } from './time-coordinate.js';

const DEFAULT_BAND_OPTIONS = {
  height: 5,
  topOffset: 2,
  layerGap: 3,
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
      const bands = this._view._bands.filter((band) => band.x1 !== null && band.x2 !== null);
      if (!bands.length) return;

      const source = this._view._source;
      const options = source._options;
      const ctx = scope.context;
      const hRatio = scope.horizontalPixelRatio;
      const vRatio = scope.verticalPixelRatio;
      const ratio = Math.min(hRatio, vRatio);
      const height = Math.max(1, Math.round(options.height * vRatio));

      ctx.save();
      bands.forEach((band) => {
        const x1 = Math.round(Math.min(band.x1, band.x2) * hRatio) + 0.5;
        const x2 = Math.round(Math.max(band.x1, band.x2) * hRatio) + 0.5;
        const layerOffset = (options.height + options.layerGap) * (band.layer || 0);
        const y = Math.round((options.topOffset + layerOffset) * vRatio) + 0.5;

        if (band.draft) {
          const draftHeight = Math.max(height * 3, Math.round(18 * vRatio));
          ctx.strokeStyle = band.lineColor || options.lineColor;
          ctx.lineWidth = Math.max(options.lineWidth * ratio, 2 * ratio);
          ctx.beginPath();
          ctx.moveTo(x1, y);
          ctx.lineTo(x1, y + draftHeight);
          ctx.stroke();
          ctx.fillStyle = band.fillColor || options.fillColor;
          ctx.fillRect(x1 - 2 * hRatio, y, Math.max(3, 4 * hRatio), height);
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
          return;
        }

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
      });
      ctx.restore();
    });
  }
}

class KillzoneBandView {
  constructor(source) {
    this._source = source;
    this._bands = [];
  }

  update() {
    const source = this._source;
    this._bands = source._bands.map((band) => ({
      ...band,
      x1: timestampToXCoordinate({
        chartInstance: source._chart,
        displayBars: source._displayBars,
        timeframe: source._timeframe,
        timestamp: band.startTimestamp,
      }),
      x2: timestampToXCoordinate({
        chartInstance: source._chart,
        displayBars: source._displayBars,
        timeframe: source._timeframe,
        timestamp: band.endTimestamp,
      }),
    }));
  }

  renderer() {
    return new KillzoneBandRenderer(this);
  }
}

export class KillzoneBandPrimitive {
  constructor(chart, displayBars, timeframe, bands = [], options = {}) {
    this._chart = chart;
    this._displayBars = displayBars;
    this._timeframe = timeframe;
    this._bands = bands;
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
