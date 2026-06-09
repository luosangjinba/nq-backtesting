import { buildChartNoteLayouts } from './chart-note-layout.js';
import { getChartLabelFont, getDisplayPreferenceFactors } from '../display/display-preferences.js';

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
  rangeFillColor: 'rgba(255, 247, 168, 0.10)',
  rangeBorderColor: 'rgba(255, 247, 168, 0.32)',
};

export function getChartNoteOptions() {
  const { uiScale, chartTextScale } = getDisplayPreferenceFactors();
  const scale = uiScale * chartTextScale;
  return {
    ...CHART_NOTE_DEFAULT_OPTIONS,
    font: getChartLabelFont(11, 'sans-serif', 'bold'),
    lineHeight: 14 * scale,
    maxWidth: 180 * scale,
    expandedMaxWidth: 420 * scale,
    rowGap: 6 * scale,
  };
}

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
      const paddingY = options.paddingY * vRatio;
      const lineHeight = options.lineHeight * vRatio;
      const canvasWidth = scope.bitmapSize.width;

      ctx.save();
      ctx.font = options.font.replace(/(\d+(?:\.\d+)?)px/g, (_, size) => `${Number(size) * ratio}px`);
      ctx.textBaseline = 'middle';
      const layouts = buildChartNoteLayouts(notes, options, {
        ctx,
        hRatio,
        vRatio,
        canvasWidth,
        expandedNoteId: source._expandedNoteId,
      });

      layouts
        .filter((point) => point.kind === 'range' && point.xStart !== null && point.xEnd !== null)
        .forEach((point) => {
          const left = Math.min(point.xStart, point.xEnd) * hRatio;
          const right = Math.max(point.xStart, point.xEnd) * hRatio;
          const width = Math.max(2 * hRatio, right - left);
          ctx.fillStyle = options.rangeFillColor;
          ctx.strokeStyle = options.rangeBorderColor;
          ctx.lineWidth = Math.max(1, ratio);
          ctx.fillRect(left, 0, width, scope.bitmapSize.height);
          ctx.beginPath();
          ctx.moveTo(left, 0);
          ctx.lineTo(left, scope.bitmapSize.height);
          ctx.moveTo(left + width, 0);
          ctx.lineTo(left + width, scope.bitmapSize.height);
          ctx.stroke();
        });

      layouts.forEach((point) => {
        const { lines, boxX: x, boxY: y, boxWidth, boxHeight, anchorX, anchorY } = point;
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
      xStart: note.rangeStartTime === undefined ? null : source._chart.timeScale().timeToCoordinate(note.rangeStartTime),
      xEnd: note.rangeEndTime === undefined ? null : source._chart.timeScale().timeToCoordinate(note.rangeEndTime),
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
