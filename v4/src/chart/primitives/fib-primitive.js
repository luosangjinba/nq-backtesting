import { extendXByBars } from './primitive-utils.js';

const FIB_DEFAULTS = {
  levels: [],
  lineWidth: 1,
  labelFont: '11px sans-serif',
  labelPadding: 5,
  extendBars: 0,
  showLabels: true,
  showTrendLine: false,
  trendLineColor: '#787b86',
  trendLineWidth: 1,
};

class FibRenderer {
  constructor(view) {
    this._view = view;
  }

  draw(target) {
    target.useBitmapCoordinateSpace((scope) => {
      const p1 = this._view._p1;
      const p2 = this._view._p2;
      if (p1.x === null || p1.y === null || p2.x === null || p2.y === null) return;

      const source = this._view._source;
      const options = source._options;
      const levels = this._view._levels.filter((level) => level.y !== null);
      if (!levels.length) return;

      const ctx = scope.context;
      const hRatio = scope.horizontalPixelRatio;
      const vRatio = scope.verticalPixelRatio;
      const ratio = Math.min(hRatio, vRatio);
      const x1 = p1.x * hRatio;
      const x2 = p2.x * hRatio;
      const lineStartX = this._view._lineStartX === null ? x2 : this._view._lineStartX * hRatio;
      const lineEndX = this._view._lineEndX === null ? x2 : this._view._lineEndX * hRatio;
      const labelX = Math.max(lineStartX, lineEndX);

      if (options.showTrendLine) {
        ctx.strokeStyle = options.trendLineColor;
        ctx.lineWidth = options.trendLineWidth * ratio;
        ctx.setLineDash([]);
        ctx.beginPath();
        ctx.moveTo(x1, p1.y * vRatio);
        ctx.lineTo(x2, p2.y * vRatio);
        ctx.stroke();
      }

      levels.forEach((level) => {
        const y = level.y * vRatio;
        ctx.strokeStyle = level.color || source._lineColor;
        ctx.lineWidth = options.lineWidth * ratio;
        ctx.setLineDash([]);
        ctx.beginPath();
        ctx.moveTo(lineStartX, y);
        ctx.lineTo(lineEndX, y);
        ctx.stroke();

        if (options.showLabels) {
          ctx.fillStyle = level.color || source._textColor;
          ctx.font = options.labelFont;
          ctx.textAlign = 'left';
          ctx.textBaseline = 'middle';
          ctx.fillText(String(level.value), labelX + options.labelPadding * hRatio, y);
        }
      });
    });
  }
}

class FibView {
  constructor(source) {
    this._source = source;
    this._p1 = { x: null, y: null };
    this._p2 = { x: null, y: null };
    this._lineStartX = null;
    this._lineEndX = null;
    this._levels = [];
  }

  update() {
    const series = this._source._series;
    const timeScale = this._source._chart.timeScale();
    this._p1 = {
      x: timeScale.timeToCoordinate(this._source._startTime),
      y: series.priceToCoordinate(this._source._startPrice),
    };
    this._p2 = {
      x: timeScale.timeToCoordinate(this._source._endTime),
      y: series.priceToCoordinate(this._source._endPrice),
    };
    const leftX =
      this._p1.x === null || this._p2.x === null ? null : Math.min(this._p1.x, this._p2.x);
    const rightX =
      this._p1.x === null || this._p2.x === null ? null : Math.max(this._p1.x, this._p2.x);
    if (leftX === null || rightX === null) {
      this._lineStartX = null;
      this._lineEndX = null;
    } else {
      this._lineStartX = leftX;
      this._lineEndX = extendXByBars(this._source._chart, rightX, this._source._options.extendBars);
    }
    this._levels = this._source._levels.map((level) => ({
      ...level,
      y: series.priceToCoordinate(level.price),
    }));
  }

  renderer() {
    return new FibRenderer(this);
  }
}

export class FibPrimitive {
  constructor(chart, series, startTime, startPrice, endTime, endPrice, levels = [], options = {}) {
    this._chart = chart;
    this._series = series;
    this._startTime = startTime;
    this._startPrice = startPrice;
    this._endTime = endTime;
    this._endPrice = endPrice;
    this._levels = levels;
    this._lineColor = options.lineColor || '#f0f3fa';
    this._textColor = options.textColor || '#d1d4dc';
    this._options = { ...FIB_DEFAULTS, ...options };
    this._view = new FibView(this);
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
