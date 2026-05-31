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
