import { extendXByBars } from './primitive-utils.js';

const POINT_SET_DEFAULTS = {
  lineColor: '#26a69a',
  textColor: '#d1d4dc',
  lineWidth: 1,
  lineDash: [5, 5],
  showPointMarkers: true,
  markerPosition: 'above',
  markerSize: 4,
  markerOffset: 8,
  extendBars: 0,
  showLabel: true,
  labelFont: '11px sans-serif',
  labelPadding: 5,
};

class PointSetRenderer {
  constructor(view) {
    this._view = view;
  }

  draw(target) {
    target.useBitmapCoordinateSpace((scope) => {
      const points = this._view._points.filter((point) => point.x !== null && point.y !== null);
      const referenceY = this._view._referenceY;
      if (points.length === 0 || referenceY === null) return;

      const source = this._view._source;
      const options = source._options;
      const ctx = scope.context;
      const hRatio = scope.horizontalPixelRatio;
      const vRatio = scope.verticalPixelRatio;
      const ratio = Math.min(hRatio, vRatio);
      const xs = points.map((point) => point.x * hRatio);
      const y = referenceY * vRatio;
      const minX = Math.min(...xs);
      const maxPointX = Math.max(...xs);
      const maxX = this._view._endX === null ? maxPointX : this._view._endX * hRatio;

      if (points.length > 1) {
        ctx.strokeStyle = options.lineColor;
        ctx.lineWidth = options.lineWidth * ratio;
        ctx.setLineDash(options.lineDash.map((value) => value * hRatio));
        ctx.beginPath();
        ctx.moveTo(minX, y);
        ctx.lineTo(maxX, y);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      if (options.showPointMarkers) {
        ctx.fillStyle = options.lineColor;
        points.forEach((point) => {
          const x = point.x * hRatio;
          const size = options.markerSize * ratio;
          const offset = options.markerOffset * vRatio;
          const markerY =
            options.markerPosition === 'below' ? y + offset : y - offset;

          ctx.beginPath();
          if (options.markerPosition === 'below') {
            ctx.moveTo(x, markerY + size);
            ctx.lineTo(x - size, markerY - size);
            ctx.lineTo(x + size, markerY - size);
          } else {
            ctx.moveTo(x, markerY - size);
            ctx.lineTo(x - size, markerY + size);
            ctx.lineTo(x + size, markerY + size);
          }
          ctx.closePath();
          ctx.fill();
        });
      }

      if (options.showLabel && source._label && points.length > 1) {
        ctx.fillStyle = options.textColor;
        ctx.font = options.labelFont;
        ctx.textAlign = 'right';
        ctx.textBaseline = 'bottom';
        ctx.fillText(source._label, maxX, y - options.labelPadding * vRatio);
      }
    });
  }
}

class PointSetView {
  constructor(source) {
    this._source = source;
    this._points = [];
    this._referenceY = null;
    this._endX = null;
  }

  update() {
    const series = this._source._series;
    const timeScale = this._source._chart.timeScale();
    this._points = this._source._points.map((point) => ({
      x: timeScale.timeToCoordinate(point.time),
      y: series.priceToCoordinate(point.price),
    }));
    this._referenceY = series.priceToCoordinate(this._source._referencePrice);
    const visibleXs = this._points.map((point) => point.x).filter((x) => x !== null);
    const maxX = visibleXs.length ? Math.max(...visibleXs) : null;
    if (maxX === null || this._source._options.extendBars <= 0) {
      this._endX = maxX;
      return;
    }
    this._endX = extendXByBars(this._source._chart, maxX, this._source._options.extendBars);
  }

  renderer() {
    return new PointSetRenderer(this);
  }
}

export class PointSetPrimitive {
  constructor(chart, series, points, referencePrice, label = '', options = {}) {
    this._chart = chart;
    this._series = series;
    this._points = points;
    this._referencePrice = referencePrice;
    this._label = label;
    this._options = { ...POINT_SET_DEFAULTS, ...options };
    this._view = new PointSetView(this);
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
