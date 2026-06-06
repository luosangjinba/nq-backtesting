export const CHART_NOTE_DEFAULT_OPTIONS = {
  backgroundColor: 'rgba(255, 247, 168, 0.92)',
  borderColor: 'rgba(255, 247, 168, 0.95)',
  textColor: '#1f2430',
  font: 'bold 11px sans-serif',
  paddingX: 7,
  paddingY: 4,
  radius: 4,
  maxWidth: 180,
  expandedMaxWidth: 420,
  expandedMaxLines: 6,
  lineHeight: 14,
  topOffset: 8,
  rowGap: 6,
  leaderColor: 'rgba(255, 247, 168, 0.28)',
  leaderWidth: 1,
  leaderAnchorColor: 'rgba(255, 247, 168, 0.96)',
  leaderAnchorBorderColor: 'rgba(31, 36, 48, 0.62)',
  leaderAnchorSize: 3,
  flashBorderColor: 'rgba(255, 255, 255, 0.96)',
  flashGlowColor: 'rgba(255, 247, 168, 0.55)',
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

function wrapText(ctx, text, maxWidth, maxLines) {
  const value = String(text || '').trim();
  if (!value) return [];
  const words = value.split(/\s+/).filter(Boolean);
  const lines = [];
  let current = '';

  const pushLongWord = (word) => {
    let chunk = '';
    Array.from(word).forEach((char) => {
      if (chunk && ctx.measureText(chunk + char).width > maxWidth) {
        lines.push(chunk);
        chunk = char;
        return;
      }
      chunk += char;
    });
    return chunk;
  };

  words.forEach((word) => {
    if (lines.length >= maxLines) return;
    const candidate = current ? `${current} ${word}` : word;
    if (ctx.measureText(candidate).width <= maxWidth) {
      current = candidate;
      return;
    }
    if (current) lines.push(current);
    current = ctx.measureText(word).width > maxWidth ? pushLongWord(word) : word;
  });
  if (current && lines.length < maxLines) lines.push(current);
  if (lines.length > maxLines) lines.length = maxLines;
  if (lines.length === maxLines && ctx.measureText(lines[lines.length - 1]).width > maxWidth) {
    lines[lines.length - 1] = ellipsizeText(ctx, lines[lines.length - 1], maxWidth);
  }
  return lines;
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
      const expandedMaxTextWidth = options.expandedMaxWidth * hRatio;
      const topOffset = options.topOffset * vRatio;
      const rowGap = options.rowGap * vRatio;
      const lineHeight = options.lineHeight * vRatio;
      const canvasWidth = scope.bitmapSize.width;
      let nextY = topOffset;

      ctx.save();
      ctx.font = options.font.replace(/(\d+(?:\.\d+)?)px/g, (_, size) => `${Number(size) * ratio}px`);
      ctx.textBaseline = 'middle';
      notes.forEach((point) => {
        const isExpanded = source._expandedNoteId === point.id;
        const lines = isExpanded
          ? wrapText(ctx, point.text, expandedMaxTextWidth, options.expandedMaxLines)
          : [ellipsizeText(ctx, point.text, maxTextWidth)];
        if (!lines.length || !lines[0]) return;

        const textWidth = Math.max(...lines.map((line) => ctx.measureText(line).width));
        const textHeight = Math.max(lineHeight, lines.length * lineHeight);
        const boxWidth = textWidth + paddingX * 2;
        const boxHeight = textHeight + paddingY * 2;
        const anchorX = point.x * hRatio;
        const anchorY = point.y * vRatio;
        const x = Math.round(Math.min(Math.max(4 * hRatio, anchorX - boxWidth / 2), canvasWidth - boxWidth - 4 * hRatio));
        const y = Math.round(nextY);
        nextY += boxHeight + rowGap;
        const labelAnchorX = Math.min(Math.max(x + 8 * hRatio, anchorX), x + boxWidth - 8 * hRatio);
        const labelAnchorY = y + boxHeight;
        const anchorSize = options.leaderAnchorSize * ratio;

        ctx.strokeStyle = options.leaderColor;
        ctx.lineWidth = options.leaderWidth * ratio;
        ctx.setLineDash([2 * ratio, 7 * ratio]);
        ctx.beginPath();
        ctx.moveTo(labelAnchorX, labelAnchorY);
        ctx.lineTo(anchorX, anchorY);
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.fillStyle = options.leaderAnchorColor;
        ctx.strokeStyle = options.leaderAnchorBorderColor;
        ctx.lineWidth = 1 * ratio;
        ctx.beginPath();
        ctx.arc(labelAnchorX, labelAnchorY + anchorSize * 0.7, anchorSize, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = point.color || options.backgroundColor;
        const isFlashing = source._flashNoteId === point.id;
        const flashPulse = isFlashing
          ? Math.sin((1 - source._flashProgress) * Math.PI * 3) * (1 - source._flashProgress)
          : 0;
        ctx.strokeStyle = isFlashing ? options.flashBorderColor : (point.borderColor || options.borderColor);
        ctx.lineWidth = (isFlashing ? 2 + Math.max(0, flashPulse) * 2 : 1) * ratio;
        ctx.shadowColor = isFlashing ? options.flashGlowColor : 'transparent';
        ctx.shadowBlur = isFlashing ? (8 + Math.max(0, flashPulse) * 10) * ratio : 0;
        roundRect(ctx, x, y, boxWidth, boxHeight, options.radius * ratio);
        ctx.fill();
        ctx.stroke();
        ctx.shadowBlur = 0;

        ctx.fillStyle = point.textColor || options.textColor;
        ctx.textAlign = 'center';
        const firstLineY = y + paddingY + lineHeight / 2;
        lines.forEach((line, lineIndex) => {
          ctx.fillText(line, x + boxWidth / 2, firstLineY + lineIndex * lineHeight);
        });
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
    this._options = { ...CHART_NOTE_DEFAULT_OPTIONS, ...options };
    this._view = new ChartNoteView(this);
    this._requestUpdate = null;
    this._flashNoteId = '';
    this._flashProgress = 1;
    this._expandedNoteId = '';
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

  hasNote(noteId) {
    return this._notes.some((note) => note.id === noteId);
  }

  setFlash(noteId, progress = 0) {
    this._flashNoteId = noteId || '';
    this._flashProgress = Math.max(0, Math.min(1, Number(progress) || 0));
    this.requestUpdate();
  }

  clearFlash() {
    this._flashNoteId = '';
    this._flashProgress = 1;
    this.requestUpdate();
  }

  setExpandedNote(noteId) {
    const nextId = noteId || '';
    if (this._expandedNoteId === nextId) return;
    this._expandedNoteId = nextId;
    this.requestUpdate();
  }

  updateAllViews() {
    this._view.update();
  }

  paneViews() {
    return [this._view];
  }
}
