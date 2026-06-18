const VERTICAL_LINE_DEFAULTS = {
  color: 'rgba(186, 151, 255, 0.12)',
  lineWidth: 6,
  lineDash: [],
  label: '',
  labelColor: '#f0f3fa',
  labelBackgroundColor: 'rgba(19, 23, 34, 0.92)',
  labelBorderColor: 'rgba(186, 151, 255, 0.5)',
  labelFont: '11px sans-serif',
  labelPaddingX: 6,
  labelPaddingY: 3,
  labelBottomOffset: 8,
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

      if (source._options.label) {
        const fontSize = 11 * vRatio;
        const paddingX = source._options.labelPaddingX * hRatio;
        const paddingY = source._options.labelPaddingY * vRatio;
        const bottomOffset = source._options.labelBottomOffset * vRatio;
        const text = String(source._options.label);
        ctx.font = source._options.labelFont.replace(/^\d+px/, `${fontSize}px`);
        ctx.textBaseline = 'middle';
        const textWidth = ctx.measureText(text).width;
        const boxWidth = textWidth + paddingX * 2;
        const boxHeight = fontSize + paddingY * 2;
        const boxX = Math.max(2 * hRatio, Math.min(x - boxWidth / 2, scope.bitmapSize.width - boxWidth - 2 * hRatio));
        const boxY = Math.max(2 * vRatio, scope.bitmapSize.height - boxHeight - bottomOffset);
        ctx.fillStyle = source._options.labelBackgroundColor;
        ctx.strokeStyle = source._options.labelBorderColor;
        ctx.lineWidth = Math.max(1, Math.min(hRatio, vRatio));
        ctx.beginPath();
        ctx.rect(boxX, boxY, boxWidth, boxHeight);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = source._options.labelColor;
        ctx.fillText(text, boxX + paddingX, boxY + boxHeight / 2);
      }
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

  setTime(time, options = {}) {
    this._time = time;
    this._options = { ...this._options, ...options };
    this._requestUpdate?.();
  }

  setOptions(options = {}) {
    this._options = { ...this._options, ...options };
    this._requestUpdate?.();
  }

  update({ time = this._time, options = {} } = {}) {
    this._time = time;
    this._options = { ...this._options, ...options };
    this._requestUpdate?.();
  }

  updateAllViews() {
    this._view.update();
  }

  paneViews() {
    return [this._view];
  }
}
