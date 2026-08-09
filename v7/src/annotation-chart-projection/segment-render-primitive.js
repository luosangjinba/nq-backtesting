import { readAnnotationProjection } from './annotation-projection.js';
import { failProjection } from './projection-error.js';

const SEGMENT_FIELDS = Object.freeze(['endAnchor', 'startAnchor']);
const ANCHOR_FIELDS = Object.freeze(['epochMs', 'instrumentId', 'price']);

function exactRecord(value, fields, code, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value)
    || Object.keys(value).sort().join(',') !== [...fields].sort().join(',')) {
    failProjection(code, `${label} fields are invalid.`);
  }
}

function readAnchor(value, label) {
  exactRecord(value, ANCHOR_FIELDS, 'ANNOTATION_SEGMENT_GEOMETRY_INVALID', label);
  if (!Number.isSafeInteger(value.epochMs) || value.epochMs < 0 || !Number.isFinite(value.price)
    || typeof value.instrumentId !== 'string' || value.instrumentId.length === 0) {
    failProjection('ANNOTATION_SEGMENT_GEOMETRY_INVALID', `${label} is invalid.`);
  }
  return value;
}

function readSegment(candidate) {
  const projection = readAnnotationProjection(candidate);
  if (projection.geometry.typeId !== 'geometry.segment') {
    failProjection('ANNOTATION_SEGMENT_GEOMETRY_REQUIRED', 'Segment RenderPrimitive requires Segment Geometry.');
  }
  exactRecord(
    projection.geometry.payload,
    SEGMENT_FIELDS,
    'ANNOTATION_SEGMENT_GEOMETRY_INVALID',
    'Segment payload',
  );
  const startAnchor = readAnchor(projection.geometry.payload.startAnchor, 'Segment start anchor');
  const endAnchor = readAnchor(projection.geometry.payload.endAnchor, 'Segment end anchor');
  if (startAnchor.instrumentId !== endAnchor.instrumentId) {
    failProjection('ANNOTATION_SEGMENT_GEOMETRY_INVALID', 'Segment instruments do not match.');
  }
  return Object.freeze({ endAnchor, projection, startAnchor });
}

function renderOptions(value, presentation) {
  const options = {
    color: presentation?.strokeColor ?? '#d946ef',
    handleColor: '#f8fafc',
    handleRadius: 4,
    lineWidth: presentation?.strokeWidth ?? 3,
    showHandles: false,
    ...value,
  };
  if (typeof options.color !== 'string' || options.color.length === 0
    || !/^#[0-9a-fA-F]{6}$/.test(options.handleColor)
    || !Number.isFinite(options.handleRadius) || options.handleRadius < 1
    || !Number.isFinite(options.lineWidth) || options.lineWidth <= 0
    || typeof options.showHandles !== 'boolean') {
    failProjection('ANNOTATION_SEGMENT_OPTIONS_INVALID', 'Segment render options are invalid.');
  }
  return Object.freeze(options);
}

function requireAttached(parameters) {
  if (!parameters || typeof parameters !== 'object'
    || typeof parameters.chart?.timeScale !== 'function'
    || typeof parameters.series?.priceToCoordinate !== 'function'
    || typeof parameters.requestUpdate !== 'function') {
    failProjection('ANNOTATION_SEGMENT_ATTACH_INVALID', 'Segment attach parameters are invalid.');
  }
  return parameters;
}

