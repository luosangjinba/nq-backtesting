import { failCalculatedSeries } from './contract-error.js';
import { CALCULATED_SERIES_LIMITS } from './limits.js';
import {
  displayLabel,
  enumValue,
  exactArray,
  exactRecord,
  finiteNumber,
  opaqueId,
  optionalExactRecord,
  safeInteger,
  uniqueIds,
} from './portable-value.js';
import { defineScaleIntent } from './scale-catalog.js';

const COLOR = /^#[0-9A-Fa-f]{8}$/u;
const PLOT_KINDS = Object.freeze(['area', 'band', 'baseline', 'histogram', 'line']);

function color(value, label) {
  if (typeof value !== 'string' || !COLOR.test(value)) {
    failCalculatedSeries('CALCULATED_SERIES_STYLE_INVALID', `${label} must be #RRGGBBAA.`);
  }
  return value.toUpperCase();
}

function stroke(value, label) {
  exactRecord(value, ['color', 'pattern', 'width'], 'CALCULATED_SERIES_STYLE_INVALID', label);
  return Object.freeze({
    color: color(value.color, `${label} color`),
    pattern: enumValue(value.pattern, ['solid', 'dashed', 'dotted'], 'CALCULATED_SERIES_STYLE_INVALID', `${label} pattern`),
    width: enumValue(value.width, [1, 2, 3, 4], 'CALCULATED_SERIES_STYLE_INVALID', `${label} width`),
  });
}

function lineStyle(value) {
  exactRecord(value, ['stroke'], 'CALCULATED_SERIES_STYLE_INVALID', 'Line style');
  return Object.freeze({ stroke: stroke(value.stroke, 'Line stroke') });
}

function histogramStyle(value) {
  exactRecord(value, ['baseValue', 'negativeColor', 'positiveColor'], 'CALCULATED_SERIES_STYLE_INVALID', 'Histogram style');
  return Object.freeze({
    baseValue: finiteNumber(value.baseValue, 'Histogram base value'),
    negativeColor: color(value.negativeColor, 'Histogram negative color'),
    positiveColor: color(value.positiveColor, 'Histogram positive color'),
  });
}

function areaStyle(value) {
  exactRecord(value, ['bottomFillColor', 'stroke', 'topFillColor'], 'CALCULATED_SERIES_STYLE_INVALID', 'Area style');
  return Object.freeze({
    bottomFillColor: color(value.bottomFillColor, 'Area bottom fill'),
    stroke: stroke(value.stroke, 'Area stroke'),
    topFillColor: color(value.topFillColor, 'Area top fill'),
  });
}

function baselineStyle(value) {
  exactRecord(value, [
    'baseValue', 'bottomFillColor', 'bottomStroke', 'topFillColor', 'topStroke',
  ], 'CALCULATED_SERIES_STYLE_INVALID', 'Baseline style');
  return Object.freeze({
    baseValue: finiteNumber(value.baseValue, 'Baseline base value'),
    bottomFillColor: color(value.bottomFillColor, 'Baseline bottom fill'),
    bottomStroke: stroke(value.bottomStroke, 'Baseline bottom stroke'),
    topFillColor: color(value.topFillColor, 'Baseline top fill'),
    topStroke: stroke(value.topStroke, 'Baseline top stroke'),
  });
}

function bandStyle(value) {
  exactRecord(value, ['fillColor', 'lowerStroke', 'upperStroke'], 'CALCULATED_SERIES_STYLE_INVALID', 'Band style');
  return Object.freeze({
    fillColor: color(value.fillColor, 'Band fill'),
    lowerStroke: stroke(value.lowerStroke, 'Band lower stroke'),
    upperStroke: stroke(value.upperStroke, 'Band upper stroke'),
  });
}

function plotStyle(kind, value) {
  if (kind === 'line') return lineStyle(value);
  if (kind === 'histogram') return histogramStyle(value);
  if (kind === 'area') return areaStyle(value);
  if (kind === 'baseline') return baselineStyle(value);
  return bandStyle(value);
}

function referenceLineStyle(value) {
  exactRecord(value, ['labelVisibility', 'stroke'], 'CALCULATED_SERIES_STYLE_INVALID', 'Reference-line style');
  return Object.freeze({
    labelVisibility: enumValue(value.labelVisibility, ['visible', 'hidden'], 'CALCULATED_SERIES_STYLE_INVALID', 'Reference-line label visibility'),
    stroke: stroke(value.stroke, 'Reference-line stroke'),
  });
}

