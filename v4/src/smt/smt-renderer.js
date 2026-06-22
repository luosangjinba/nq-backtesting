// Render manual SMT evidence on primary NQ and readonly secondary ES charts.

import * as bus from '../event-bus.js';
import * as chart from '../chart/chart-manager.js';
import * as secondaryChart from '../chart/secondary-chart-manager.js';
import * as comparisonChart from '../chart/comparison-chart-manager.js';
import * as store from '../data/bar-store.js';
import * as secondaryStore from '../data/secondary-chart-store.js';
import * as comparisonStore from '../comparison/comparison-window-store.js';
import { RangePrimitive, SegmentPrimitive, VerticalLinePrimitive } from '../chart/primitives.js';
import { mapTimestampToChartTime as mapSharedTimestampToChartTime } from '../chart/time-projection.js';
import { getSmtRecords, SMT_DIRECTIONS, SMT_TYPES } from './smt-store.js';
import { timeframeToString } from '../config.js';
import { getChartLabelFont } from '../display/display-preferences.js';
import { getPrimaryInstrument } from '../data/primary-instrument-store.js';
import { getSelectedSmt } from './smt-selection.js';

let primaryPrimitives = [];
let secondaryPrimitives = [];
let comparisonPrimitives = [];

function clearPrimary() {
  primaryPrimitives = chart.clearPrimitives(primaryPrimitives);
}

function clearSecondary() {
  secondaryPrimitives = secondaryChart.clearSecondaryPrimitives(secondaryPrimitives);
}

function clearComparison() {
  comparisonPrimitives = comparisonChart.clearComparisonPrimitives(comparisonPrimitives);
}

function attachPrimary(primitive) {
  if (!primitive) return;
  chart.attachPrimitive(primitive);
  primitive.requestUpdate?.();
  primaryPrimitives.push(primitive);
}

function attachSecondary(primitive) {
  if (!primitive) return;
  secondaryChart.attachSecondaryPrimitive(primitive);
  primitive.requestUpdate?.();
  secondaryPrimitives.push(primitive);
}

function attachComparison(primitive) {
  if (!primitive) return;
  comparisonChart.attachComparisonPrimitive(primitive);
  primitive.requestUpdate?.();
  comparisonPrimitives.push(primitive);
}

function shouldRenderOnPrimary(record) {
  return (
    !record.display?.hidden &&
    record.primaryInstrument === getPrimaryInstrument() &&
    record.timeframe === timeframeToString(store.getCurrentTimeframe())
  );
}

function shouldRenderOnSecondary(record) {
  return (
    !record.display?.hidden &&
    secondaryStore.isSecondaryEnabled() &&
    record.primaryInstrument === getPrimaryInstrument() &&
    record.compareInstrument === secondaryStore.getSecondaryInstrument() &&
    record.timeframe === timeframeToString(secondaryStore.getSecondaryTimeframe())
  );
}

function shouldRenderOnComparison(record) {
  const state = comparisonStore.getComparisonWindowState();
  return (
    !record.display?.hidden &&
    state.enabled &&
    record.primaryInstrument === getPrimaryInstrument() &&
    record.compareInstrument === state.descriptor.instrument &&
    record.timeframe === timeframeToString(state.descriptor.timeframe)
  );
}

function getLineColor(record) {
  return record.direction === SMT_DIRECTIONS.BULLISH ? '#26a69a' : '#ef5350';
}

function isSelectedRecord(record) {
  const selection = getSelectedSmt();
  return Boolean(selection?.id && record?.id && String(selection.id) === String(record.id));
}

function mapTimestampToChartTime(timestamp, timeframe, bars = []) {
  return mapSharedTimestampToChartTime(timestamp, timeframe, bars);
}

function renderPrimary() {
  clearPrimary();
  const chartInstance = chart.getChart();
  const series = chart.getSeries();
  if (!chartInstance || !series) return;
  const timeframe = store.getCurrentTimeframe();
  const bars = store.getDisplayBars();

  getSmtRecords().filter(shouldRenderOnPrimary).forEach((record) => {
    const selected = isSelectedRecord(record);
    if (record.type === SMT_TYPES.LIQUIDITY) {
      const leftTime = mapTimestampToChartTime(record.leftTimestamp, timeframe, bars);
      const rightTime = mapTimestampToChartTime(record.rightTimestamp, timeframe, bars);
      if (leftTime === null || rightTime === null) return;
      attachPrimary(
        new SegmentPrimitive(
          chartInstance,
          series,
          leftTime,
          record.primaryLeftPrice,
          rightTime,
          record.primaryRightPrice,
          'NQ no sweep',
          {
            lineColor: selected ? '#ffd54f' : getLineColor(record),
            textColor: selected ? '#ffd54f' : '#ffcc80',
            markerColor: selected ? '#ffd54f' : '#ffcc80',
            lineWidth: selected ? 4 : 2,
            markerSize: selected ? 7 : 5,
            labelFont: getChartLabelFont(11),
            showLabel: true,
          }
        )
      );
      return;
    }

    const markerTime = mapTimestampToChartTime(record.timestamp, timeframe, bars);
    if (markerTime === null) return;
    attachPrimary(
      new VerticalLinePrimitive(chartInstance, markerTime, {
        color: selected ? 'rgba(255, 213, 79, 0.75)' : 'rgba(255, 204, 128, 0.38)',
        lineWidth: selected ? 5 : 3,
      })
    );
  });
}

