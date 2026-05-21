// LightweightCharts v5 图元 — Range 矩形 + BSL/SSL 流动性线
// v5 接口变化：ISeriesPrimitivePaneView → IPrimitivePaneView（方法签名不变）

// ============================
// Range 矩形
// ==============================

const RANGE_DEFAULTS = {
  fillColor: '#ab47bc33',
  borderColor: '#ab47bc',
  textColor: '#d1d4dc',
  showMidline: true,
  showLabel: true,
  lineWidth: 1,
  labelFont: '11px sans-serif',
  labelPadding: 4,
  minWidth: 4,
};

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

      ctx.strokeStyle = options.borderColor;
      ctx.lineWidth = options.lineWidth * Math.min(hRatio, vRatio);
      ctx.setLineDash([]);
      ctx.strokeRect(x, y, width, height);

      if (options.showMidline) {
        const midY = y + height / 2;
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
  }

  update() {
    const series = this._source._series;
    const chart = this._source._chart;
    const y1 = series.priceToCoordinate(this._source._topPrice);
    const y2 = series.priceToCoordinate(this._source._bottomPrice);
    const timeScale = chart.timeScale();
    const x1 = timeScale.timeToCoordinate(this._source._startTime);
    let x2 = timeScale.timeToCoordinate(this._source._endTime);
    if (x2 !== null && this._source._options.extendBars > 0) {
      const logical = timeScale.coordinateToLogical(x2);
      x2 = logical === null ? x2 : timeScale.logicalToCoordinate(logical + this._source._options.extendBars);
    }
    this._p1 = { x: x1, y: y1 };
    this._p2 = { x: x2, y: y2 };
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
      const logical = timeScale.coordinateToLogical(anchorCoord);
      if (logical !== null) {
        rightX = timeScale.logicalToCoordinate(logical + this._source._options.lineLength);
      }
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
    const logical = timeScale.coordinateToLogical(maxX);
    this._endX = logical === null ? maxX : timeScale.logicalToCoordinate(logical + this._source._options.extendBars);
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
