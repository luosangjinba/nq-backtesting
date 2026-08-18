import { resolvePluginSettings } from '../plugin-contract/public.js';
import { MOVING_AVERAGES_PARAMETER_SCHEMA } from './parameter-schema.js';

function valueMap(resolved) {
  return new Map(resolved.values.map((entry) => [entry.fieldId, entry]));
}

/** Resolve P0a layers into formula, complete style, visibility, and source evidence. */
export function normalizeMovingAveragesSettings(layers = {}) {
  const resolved = resolvePluginSettings(MOVING_AVERAGES_PARAMETER_SCHEMA, layers);
  const values = valueMap(resolved);
  const read = (id) => values.get(id).value;
  const sources = Object.freeze(Object.fromEntries(
    [...values].map(([id, entry]) => [id, entry.source]),
  ));
  const effectiveValues = Object.freeze(Object.fromEntries(
    [...values].map(([id, entry]) => [id, entry.value]),
  ));
  return Object.freeze({
    effectiveValues,
    parameters: Object.freeze({ length: read('length') }),
    sources,
    styleOverrides: Object.freeze([Object.freeze({
      plotGroupId: 'sma-price',
      style: Object.freeze({
        stroke: Object.freeze({
          color: read('lineColor'), pattern: read('linePattern'), width: read('lineWidth'),
        }),
      }),
      targetId: 'sma',
      targetKind: 'plot',
    })]),
    visibility: read('visible') ? 'visible' : 'hidden',
  });
}