function renderSecondary() {
  clearSecondary();
  const chartInstance = secondaryChart.getSecondaryChart();
  const series = secondaryChart.getSecondarySeries();
  if (!chartInstance || !series) return;
  const timeframe = secondaryStore.getSecondaryTimeframe();
  const bars = secondaryStore.getSecondaryDisplayBars();

  getSmtRecords().filter(shouldRenderOnSecondary).forEach((record) => {
    const selected = isSelectedRecord(record);
    if (record.type === SMT_TYPES.LIQUIDITY) {
      const leftTime = mapTimestampToChartTime(record.leftTimestamp, timeframe, bars);
      const rightTime = mapTimestampToChartTime(record.rightTimestamp, timeframe, bars);
      if (leftTime === null || rightTime === null) return;
      attachSecondary(
        new SegmentPrimitive(
          chartInstance,
          series,
          leftTime,
          record.compareLeftPrice,
          rightTime,
          record.compareRightPrice,
          'ES sweep',
          {
            lineColor: selected ? '#ffd54f' : getLineColor(record),
            textColor: selected ? '#ffd54f' : '#80cbc4',
            markerColor: selected ? '#ffd54f' : '#80cbc4',
            lineWidth: selected ? 5 : 3,
            markerSize: selected ? 7 : 5,
            labelFont: getChartLabelFont(11),
            showLabel: true,
          }
        )
      );
      return;
    }

    const startTime = mapTimestampToChartTime(record.fvgStartTimestamp, timeframe, bars);
    const endTime = mapTimestampToChartTime(record.fvgEndTimestamp, timeframe, bars);
    if (startTime === null || endTime === null) return;
    attachSecondary(
      new RangePrimitive(
        chartInstance,
        series,
        startTime,
        endTime,
        record.fvgTop,
        record.fvgBottom,
        'ES FVG SMT',
        {
          fillColor:
            selected
              ? 'rgba(255, 213, 79, 0.16)'
              : record.direction === SMT_DIRECTIONS.BULLISH ? 'rgba(38, 166, 154, 0.16)' : 'rgba(239, 83, 80, 0.14)',
          borderColor: selected ? '#ffd54f' : getLineColor(record),
          midlineColor: selected ? '#ffd54f' : getLineColor(record),
          textColor: selected ? '#ffd54f' : '#d1d4dc',
          labelFont: getChartLabelFont(11),
          showMidline: true,
          showLabel: true,
        }
      )
    );
  });
}

function renderComparison() {
  clearComparison();
  const chartInstance = comparisonChart.getComparisonChart();
  const series = comparisonChart.getComparisonSeries();
  if (!chartInstance || !series) return;
  const state = comparisonStore.getComparisonWindowState();
  const timeframe = state.descriptor.timeframe;
  const bars = comparisonStore.getComparisonDisplayBars();

  getSmtRecords().filter(shouldRenderOnComparison).forEach((record) => {
    const selected = isSelectedRecord(record);
    if (record.type === SMT_TYPES.LIQUIDITY) {
      const leftTime = mapTimestampToChartTime(record.leftTimestamp, timeframe, bars);
      const rightTime = mapTimestampToChartTime(record.rightTimestamp, timeframe, bars);
      if (leftTime === null || rightTime === null) return;
      attachComparison(
        new SegmentPrimitive(
          chartInstance,
          series,
          leftTime,
          record.compareLeftPrice,
          rightTime,
          record.compareRightPrice,
          'ES sweep',
          {
            lineColor: selected ? '#ffd54f' : getLineColor(record),
            textColor: selected ? '#ffd54f' : '#80cbc4',
            markerColor: selected ? '#ffd54f' : '#80cbc4',
            lineWidth: selected ? 5 : 3,
            markerSize: selected ? 7 : 5,
            labelFont: getChartLabelFont(11),
            showLabel: true,
          }
        )
      );
      return;
    }

    const startTime = mapTimestampToChartTime(record.fvgStartTimestamp, timeframe, bars);
    const endTime = mapTimestampToChartTime(record.fvgEndTimestamp, timeframe, bars);
    if (startTime === null || endTime === null) return;
    attachComparison(
      new RangePrimitive(
        chartInstance,
        series,
        startTime,
        endTime,
        record.fvgTop,
        record.fvgBottom,
        'ES FVG SMT',
        {
          fillColor:
            selected
              ? 'rgba(255, 213, 79, 0.16)'
              : record.direction === SMT_DIRECTIONS.BULLISH ? 'rgba(38, 166, 154, 0.16)' : 'rgba(239, 83, 80, 0.14)',
          borderColor: selected ? '#ffd54f' : getLineColor(record),
          midlineColor: selected ? '#ffd54f' : getLineColor(record),
          textColor: selected ? '#ffd54f' : '#d1d4dc',
          labelFont: getChartLabelFont(11),
          showMidline: true,
          showLabel: true,
        }
      )
    );
  });
}

function renderAll() {
  renderPrimary();
  renderSecondary();
  renderComparison();
}

export function initSmtRenderer() {
  bus.on('smt:changed', renderAll);
  bus.on('smt:selected', renderAll);
  bus.on('smt:selection-cleared', renderAll);
  bus.on('display-preferences:changed', renderAll);
  bus.on('primary-instrument:changed', renderAll);
  bus.on('bars:loaded', renderPrimary);
  bus.on('bars:cleared', clearPrimary);
  bus.on('secondary-bars:loaded', renderSecondary);
  bus.on('secondary-bars:cleared', clearSecondary);
  bus.on('secondary-chart:settings-changed', renderSecondary);
  bus.on('secondary-chart:reset', clearSecondary);
  bus.on('comparison-bars:loaded', renderComparison);
  bus.on('comparison-bars:cleared', clearComparison);
}
