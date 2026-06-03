// Render manual SMT evidence on primary NQ and readonly secondary ES charts.

import * as bus from '../event-bus.js';
import * as chart from '../chart/chart-manager.js';
import * as secondaryChart from '../chart/secondary-chart-manager.js';
import * as store from '../data/bar-store.js';
import * as secondaryStore from '../data/secondary-chart-store.js';
import { RangePrimitive, SegmentPrimitive, VerticalLinePrimitive } from '../chart/primitives.js';
import { mapTimestampToChartTime as mapSharedTimestampToChartTime } from '../chart/time-projection.js';
import { getSmtRecords, SMT_DIRECTIONS, SMT_TYPES } from './smt-store.js';
import { timeframeToString } from '../config.js';

let primaryPrimitives = [];
let secondaryPrimitives = [];

function clearPrimary() {
  primaryPrimitives = chart.clearPrimitives(primaryPrimitives);
}

function clearSecondary() {
  secondaryPrimitives = secondaryChart.clearSecondaryPrimitives(secondaryPrimitives);
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

function shouldRenderOnPrimary(record) {
  return !record.display?.hidden && record.timeframe === timeframeToString(store.getCurrentTimeframe());
}

function shouldRenderOnSecondary(record) {
  return (
    !record.display?.hidden &&
    secondaryStore.isSecondaryEnabled() &&
    secondaryStore.getSecondaryInstrument() === 'ES' &&
    record.timeframe === timeframeToString(secondaryStore.getSecondaryTimeframe())
  );
}

function getLineColor(record) {
  return record.direction === SMT_DIRECTIONS.BULLISH ? '#26a69a' : '#ef5350';
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
            lineColor: getLineColor(record),
            textColor: '#ffcc80',
            markerColor: '#ffcc80',
            lineWidth: 2,
            markerSize: 5,
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
        color: 'rgba(255, 204, 128, 0.38)',
        lineWidth: 3,
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
            lineColor: getLineColor(record),
            textColor: '#80cbc4',
            markerColor: '#80cbc4',
            lineWidth: 3,
            markerSize: 5,
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
            record.direction === SMT_DIRECTIONS.BULLISH ? 'rgba(38, 166, 154, 0.16)' : 'rgba(239, 83, 80, 0.14)',
          borderColor: getLineColor(record),
          midlineColor: getLineColor(record),
          textColor: '#d1d4dc',
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
}

export function initSmtRenderer() {
  bus.on('smt:changed', renderAll);
  bus.on('bars:loaded', renderPrimary);
  bus.on('bars:cleared', clearPrimary);
  bus.on('secondary-bars:loaded', renderSecondary);
  bus.on('secondary-bars:cleared', clearSecondary);
  bus.on('secondary-chart:settings-changed', renderSecondary);
  bus.on('secondary-chart:reset', clearSecondary);
}
