import { readAnnotationProjection } from './annotation-projection.js';
import { failProjection } from './projection-error.js';

const RECTANGLE_FIELDS = Object.freeze([
  'endEpochMs', 'highPrice', 'instrumentId', 'lowPrice', 'startEpochMs',
]);

function readRectangle(candidate) {
  const projection = readAnnotationProjection(candidate);
  const payload = projection.geometry.payload;
  if (projection.geometry.typeId !== 'geometry.rectangle'
    || !payload || typeof payload !== 'object' || Array.isArray(payload)
    || Object.keys(payload).sort().join(',') !== [...RECTANGLE_FIELDS].sort().join(',')
    || typeof payload.instrumentId !== 'string' || payload.instrumentId.length === 0
    || !Number.isSafeInteger(payload.startEpochMs) || !Number.isSafeInteger(payload.endEpochMs)
    || payload.startEpochMs >= payload.endEpochMs
    || !Number.isFinite(payload.lowPrice) || !Number.isFinite(payload.highPrice)
    || payload.lowPrice >= payload.highPrice) {
    failProjection(
      'ANNOTATION_RECTANGLE_GEOMETRY_REQUIRED',
      'Rectangle RenderPrimitive requires normalized Rectangle Geometry.',
    );
  }
  return Object.freeze({ payload, projection });
}

function styleFor(options, presentation) {
  const style = Object.freeze({
    fillColor: options.fillColor ?? presentation?.fillColor ?? '#38bdf8',
    fillOpacity: options.fillOpacity ?? presentation?.fillOpacity ?? 0.18,
    handleColor: options.handleColor ?? '#f8fafc',
    handleRadius: options.handleRadius ?? 4,
    showHandles: options.showHandles ?? false,
    strokeColor: options.strokeColor ?? presentation?.strokeColor ?? '#38bdf8',
    strokeWidth: options.strokeWidth ?? presentation?.strokeWidth ?? 2,
  });
  if (!/^#[0-9a-fA-F]{6}$/.test(style.fillColor)
    || !/^#[0-9a-fA-F]{6}$/.test(style.strokeColor)
    || !/^#[0-9a-fA-F]{6}$/.test(style.handleColor)
    || !Number.isFinite(style.fillOpacity) || style.fillOpacity < 0 || style.fillOpacity > 1
    || !Number.isFinite(style.strokeWidth) || style.strokeWidth <= 0
    || !Number.isFinite(style.handleRadius) || style.handleRadius < 1
    || typeof style.showHandles !== 'boolean') {
    failProjection('ANNOTATION_RECTANGLE_OPTIONS_INVALID', 'Rectangle render options are invalid.');
  }
  return style;
}

function requireAttached(parameters) {
  if (!parameters || typeof parameters !== 'object'
    || typeof parameters.chart?.timeScale !== 'function'
    || typeof parameters.series?.priceToCoordinate !== 'function'
    || typeof parameters.requestUpdate !== 'function') {
    failProjection('ANNOTATION_RECTANGLE_ATTACH_INVALID', 'Rectangle attach parameters are invalid.');
  }
  return parameters;
}

function alphaHex(opacity) {
  return Math.round(opacity * 255).toString(16).padStart(2, '0');
}

