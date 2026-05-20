// LightweightCharts v5 图元 — FVG 矩形 + BSL/SSL 流动性线
// v5 接口变化：ISeriesPrimitivePaneView → IPrimitivePaneView（方法签名不变）

// ============================
// FVG 矩形
// ==============================

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
