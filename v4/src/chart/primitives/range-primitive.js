import { extendXByBars } from './primitive-utils.js';

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

  setOptions(options = {}) {
    this._options = { ...this._options, ...options };
    this.requestUpdate();
  }

  update({
    startTime = this._startTime,
    endTime = this._endTime,
    topPrice = this._topPrice,
    bottomPrice = this._bottomPrice,
    label = this._label,
    options = {},
  } = {}) {
    this._startTime = startTime;
    this._endTime = endTime;
    this._topPrice = topPrice;
    this._bottomPrice = bottomPrice;
    this._label = label;
    this._options = { ...this._options, ...options };
    this.requestUpdate();
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

      const midY = y + height / 2;
      ctx.strokeStyle = fillColor.slice(0, 7);
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

  update({
    startTime = this._startTime,
    endTime = this._endTime,
    topPrice = this._topPrice,
    bottomPrice = this._bottomPrice,
    color = this._fillColor,
  } = {}) {
    this._startTime = startTime;
    this._endTime = endTime;
    this._topPrice = topPrice;
    this._bottomPrice = bottomPrice;
    this._fillColor = color;
    this.requestUpdate();
  }

  updateAllViews() {
    this._view.update();
  }

  paneViews() {
    return [this._view];
  }
}
