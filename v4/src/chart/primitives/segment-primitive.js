const SEGMENT_DEFAULTS = {
  lineColor: '#26a69a',
  textColor: '#f0f3fa',
  markerColor: '#f0f3fa',
  lineWidth: 2,
  lineOpacity: 1,
  lineDash: [],
  markerSize: 4,
  showMarkers: true,
  showLabel: true,
  labelFont: '11px sans-serif',
  labelPadding: 6,
};

function clampOpacity(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 1;
  return Math.max(0, Math.min(1, parsed));
}

function getScaledLineDash(lineDash, ratio) {
  if (!Array.isArray(lineDash)) return [];
  return lineDash.map((value) => Math.max(0, Number(value) || 0) * ratio);
}

class SegmentRenderer {
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
      const ctx = scope.context;
      const hRatio = scope.horizontalPixelRatio;
      const vRatio = scope.verticalPixelRatio;
      const ratio = Math.min(hRatio, vRatio);
      const x1 = p1.x * hRatio;
      const y1 = p1.y * vRatio;
      const x2 = p2.x * hRatio;
      const y2 = p2.y * vRatio;

      ctx.save();
      ctx.globalAlpha = clampOpacity(options.lineOpacity);
      ctx.strokeStyle = options.lineColor;
      ctx.lineWidth = options.lineWidth * ratio;
      ctx.setLineDash(getScaledLineDash(options.lineDash, ratio));
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();

      const angle = Math.atan2(y2 - y1, x2 - x1);
      const arrowLength = 10 * ratio;
      const arrowAngle = Math.PI / 7;
      ctx.beginPath();
      ctx.moveTo(x2, y2);
      ctx.lineTo(
        x2 - arrowLength * Math.cos(angle - arrowAngle),
        y2 - arrowLength * Math.sin(angle - arrowAngle)
      );
      ctx.moveTo(x2, y2);
      ctx.lineTo(
        x2 - arrowLength * Math.cos(angle + arrowAngle),
        y2 - arrowLength * Math.sin(angle + arrowAngle)
      );
      ctx.stroke();
      ctx.restore();

      if (options.showMarkers) {
        ctx.fillStyle = options.markerColor;
        [p1, p2].forEach((point) => {
          const x = point.x * hRatio;
          const y = point.y * vRatio;
          ctx.beginPath();
          ctx.arc(x, y, options.markerSize * ratio, 0, Math.PI * 2);
          ctx.fill();
        });
      }

      if (options.showLabel && source._label) {
        ctx.fillStyle = options.textColor;
        ctx.font = options.labelFont;
        ctx.textAlign = x2 >= x1 ? 'left' : 'right';
        ctx.textBaseline = y2 >= y1 ? 'top' : 'bottom';
        const xOffset = (x2 >= x1 ? 1 : -1) * options.labelPadding * hRatio;
        const yOffset = (y2 >= y1 ? 1 : -1) * options.labelPadding * vRatio;
        ctx.fillText(source._label, x2 + xOffset, y2 + yOffset);
      }
    });
  }
}

class SegmentView {
  constructor(source) {
    this._source = source;
    this._p1 = { x: null, y: null };
    this._p2 = { x: null, y: null };
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
  }

  renderer() {
    return new SegmentRenderer(this);
  }
}

export class SegmentPrimitive {
  constructor(chart, series, startTime, startPrice, endTime, endPrice, label = '', options = {}) {
    this._chart = chart;
    this._series = series;
    this._startTime = startTime;
    this._startPrice = startPrice;
    this._endTime = endTime;
    this._endPrice = endPrice;
    this._label = label;
    this._options = { ...SEGMENT_DEFAULTS, ...options };
    this._view = new SegmentView(this);
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
