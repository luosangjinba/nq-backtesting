import { extendXByBars } from './primitive-utils.js';

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
