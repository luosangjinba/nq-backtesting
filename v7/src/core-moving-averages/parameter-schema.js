import { definePluginParameterSchema } from '../plugin-contract/public.js';

export const MOVING_AVERAGES_PARAMETER_SCHEMA_WIRE = Object.freeze({
  schemaVersion: 1,
  tabs: Object.freeze([
    Object.freeze({
      id: 'inputs',
      source: Object.freeze({
        fields: Object.freeze([
          Object.freeze({
            control: Object.freeze({ kind: 'number', max: 500, min: 2, step: 1 }),
            defaultValue: 20,
            id: 'length',
            label: 'Length',
            scopes: Object.freeze(['package', 'profile', 'instance']),
          }),
        ]),
        kind: 'settings',
      }),
    }),
    Object.freeze({
      id: 'style',
      source: Object.freeze({
        fields: Object.freeze([
          Object.freeze({
            control: Object.freeze({ kind: 'color' }),
            defaultValue: '#2962FFFF',
            id: 'lineColor',
            label: 'Line color',
            scopes: Object.freeze(['package', 'profile', 'instance']),
          }),
          Object.freeze({
            control: Object.freeze({ kind: 'number', max: 4, min: 1, step: 1 }),
            defaultValue: 2,
            id: 'lineWidth',
            label: 'Line width',
            scopes: Object.freeze(['package', 'profile', 'instance']),
          }),
          Object.freeze({
            control: Object.freeze({
              kind: 'select',
              options: Object.freeze([
                Object.freeze({ label: 'Solid', value: 'solid' }),
                Object.freeze({ label: 'Dashed', value: 'dashed' }),
                Object.freeze({ label: 'Dotted', value: 'dotted' }),
              ]),
            }),
            defaultValue: 'solid',
            id: 'linePattern',
            label: 'Line pattern',
            scopes: Object.freeze(['package', 'profile', 'instance']),
          }),
        ]),
        kind: 'settings',
      }),
    }),
    Object.freeze({
      id: 'visibility',
      source: Object.freeze({
        fields: Object.freeze([
          Object.freeze({
            control: Object.freeze({ kind: 'boolean' }),
            defaultValue: true,
            id: 'visible',
            label: 'Visible',
            scopes: Object.freeze(['instance']),
          }),
        ]),
        kind: 'settings',
      }),
    }),
  ]),
});

/** Branded P0a schema used by both the manifest and the pure settings normalizer. */
export const MOVING_AVERAGES_PARAMETER_SCHEMA = definePluginParameterSchema(
  MOVING_AVERAGES_PARAMETER_SCHEMA_WIRE,
);