/** Create one adapter-local Rectangle Primitive with optional selection handles and hit testing. */
export function createRectangleRenderPrimitive(projection, options = {}) {
  let rectangle = readRectangle(projection);
  let style = styleFor(options, rectangle.projection.presentation);
  let attached = null;
  let destroyed = false;
  let box = Object.freeze({ bottom: null, left: null, right: null, top: null });

  function updateView() {
    if (attached === null) return;
    const timeScale = attached.chart.timeScale();
    const left = timeScale.timeToCoordinate(rectangle.payload.startEpochMs / 1_000);
    const right = timeScale.timeToCoordinate(rectangle.payload.endEpochMs / 1_000);
    const top = attached.series.priceToCoordinate(rectangle.payload.highPrice);
    const bottom = attached.series.priceToCoordinate(rectangle.payload.lowPrice);
    box = Object.freeze({ bottom, left, right, top });
  }

  const renderer = Object.freeze({
    draw(target) {
      target.useBitmapCoordinateSpace((scope) => {
        if (![box.bottom, box.left, box.right, box.top].every(Number.isFinite)) return;
        const ratioX = scope.horizontalPixelRatio;
        const ratioY = scope.verticalPixelRatio;
        const left = Math.round(Math.min(box.left, box.right) * ratioX);
        const right = Math.round(Math.max(box.left, box.right) * ratioX);
        const top = Math.round(Math.min(box.top, box.bottom) * ratioY);
        const bottom = Math.round(Math.max(box.top, box.bottom) * ratioY);
        const context = scope.context;
        context.save();
        context.fillStyle = `${style.fillColor}${alphaHex(style.fillOpacity)}`;
        context.fillRect(left, top, Math.max(1, right - left), Math.max(1, bottom - top));
        context.lineWidth = style.strokeWidth * Math.max(ratioX, ratioY);
        context.strokeStyle = style.strokeColor;
        context.strokeRect(left, top, Math.max(1, right - left), Math.max(1, bottom - top));
        if (style.showHandles) {
          context.fillStyle = style.handleColor;
          for (const [x, y] of [[left, top], [right, top], [right, bottom], [left, bottom]]) {
            context.beginPath();
            context.arc(x, y, style.handleRadius * Math.max(ratioX, ratioY), 0, Math.PI * 2);
            context.fill();
          }
        }
        context.restore();
      });
    },
  });
  const paneViews = Object.freeze([Object.freeze({ renderer: () => renderer, zOrder: () => 'normal' })]);
  const primitive = Object.freeze({
    attached(parameters) {
      if (destroyed || attached !== null) {
        failProjection('ANNOTATION_RECTANGLE_PHASE_INVALID', 'Rectangle cannot attach in this phase.');
      }
      attached = requireAttached(parameters);
      updateView();
      attached.requestUpdate();
    },
    detached() {
      attached = null;
      box = Object.freeze({ bottom: null, left: null, right: null, top: null });
    },
    paneViews: () => paneViews,
    updateAllViews: updateView,
  });

  return Object.freeze({
    destroy() {
      if (attached !== null) {
        failProjection('ANNOTATION_RECTANGLE_PHASE_INVALID', 'Attached Rectangle cannot be destroyed.');
      }
      destroyed = true;
      rectangle = null;
    },
    hitTest({ tolerancePx = 4, x, y } = {}) {
      if (destroyed || ![x, y, tolerancePx].every(Number.isFinite) || tolerancePx < 0
        || ![box.bottom, box.left, box.right, box.top].every(Number.isFinite)) return null;
      const left = Math.min(box.left, box.right);
      const right = Math.max(box.left, box.right);
      const top = Math.min(box.top, box.bottom);
      const bottom = Math.max(box.top, box.bottom);
      if (x < left - tolerancePx || x > right + tolerancePx
        || y < top - tolerancePx || y > bottom + tolerancePx) return null;
      const distancePx = x >= left && x <= right && y >= top && y <= bottom
        ? 0 : Math.min(Math.abs(x - left), Math.abs(x - right), Math.abs(y - top), Math.abs(y - bottom));
      return Object.freeze({
        distancePx,
        entityId: rectangle.projection.entityId,
        projectionId: rectangle.projection.projectionId,
      });
    },
    primitive,
    snapshot: () => Object.freeze({
      attached: attached !== null,
      destroyed,
      projectionId: rectangle?.projection.projectionId ?? null,
      revision: rectangle?.projection.revision ?? null,
    }),
    update(candidate) {
      if (destroyed) {
        failProjection('ANNOTATION_RECTANGLE_PHASE_INVALID', 'Destroyed Rectangle cannot update.');
      }
      rectangle = readRectangle(candidate);
      style = styleFor(options, rectangle.projection.presentation);
      updateView();
      attached?.requestUpdate();
    },
  });
}
