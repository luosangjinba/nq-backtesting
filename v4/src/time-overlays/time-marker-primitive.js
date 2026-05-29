import { timestampToXCoordinate } from './time-coordinate.js';

const DEFAULT_MARKER_OPTIONS = {
  lineWidth: 3,
  labelFont: 'bold 12px sans-serif',
  labelColor: 'rgba(235, 238, 245, 0.78)',
  labelBottomOffset: 42,
  labelXOffset: 6,
};

class TimeMarkerRenderer {
  constructor(view) {
    this._view = view;
  }

  draw(target) {
    target.useBitmapCoordinateSpace((scope) => {
      const markers = this._view._markers.filter((marker) => marker.x !== null);
      if (!markers.length) return;

      const source = this._view._source;
      const options = source._options;
      const ctx = scope.context;
      const hRatio = scope.horizontalPixelRatio;
      const vRatio = scope.verticalPixelRatio;
      const ratio = Math.min(hRatio, vRatio);

      markers.forEach((marker) => {
        const x = Math.round(marker.x * hRatio) + 0.5;
        ctx.strokeStyle = marker.color;
        ctx.lineWidth = options.lineWidth * ratio;
        ctx.setLineDash([]);
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, scope.bitmapSize.height);
        ctx.stroke();

        if (marker.label) {
          ctx.save();
          ctx.fillStyle = marker.labelColor || options.labelColor;
          ctx.font = options.labelFont;
          ctx.textAlign = 'left';
          ctx.textBaseline = 'middle';
          ctx.translate(
            x + options.labelXOffset * hRatio,
            scope.bitmapSize.height - options.labelBottomOffset * vRatio
          );
          ctx.rotate(-Math.PI / 2);
          ctx.fillText(marker.label, 0, 0);
          ctx.restore();
        }
      });
    });
  }
}

class TimeMarkerView {
  constructor(source) {
    this._source = source;
    this._markers = [];
  }

  update() {
    const source = this._source;
    this._markers = source._markers.map((marker) => ({
      ...marker,
      x: timestampToXCoordinate({
        chartInstance: source._chart,
        displayBars: source._displayBars,
        timeframe: source._timeframe,
        timestamp: marker.timestamp,
      }),
    }));
  }

  renderer() {
    return new TimeMarkerRenderer(this);
  }
}

export class TimeMarkerPrimitive {
  constructor(chart, displayBars, timeframe, markers = [], options = {}) {
    this._chart = chart;
    this._displayBars = displayBars;
    this._timeframe = timeframe;
    this._markers = markers;
    this._options = { ...DEFAULT_MARKER_OPTIONS, ...options };
    this._view = new TimeMarkerView(this);
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
