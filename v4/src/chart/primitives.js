// LightweightCharts v5 图元 — Range 矩形 + BSL/SSL 流动性线
// v5 接口变化：ISeriesPrimitivePaneView → IPrimitivePaneView（方法签名不变）

// ============================
// Range 矩形
// ==============================

const RANGE_DEFAULTS = {
  fillColor: '#ab47bc33',
  borderColor: '#ab47bc',
  midlineColor: null,
  midlinePrice: null,
  textColor: '#d1d4dc',
  showMidline: true,
  showLabel: true,
  lineWidth: 1,
  labelFont: '11px sans-serif',
  labelPadding: 4,
  minWidth: 4,
};

function extendXByBars(chart, x, extendBars) {
  if (x === null || x === undefined || !Number.isFinite(Number(extendBars)) || Number(extendBars) <= 0) {
    return x;
  }
  const barSpacing = Number(chart?.timeScale?.().options?.().barSpacing);
  const spacing = Number.isFinite(barSpacing) && barSpacing > 0 ? barSpacing : 6;
  return x + Number(extendBars) * spacing;
}

class RangeRenderer {
  constructor(view) {
    this._view = view;
  }

  draw(target) {
    target.useBitmapCoordinateSpace((scope) => {
      const p1 = this._view._p1;
      const p2 = this._view._p2;
      if (p1.x === null || p1.y === null || p2.x === null || p2.y === null) return;

      const ctx = scope.context;
      const source = this._view._source;
      const options = source._options;
      const hRatio = scope.horizontalPixelRatio;
      const vRatio = scope.verticalPixelRatio;

      let x = Math.min(p1.x, p2.x) * hRatio;
      const y = Math.min(p1.y, p2.y) * vRatio;
      let width = Math.abs(p2.x - p1.x) * hRatio;
      const height = Math.abs(p2.y - p1.y) * vRatio;
      const minWidth = options.minWidth * hRatio;

      if (width < minWidth) {
        x -= (minWidth - width) / 2;
        width = minWidth;
      }

      ctx.fillStyle = options.fillColor;
      ctx.fillRect(x, y, width, height);

      if (options.lineWidth > 0 && options.borderColor !== 'transparent') {
        ctx.strokeStyle = options.borderColor;
        ctx.lineWidth = options.lineWidth * Math.min(hRatio, vRatio);
        ctx.setLineDash([]);
        ctx.strokeRect(x, y, width, height);
      }

      if (options.showMidline) {
        const midY = this._view._midlineY === null ? y + height / 2 : this._view._midlineY * vRatio;
        ctx.strokeStyle = options.midlineColor || options.borderColor;
        ctx.lineWidth = Math.max(1, options.lineWidth) * Math.min(hRatio, vRatio);
        ctx.setLineDash([5 * hRatio, 5 * hRatio]);
        ctx.beginPath();
        ctx.moveTo(x, midY);
        ctx.lineTo(x + width, midY);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      if (options.showLabel && source._label) {
        const padding = options.labelPadding * vRatio;
        ctx.fillStyle = options.textColor;
        ctx.font = options.labelFont;
        ctx.textAlign = 'right';
        ctx.textBaseline = 'middle';
        ctx.fillText(source._label, x + width - padding, y + height / 2);
      }
    });
  }
}

class RangeView {
  constructor(source) {
    this._source = source;
    this._p1 = { x: null, y: null };
    this._p2 = { x: null, y: null };
    this._midlineY = null;
  }

  update() {
    const series = this._source._series;
    const chart = this._source._chart;
    const y1 = series.priceToCoordinate(this._source._topPrice);
    const y2 = series.priceToCoordinate(this._source._bottomPrice);
    const midlineY =
      this._source._options.midlinePrice === null
        ? null
        : series.priceToCoordinate(this._source._options.midlinePrice);
    const timeScale = chart.timeScale();
    const x1 = timeScale.timeToCoordinate(this._source._startTime);
    let x2 = timeScale.timeToCoordinate(this._source._endTime);
    if (x2 !== null && this._source._options.extendBars > 0) {
      x2 = extendXByBars(chart, x2, this._source._options.extendBars);
    }
    this._p1 = { x: x1, y: y1 };
    this._p2 = { x: x2, y: y2 };
    this._midlineY = midlineY;
  }