export function definePlot(value = {}) {
  exactRecord(value, ['displayName', 'kind', 'legendIntent', 'plotId', 'style', 'visibleByDefault'],
    'CALCULATED_SERIES_PLOT_INVALID', 'Plot');
  const kind = enumValue(value.kind, PLOT_KINDS, 'CALCULATED_SERIES_PLOT_UNSUPPORTED', 'Plot kind');
  if (typeof value.visibleByDefault !== 'boolean') {
    failCalculatedSeries('CALCULATED_SERIES_PLOT_INVALID', 'Plot visibility default is invalid.');
  }
  return Object.freeze({
    displayName: displayLabel(value.displayName),
    kind,
    legendIntent: enumValue(value.legendIntent, ['value', 'hidden'], 'CALCULATED_SERIES_PLOT_INVALID', 'Legend intent'),
    plotId: opaqueId(value.plotId, 'Plot id'),
    style: plotStyle(kind, value.style),
    visibleByDefault: value.visibleByDefault,
  });
}

export function defineReferenceLine(value = {}) {
  exactRecord(value, [
    'displayName', 'legendIntent', 'referenceLineId', 'style', 'value', 'visibleByDefault',
  ], 'CALCULATED_SERIES_REFERENCE_LINE_INVALID', 'Reference line');
  if (typeof value.visibleByDefault !== 'boolean') {
    failCalculatedSeries('CALCULATED_SERIES_REFERENCE_LINE_INVALID', 'Reference-line visibility is invalid.');
  }
  return Object.freeze({
    displayName: displayLabel(value.displayName),
    legendIntent: enumValue(value.legendIntent, ['value', 'hidden'], 'CALCULATED_SERIES_REFERENCE_LINE_INVALID', 'Reference-line legend intent'),
    referenceLineId: opaqueId(value.referenceLineId, 'Reference-line id'),
    style: referenceLineStyle(value.style),
    value: finiteNumber(value.value, 'Reference-line value'),
    visibleByDefault: value.visibleByDefault,
  });
}

export function definePlotGroup(value = {}) {
  optionalExactRecord(value,
    ['defaultPlacement', 'displayName', 'plotGroupId', 'plots', 'referenceLines', 'scaleIntent'],
    ['defaultRegionHeightWeight'], 'CALCULATED_SERIES_PLOT_GROUP_INVALID', 'Plot Group');
  exactArray(
    value.plots,
    { minimum: 1, maximum: CALCULATED_SERIES_LIMITS.maximumPlotsPerGroup },
    'CALCULATED_SERIES_RESOURCE_LIMIT',
    'Plot Group Plots',
  );
  exactArray(
    value.referenceLines,
    { maximum: CALCULATED_SERIES_LIMITS.maximumReferenceLinesPerGroup },
    'CALCULATED_SERIES_RESOURCE_LIMIT',
    'Plot Group reference lines',
  );
  const defaultPlacement = enumValue(value.defaultPlacement, ['main', 'own-region'], 'CALCULATED_SERIES_PLOT_GROUP_INVALID', 'Default placement');
  if (defaultPlacement === 'own-region' && value.defaultRegionHeightWeight === undefined) {
    failCalculatedSeries('CALCULATED_SERIES_PLOT_GROUP_INVALID', 'Own-region Plot Group requires height weight.');
  }
  if (defaultPlacement === 'main' && value.defaultRegionHeightWeight !== undefined) {
    failCalculatedSeries('CALCULATED_SERIES_PLOT_GROUP_INVALID', 'Main Plot Group cannot declare height weight.');
  }
  const plots = uniqueIds(value.plots.map(definePlot), 'plotId', 'Plot');
  const referenceLines = uniqueIds(value.referenceLines.map(defineReferenceLine), 'referenceLineId', 'Reference line');
  return Object.freeze({
    ...(value.defaultRegionHeightWeight === undefined ? {} : {
      defaultRegionHeightWeight: safeInteger(value.defaultRegionHeightWeight, 'Default region height weight', { minimum: 1, maximum: 100 }),
    }),
    defaultPlacement,
    displayName: displayLabel(value.displayName),
    plotGroupId: opaqueId(value.plotGroupId, 'Plot Group id'),
    plots: Object.freeze(plots),
    referenceLines: Object.freeze(referenceLines),
    scaleIntent: defineScaleIntent(value.scaleIntent),
  });
}

export const CALCULATED_SERIES_PLOT_KINDS = PLOT_KINDS;
