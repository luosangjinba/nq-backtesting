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
  fill: true,
  strokeColor: '',
  lineWidth: 1.5,
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
      if (options.fill !== false) {
        ctx.fillStyle = options.color;
        ctx.fill();
      }
      ctx.strokeStyle = options.strokeColor || options.color;
      ctx.lineWidth = Math.max(1, options.lineWidth * ratio);
      ctx.stroke();

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