  renderer() {
    return new RangeRenderer(this);
  }
}

export class RangePrimitive {
  constructor(chart, series, startTime, endTime, topPrice, bottomPrice, label = '', options = {}) {
    this._chart = chart;
    this._series = series;
    this._startTime = startTime;
    this._endTime = endTime;
    this._topPrice = topPrice;
    this._bottomPrice = bottomPrice;
    this._label = label;
    this._options = { ...RANGE_DEFAULTS, ...options };
    this._view = new RangeView(this);
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

class FvgRenderer {
  constructor(view) {
    this._view = view;
  }

  draw(target) {
    target.useBitmapCoordinateSpace((scope) => {
      const p1 = this._view._p1;
      const p2 = this._view._p2;
      if (p1.x === null || p1.y === null || p2.x === null || p2.y === null) return;

      const ctx = scope.context;
      const fillColor = this._view._source._fillColor;

      const x = Math.min(p1.x, p2.x) * scope.horizontalPixelRatio;
      const y = Math.min(p1.y, p2.y) * scope.verticalPixelRatio;
      const width = Math.abs(p2.x - p1.x) * scope.horizontalPixelRatio;
      const height = Math.abs(p2.y - p1.y) * scope.verticalPixelRatio;

      ctx.fillStyle = fillColor;
      ctx.fillRect(x, y, width, height);

      // 中线虚线
      const midY = y + height / 2;
      ctx.strokeStyle = fillColor.slice(0, 7); // 去掉透明度后缀
      ctx.lineWidth = 1;
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ctx.moveTo(x, midY);
      ctx.lineTo(x + width, midY);
      ctx.stroke();
      ctx.setLineDash([]);
    });
  }
}

class FvgView {
  constructor(source) {
    this._source = source;
    this._p1 = { x: null, y: null };
    this._p2 = { x: null, y: null };
  }

  update() {
    const series = this._source._series;
    const chart = this._source._chart;
    const y1 = series.priceToCoordinate(this._source._topPrice);
    const y2 = series.priceToCoordinate(this._source._bottomPrice);
    const timeScale = chart.timeScale();
    const x1 = timeScale.timeToCoordinate(this._source._startTime);
    const x2 = timeScale.timeToCoordinate(this._source._endTime);
    this._p1 = { x: x1, y: y1 };
    this._p2 = { x: x2, y: y2 };
  }

  renderer() {
    return new FvgRenderer(this);
  }
}

export class FvgPrimitive {
  constructor(chart, series, startTime, endTime, topPrice, bottomPrice, color = '#ab47bc33') {
    this._chart = chart;
    this._series = series;
    this._startTime = startTime;
    this._endTime = endTime;
    this._topPrice = topPrice;
    this._bottomPrice = bottomPrice;
    this._fillColor = color;
    this._view = new FvgView(this);
  }

  updateAllViews() {
    this._view.update();
  }

  paneViews() {
    return [this._view];
  }
}

// ===========================
// BSL/SSL 流动性线
// ============================

const LIQUIDITY_DEFAULTS = {
  lineLength: 2,
  showLabel: true,
  lineWidth: 1,
  labelFont: '11px sans-serif',
  labelPadding: 4,
  lineStyle: 'solid',
};

class LiquidityRenderer {
  constructor(view) {
    this._view = view;
  }

  draw(target) {
    target.useBitmapCoordinateSpace((scope) => {
      const p1 = this._view._p1;
      const p2 = this._view._p2;
      if (p1.x === null || p2.x === null || p1.y === null) return;

      const source = this._view._source;
      const ctx = scope.context;
      const hRatio = scope.horizontalPixelRatio;
      const vRatio = scope.verticalPixelRatio;

      const x1 = p1.x * hRatio;
      const x2 = p2.x * hRatio;
      const y = p1.y * vRatio;

      ctx.strokeStyle = source._lineColor;
      ctx.lineWidth = source._options.lineWidth * Math.min(hRatio, vRatio);

      if (source._options.lineStyle === 'dashed') {
        ctx.setLineDash([5, 5]);
      } else {
        ctx.setLineDash([]);
      }

      ctx.beginPath();
      ctx.moveTo(x1, y);
      ctx.lineTo(x2, y);
      ctx.stroke();

      if (source._options.showLabel && source._label) {
        ctx.fillStyle = source._textColor;
        ctx.font = source._options.labelFont;
        const padding = source._options.labelPadding * vRatio;
        ctx.textAlign = 'right';
        if (source._position === 'above') {
          ctx.textBaseline = 'bottom';
          ctx.fillText(source._label, x2, y - padding);
        } else {
          ctx.textBaseline = 'top';
          ctx.fillText(source._label, x2, y + padding);
        }
      }
    });
  }
}

class LiquidityView {
  constructor(source) {
    this._source = source;
    this._p1 = { x: null, y: null };
    this._p2 = { x: null, y: null };
  }

  update() {
    const series = this._source._series;
    const chart = this._source._chart;
    const timeScale = chart.timeScale();

    const y = series.priceToCoordinate(this._source._price);
    const anchorCoord = timeScale.timeToCoordinate(this._source._anchorTime);
    let rightX = null;
    if (anchorCoord !== null) {
      rightX = this._source._options.endTime === null || this._source._options.endTime === undefined
        ? extendXByBars(chart, anchorCoord, this._source._options.lineLength)
        : timeScale.timeToCoordinate(this._source._options.endTime);
    }

    this._p1 = { x: anchorCoord, y };
    this._p2 = { x: rightX, y };
  }

  renderer() {
    return new LiquidityRenderer(this);
  }
}

export class LiquidityPrimitive {
  constructor(chart, series, anchorTime, price, lineColor, textColor, label, position, options = {}) {
    this._chart = chart;
    this._series = series;
    this._anchorTime = anchorTime;
    this._price = price;
    this._lineColor = lineColor;
    this._textColor = textColor;
    this._label = label;
    this._position = position;
    this._options = { ...LIQUIDITY_DEFAULTS, ...options };
    this._view = new LiquidityView(this);
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

// ============================
// EQH/EQL point-set
// ============================

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

// ============================
// Fib retracement
// ============================

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

// ============================
// Market segment
// ============================

const SEGMENT_DEFAULTS = {
  lineColor: '#26a69a',
  textColor: '#f0f3fa',
  markerColor: '#f0f3fa',
  lineWidth: 2,
  markerSize: 4,
  showLabel: true,
  labelFont: '11px sans-serif',
  labelPadding: 6,
};

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

      ctx.strokeStyle = options.lineColor;
      ctx.lineWidth = options.lineWidth * ratio;
      ctx.setLineDash([]);
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

      ctx.fillStyle = options.markerColor;
      [p1, p2].forEach((point) => {
        const x = point.x * hRatio;
        const y = point.y * vRatio;
        ctx.beginPath();
        ctx.arc(x, y, options.markerSize * ratio, 0, Math.PI * 2);
        ctx.fill();
      });

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

// ============================
// Replay cursor vertical line
// ============================

const VERTICAL_LINE_DEFAULTS = {
  color: 'rgba(186, 151, 255, 0.12)',
  lineWidth: 6,
  lineDash: [],
};

class VerticalLineRenderer {
  constructor(view) {
    this._view = view;
  }

  draw(target) {
    target.useBitmapCoordinateSpace((scope) => {
      const xCoord = this._view._x;
      if (xCoord === null) return;

      const source = this._view._source;
      const ctx = scope.context;
      const hRatio = scope.horizontalPixelRatio;
      const vRatio = scope.verticalPixelRatio;
      const x = Math.round(xCoord * hRatio) + 0.5;

      ctx.strokeStyle = source._options.color;
      ctx.lineWidth = source._options.lineWidth * Math.min(hRatio, vRatio);
      ctx.setLineDash(source._options.lineDash.map((v) => v * hRatio));
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, scope.bitmapSize.height);
      ctx.stroke();
      ctx.setLineDash([]);
    });
  }
}

class VerticalLineView {
  constructor(source) {
    this._source = source;
    this._x = null;
  }

  update() {
    this._x = this._source._chart.timeScale().timeToCoordinate(this._source._time);
  }

  renderer() {
    return new VerticalLineRenderer(this);
  }
}

export class VerticalLinePrimitive {
  constructor(chart, time, options = {}) {
    this._chart = chart;
    this._time = time;
    this._options = { ...VERTICAL_LINE_DEFAULTS, ...options };
    this._view = new VerticalLineView(this);
    this._requestUpdate = null;
  }

  attached({ requestUpdate }) {
    this._requestUpdate = requestUpdate;
  }

  detached() {
    this._requestUpdate = null;
  }

  setTime(time) {
    this._time = time;
    this._requestUpdate?.();
  }

  updateAllViews() {
    this._view.update();
  }

  paneViews() {
    return [this._view];
  }
}

// ============================
// Single bar marker
// ============================

const BAR_MARKER_DEFAULTS = {
  color: '#ffb74d',
  textColor: '#ffcc80',
  label: '',
  position: 'above',
  direction: 'auto',
  size: 6,
  offset: 10,
  labelOffset: 8,
  labelFont: '11px sans-serif',
  showLabel: true,
};

class BarMarkerRenderer {
  constructor(view) {
    this._view = view;
  }

  draw(target) {
    target.useBitmapCoordinateSpace((scope) => {
      const point = this._view._point;
      if (point.x === null || point.y === null) return;

      const source = this._view._source;
      const options = source._options;
      const ctx = scope.context;
      const ratio = Math.min(scope.horizontalPixelRatio, scope.verticalPixelRatio);
      const hRatio = scope.horizontalPixelRatio;
      const vRatio = scope.verticalPixelRatio;
      const x = point.x * hRatio;
      const y = point.y * vRatio;
      const size = options.size * ratio;
      const markerY = y + (options.position === 'below' ? options.offset * vRatio : -options.offset * vRatio);
      const markerDirection = options.direction === 'auto'
        ? (options.position === 'below' ? 'up' : 'down')
        : options.direction;

      ctx.fillStyle = options.color;
      ctx.beginPath();
      if (markerDirection === 'up') {
        ctx.moveTo(x, markerY - size);
        ctx.lineTo(x - size, markerY + size);
        ctx.lineTo(x + size, markerY + size);
      } else {
        ctx.moveTo(x, markerY + size);
        ctx.lineTo(x - size, markerY - size);
        ctx.lineTo(x + size, markerY - size);
      }
      ctx.closePath();
      ctx.fill();

      if (options.showLabel && options.label) {
        ctx.fillStyle = options.textColor;
        ctx.font = options.labelFont;
        ctx.textAlign = 'center';
        ctx.textBaseline = options.position === 'below' ? 'top' : 'bottom';
        const labelY = markerY + (options.position === 'below' ? options.labelOffset * vRatio : -options.labelOffset * vRatio);
        ctx.fillText(options.label, x, labelY);
      }
    });
  }
}

class BarMarkerView {
  constructor(source) {
    this._source = source;
    this._point = { x: null, y: null };
  }

  update() {
    this._point = {
      x: this._source._chart.timeScale().timeToCoordinate(this._source._time),
      y: this._source._series.priceToCoordinate(this._source._price),
    };
  }

  renderer() {
    return new BarMarkerRenderer(this);
  }
}

export class BarMarkerPrimitive {
  constructor(chart, series, time, price, options = {}) {
    this._chart = chart;
    this._series = series;
    this._time = time;
    this._price = price;
    this._options = { ...BAR_MARKER_DEFAULTS, ...options };
    this._view = new BarMarkerView(this);
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
