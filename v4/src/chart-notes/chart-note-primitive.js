const DEFAULT_OPTIONS = {
  backgroundColor: 'rgba(255, 247, 168, 0.92)',
  borderColor: 'rgba(255, 247, 168, 0.95)',
  textColor: '#1f2430',
  font: 'bold 11px sans-serif',
  paddingX: 7,
  paddingY: 4,
  radius: 4,
  offset: 18,
  maxWidth: 180,
};

function roundRect(ctx, x, y, width, height, radius) {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + width - r, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + r);
  ctx.lineTo(x + width, y + height - r);
  ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
  ctx.lineTo(x + r, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function ellipsizeText(ctx, text, maxWidth) {
  const value = String(text || '').trim();
  if (!value || ctx.measureText(value).width <= maxWidth) return value;
  const ellipsis = '...';
  let output = value;
  while (output.length > 1 && ctx.measureText(output + ellipsis).width > maxWidth) {
    output = output.slice(0, -1);
  }
  return `${output}${ellipsis}`;
}

class ChartNoteRenderer {
  constructor(view) {
    this._view = view;
  }

  draw(target) {
    target.useBitmapCoordinateSpace((scope) => {
      const notes = this._view._points.filter((point) => point.x !== null && point.y !== null);
      if (!notes.length) return;

      const source = this._view._source;
      const options = source._options;
      const ctx = scope.context;
      const hRatio = scope.horizontalPixelRatio;
      const vRatio = scope.verticalPixelRatio;
      const ratio = Math.min(hRatio, vRatio);
      const paddingX = options.paddingX * hRatio;
      const paddingY = options.paddingY * vRatio;
      const maxTextWidth = options.maxWidth * hRatio;

      ctx.save();
      ctx.font = options.font.replace(/(\d+(?:\.\d+)?)px/g, (_, size) => `${Number(size) * ratio}px`);
      ctx.textBaseline = 'middle';
      notes.forEach((point) => {
        const text = ellipsizeText(ctx, point.text, maxTextWidth);
        if (!text) return;

        const textWidth = ctx.measureText(text).width;
        const textHeight = 13 * ratio;
        const boxWidth = textWidth + paddingX * 2;
        const boxHeight = textHeight + paddingY * 2;
        const x = Math.round(point.x * hRatio - boxWidth / 2);
        const y =
          point.position === 'below'
            ? Math.round(point.y * vRatio + options.offset * vRatio)
            : Math.round(point.y * vRatio - options.offset * vRatio - boxHeight);

        ctx.fillStyle = point.color || options.backgroundColor;
        ctx.strokeStyle = point.borderColor || options.borderColor;
        ctx.lineWidth = 1 * ratio;
        roundRect(ctx, x, y, boxWidth, boxHeight, options.radius * ratio);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = point.textColor || options.textColor;
        ctx.textAlign = 'center';
        ctx.fillText(text, x + boxWidth / 2, y + boxHeight / 2);
      });
      ctx.restore();
    });
  }
}

class ChartNoteView {
  constructor(source) {
    this._source = source;
    this._points = [];
  }

  update() {
    const source = this._source;
    this._points = source._notes.map((note) => ({
      ...note,
      x: source._chart.timeScale().timeToCoordinate(note.time),
      y: source._series.priceToCoordinate(note.price),
    }));
  }

  renderer() {
    return new ChartNoteRenderer(this);
  }
}

export class ChartNotePrimitive {
  constructor(chart, series, notes = [], options = {}) {
    this._chart = chart;
    this._series = series;
    this._notes = notes;
    this._options = { ...DEFAULT_OPTIONS, ...options };
    this._view = new ChartNoteView(this);
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