/** Create one adapter-local, non-interactive Segment Series Primitive handle. */
export function createSegmentRenderPrimitive(projection, options = {}) {
  let segment = readSegment(projection);
  let style = renderOptions(options, segment.projection.presentation);
  let attached = null;
  let destroyed = false;
  let points = Object.freeze({ x1: null, x2: null, y1: null, y2: null });

  function updateView() {
    if (attached === null) return;
    const timeScale = attached.chart.timeScale();
    points = Object.freeze({
      x1: timeScale.timeToCoordinate(segment.startAnchor.epochMs / 1_000),
      x2: timeScale.timeToCoordinate(segment.endAnchor.epochMs / 1_000),
      y1: attached.series.priceToCoordinate(segment.startAnchor.price),
      y2: attached.series.priceToCoordinate(segment.endAnchor.price),
    });
  }

  const renderer = Object.freeze({
    draw(target) {
      target.useBitmapCoordinateSpace((scope) => {
        if (![points.x1, points.x2, points.y1, points.y2].every(Number.isFinite)) return;
        const context = scope.context;
        context.save();
        context.beginPath();
        context.lineWidth = style.lineWidth * Math.max(
          scope.horizontalPixelRatio,
          scope.verticalPixelRatio,
        );
        context.strokeStyle = style.color;
        context.moveTo(
          Math.round(points.x1 * scope.horizontalPixelRatio),
          Math.round(points.y1 * scope.verticalPixelRatio),
        );
        context.lineTo(
          Math.round(points.x2 * scope.horizontalPixelRatio),
          Math.round(points.y2 * scope.verticalPixelRatio),
        );
        context.stroke();
        if (style.showHandles) {
          context.fillStyle = style.handleColor;
          for (const [x, y] of [[points.x1, points.y1], [points.x2, points.y2]]) {
            context.beginPath();
            context.arc(
              Math.round(x * scope.horizontalPixelRatio),
              Math.round(y * scope.verticalPixelRatio),
              style.handleRadius * Math.max(
                scope.horizontalPixelRatio,
                scope.verticalPixelRatio,
              ),
              0,
              Math.PI * 2,
            );
            context.fill();
          }
        }
        context.restore();
      });
    },
  });
  const paneView = Object.freeze({
    renderer: () => renderer,
    zOrder: () => 'normal',
  });
  const paneViews = Object.freeze([paneView]);
  const primitive = Object.freeze({
    attached(parameters) {
      if (destroyed || attached !== null) {
        failProjection('ANNOTATION_SEGMENT_PHASE_INVALID', 'Segment cannot attach in this phase.');
      }
      attached = requireAttached(parameters);
      updateView();
      attached.requestUpdate();
    },
    detached() {
      attached = null;
      points = Object.freeze({ x1: null, x2: null, y1: null, y2: null });
    },
    paneViews: () => paneViews,
    updateAllViews: updateView,
  });

  return Object.freeze({
    destroy() {
      if (attached !== null) {
        failProjection('ANNOTATION_SEGMENT_PHASE_INVALID', 'Attached Segment cannot be destroyed.');
      }
      destroyed = true;
      segment = null;
    },
    primitive,
    hitTest({ tolerancePx = 6, x, y } = {}) {
      if (destroyed || ![x, y, tolerancePx].every(Number.isFinite) || tolerancePx < 0
        || ![points.x1, points.x2, points.y1, points.y2].every(Number.isFinite)) return null;
      const vx = points.x2 - points.x1;
      const vy = points.y2 - points.y1;
      const lengthSquared = (vx * vx) + (vy * vy);
      if (lengthSquared === 0) return null;
      const ratio = Math.max(0, Math.min(1,
        (((x - points.x1) * vx) + ((y - points.y1) * vy)) / lengthSquared));
      const dx = x - (points.x1 + (ratio * vx));
      const dy = y - (points.y1 + (ratio * vy));
      const distancePx = Math.sqrt((dx * dx) + (dy * dy));
      if (distancePx > tolerancePx + (style.lineWidth / 2)) return null;
      return Object.freeze({
        distancePx,
        entityId: segment.projection.entityId,
        projectionId: segment.projection.projectionId,
      });
    },
    snapshot: () => Object.freeze({
      attached: attached !== null,
      destroyed,
      projectionId: segment?.projection.projectionId ?? null,
      revision: segment?.projection.revision ?? null,
    }),
    update(candidate) {
      if (destroyed) {
        failProjection('ANNOTATION_SEGMENT_PHASE_INVALID', 'Destroyed Segment cannot update.');
      }
      segment = readSegment(candidate);
      style = renderOptions(options, segment.projection.presentation);
      updateView();
      attached?.requestUpdate();
    },
  });
}
