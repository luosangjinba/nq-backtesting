import { nativeLineStyle } from './calculated-series-native-options.js';

function segments(points) {
  const output = [];
  let active = [];
  for (const point of points) {
    if (point.state === 'whitespace') {
      if (active.length > 0) output.push(active);
      active = [];
    } else active.push(point);
  }
  if (active.length > 0) output.push(active);
  return output;
}

function dash(pattern, ratio) {
  if (nativeLineStyle(pattern) === 2) return [6 * ratio, 4 * ratio];
  if (nativeLineStyle(pattern) === 1) return [2 * ratio, 3 * ratio];
  return [];
}

/** Render already-calculated band points; this Primitive owns no calculation or subscription. */
export function createCalculatedSeriesBandPrimitive(initialResource) {
  let attached = null;
  let destroyed = false;
  let resource = initialResource;
  let projected = Object.freeze([]);

  function updateAllViews() {
    if (attached === null) return;
    const timeScale = attached.chart.timeScale();
    projected = Object.freeze(segments(resource.points).map((segment) => Object.freeze(
      segment.map((point) => Object.freeze({
        lower: attached.series.priceToCoordinate(point.lower),
        upper: attached.series.priceToCoordinate(point.upper),
        x: timeScale.timeToCoordinate(point.displayEpochMs / 1_000),
      })),
    )));
  }

  function drawStroke(context, points, field, stroke, ratioX, ratioY) {
    if (points.length < 2) return;
    context.beginPath();
    context.lineWidth = stroke.width * Math.max(ratioX, ratioY);
    context.strokeStyle = stroke.color;
    context.setLineDash(dash(stroke.pattern, Math.max(ratioX, ratioY)));
    points.forEach((point, index) => {
      const x = Math.round(point.x * ratioX);
      const y = Math.round(point[field] * ratioY);
      if (index === 0) context.moveTo(x, y);
      else context.lineTo(x, y);
    });
    context.stroke();
  }

  const renderer = Object.freeze({
    draw(target) {
      target.useBitmapCoordinateSpace((scope) => {
        const context = scope.context;
        for (const points of projected) {
          if (points.length === 0 || points.some(({ lower, upper, x }) => (
            ![lower, upper, x].every(Number.isFinite)
          ))) continue;
          context.save();
          context.fillStyle = resource.style.fillColor;
          context.beginPath();
          points.forEach((point, index) => {
            const x = Math.round(point.x * scope.horizontalPixelRatio);
            const y = Math.round(point.upper * scope.verticalPixelRatio);
            if (index === 0) context.moveTo(x, y);
            else context.lineTo(x, y);
          });
          [...points].reverse().forEach((point) => context.lineTo(
            Math.round(point.x * scope.horizontalPixelRatio),
            Math.round(point.lower * scope.verticalPixelRatio),
          ));
          context.closePath();
          context.fill();
          drawStroke(context, points, 'upper', resource.style.upperStroke,
            scope.horizontalPixelRatio, scope.verticalPixelRatio);
          drawStroke(context, points, 'lower', resource.style.lowerStroke,
            scope.horizontalPixelRatio, scope.verticalPixelRatio);
          context.restore();
        }
      });
    },
  });
  const views = Object.freeze([Object.freeze({ renderer: () => renderer, zOrder: () => 'top' })]);
  const primitive = Object.freeze({
    attached(parameters) {
      if (destroyed || attached !== null) throw new Error('Band Primitive cannot attach in this phase.');
      attached = parameters;
      updateAllViews();
      attached.requestUpdate();
    },
    autoscaleInfo() {
      const values = resource.points.flatMap((point) => (
        point.state === 'value' ? [point.lower, point.upper] : []
      ));
      return values.length === 0 ? null : {
        priceRange: { maxValue: Math.max(...values), minValue: Math.min(...values) },
      };
    },
    detached() { attached = null; projected = Object.freeze([]); },
    paneViews: () => views,
    updateAllViews,
  });

  return Object.freeze({
    destroy() {
      if (attached !== null) throw new Error('Attached Band Primitive cannot be destroyed.');
      destroyed = true;
      resource = null;
    },
    primitive,
    snapshot: () => Object.freeze({ attached: attached !== null, destroyed }),
    update(nextResource) {
      if (destroyed) throw new Error('Destroyed Band Primitive cannot update.');
      resource = nextResource;
      updateAllViews();
      attached?.requestUpdate();
    },
  });
}
