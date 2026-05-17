/**
 * annotation.js - 图表标注模块
 * 复用 pda-renderer 的 Primitive，保持与自动扫描 PDA 一致的样式
 */

import { state } from './chart.js';
import { formatTimestamp } from './utils.js';
import { LiquidityPrimitive, FvgPrimitive, SegmentPrimitive } from './pda-renderer.js';

export const annotations = {
  swings: [],
  swingLows: [],
  swingHighs: [],
  segments: [],
  fvgs: [],
  actionHistory: [],
  lastExportedSignature: null,
};

function triggerRedraw() {
  if (state.chart) {
    state.chart.applyOptions({});
  }
}

function makeId(prefix) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function syncLegacySwingArrays() {
  annotations.swingLows = annotations.swings.filter((swing) => swing.kind === 'low');
  annotations.swingHighs = annotations.swings.filter((swing) => swing.kind === 'high');
}

function detachPrimitive(primitive) {
  if (state.candlestickSeries && primitive) {
    state.candlestickSeries.detachPrimitive(primitive);
  }
}

function getStage3Signature() {
  return JSON.stringify({
    swings: annotations.swings.map(({ id, kind, time, price, timeframe }) => ({
      id,
      kind,
      time,
      price,
      timeframe,
    })),
    segments: annotations.segments.map(
      ({ id, startSwingId, endSwingId, direction, timeframe }) => ({
        id,
        startSwingId,
        endSwingId,
        direction,
        timeframe,
      })
    ),
  });
}

function getSwingById(swingId) {
  return annotations.swings.find((swing) => swing.id === swingId) || null;
}

function getUnlinkedSwings() {
  const linkedSwingIds = new Set();
  annotations.segments.forEach((segment) => {
    linkedSwingIds.add(segment.startSwingId);
    linkedSwingIds.add(segment.endSwingId);
  });
  return annotations.swings.filter((swing) => !linkedSwingIds.has(swing.id));
}

function formatYamlTime(timestamp) {
  return `${formatTimestamp(timestamp)}:00`;
}

function yamlQuote(value) {
  return `"${String(value).replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
}

export function addSwingPoint(kind, time, price, timeframe) {
  const isHigh = kind === 'high';
  const primitive = new LiquidityPrimitive(
    state.chart,
    state.candlestickSeries,
    time,
    price,
    isHigh ? '#5b9cf6' : '#ffb74d',
    isHigh ? '#26a69a' : '#ef5350',
    isHigh ? 'SH' : 'SL',
    isHigh ? 'above' : 'below'
  );
  state.candlestickSeries.attachPrimitive(primitive);

  const swing = {
    id: makeId(isHigh ? 'swing_high' : 'swing_low'),
    kind,
    time,
    price,
    timeframe,
    primitive,
  };

  annotations.swings.push(swing);
  annotations.actionHistory.push({ type: 'swing', id: swing.id });
  syncLegacySwingArrays();
  triggerRedraw();
  return swing;
}

export function addSwingLow(time, price, timeframe) {
  return addSwingPoint('low', time, price, timeframe).id;
}

export function addSwingHigh(time, price, timeframe) {
  return addSwingPoint('high', time, price, timeframe).id;
}

export function createSegmentFromRecentSwings() {
  if (annotations.swings.length < 2) {
    throw new Error('请先标记两个 Swing 点');
  }

  const recentSwings = annotations.swings.slice(-2);
  const [startSwing, endSwing] = [...recentSwings].sort((a, b) => a.time - b.time);

  if (startSwing.time === endSwing.time) {
    throw new Error('最近两个 Swing 点时间相同，无法创建行情段');
  }

  if (startSwing.kind === endSwing.kind) {
    throw new Error('最近两个 Swing 点类型相同，无法创建行情段');
  }

  const exists = annotations.segments.some(
    (segment) => segment.startSwingId === startSwing.id && segment.endSwingId === endSwing.id
  );
  if (exists) {
    throw new Error('这两个 Swing 点的行情段已存在');
  }

  const direction = startSwing.kind === 'low' ? 'bullish' : 'bearish';
  const primitive = new SegmentPrimitive(
    state.chart,
    state.candlestickSeries,
    startSwing.time,
    startSwing.price,
    endSwing.time,
    endSwing.price,
    direction === 'bullish' ? '#26a69a' : '#ef5350'
  );
  state.candlestickSeries.attachPrimitive(primitive);

  const segment = {
    id: makeId('segment'),
    startSwingId: startSwing.id,
    endSwingId: endSwing.id,
    direction,
    timeframe: endSwing.timeframe || startSwing.timeframe,
    primitive,
  };

  annotations.segments.push(segment);
  annotations.actionHistory.push({ type: 'segment', id: segment.id });
  triggerRedraw();
  return { segment, startSwing, endSwing };
}

export function undoLastStage3Action() {
  const lastAction = annotations.actionHistory.pop();
  if (!lastAction) {
    throw new Error('没有可撤销的阶段 3 标注');
  }

  if (lastAction.type === 'segment') {
    const index = annotations.segments.findIndex((segment) => segment.id === lastAction.id);
    if (index >= 0) {
      const [segment] = annotations.segments.splice(index, 1);
      detachPrimitive(segment.primitive);
    }
  } else if (lastAction.type === 'swing') {
    const index = annotations.swings.findIndex((swing) => swing.id === lastAction.id);
    if (index >= 0) {
      const [swing] = annotations.swings.splice(index, 1);
      detachPrimitive(swing.primitive);
      syncLegacySwingArrays();
    }
  }

  triggerRedraw();
}

export function clearStage3Annotations() {
  annotations.segments.forEach((segment) => detachPrimitive(segment.primitive));
  annotations.swings.forEach((swing) => detachPrimitive(swing.primitive));

  annotations.segments = [];
  annotations.swings = [];
  annotations.actionHistory = [];
  syncLegacySwingArrays();
  triggerRedraw();
}

export function hasDirtyStage3Annotations() {
  const hasStage3Annotations = annotations.swings.length > 0 || annotations.segments.length > 0;
  return hasStage3Annotations && getStage3Signature() !== annotations.lastExportedSignature;
}

export function markStage3AnnotationsExported() {
  if (annotations.swings.length === 0 && annotations.segments.length === 0) {
    annotations.lastExportedSignature = null;
    return;
  }

  annotations.lastExportedSignature = getStage3Signature();
}

export function buildSwingLegYaml(sessionMeta) {
  if (annotations.segments.length === 0) {
    throw new Error('当前没有已创建的行情段可导出');
  }

  const unlinkedSwings = getUnlinkedSwings();
  if (unlinkedSwings.length > 0) {
    throw new Error(
      `还有 ${unlinkedSwings.length} 个未成段 Swing 点，请先创建行情段、撤销或清空后再导出`
    );
  }

  const sessionDate = sessionMeta.date;
  const compactDate = sessionDate.replace(/-/g, '');
  const orderedSegments = [...annotations.segments].sort((a, b) => {
    const aStart = getSwingById(a.startSwingId)?.time || 0;
    const bStart = getSwingById(b.startSwingId)?.time || 0;
    if (aStart !== bStart) return aStart - bStart;
    const aEnd = getSwingById(a.endSwingId)?.time || 0;
    const bEnd = getSwingById(b.endSwingId)?.time || 0;
    return aEnd - bEnd;
  });

  const lines = [];
  lines.push('session:');
  lines.push(`  date: ${yamlQuote(sessionDate)}`);
  lines.push(`  timeframe: ${yamlQuote(sessionMeta.timeframe)}`);
  lines.push(`  created_at: ${yamlQuote(sessionMeta.generatedAt)}`);
  lines.push(`  updated_at: ${yamlQuote(sessionMeta.generatedAt)}`);
  lines.push('');
  lines.push('swing_legs:');

  orderedSegments.forEach((segment, index) => {
    const startSwing = getSwingById(segment.startSwingId);
    const endSwing = getSwingById(segment.endSwingId);
    if (!startSwing || !endSwing) {
      throw new Error('行情段引用的 Swing 点不存在');
    }

    const legId = `leg_${compactDate}_${String(index + 1).padStart(3, '0')}`;
    lines.push(`  - id: ${yamlQuote(legId)}`);
    lines.push('    start:');
    lines.push(`      time: ${yamlQuote(formatYamlTime(startSwing.time))}`);
    lines.push(`      price: ${startSwing.price.toFixed(2)}`);
    lines.push(`      type: ${yamlQuote(startSwing.kind === 'low' ? 'swing_low' : 'swing_high')}`);
    lines.push('    end:');
    lines.push(`      time: ${yamlQuote(formatYamlTime(endSwing.time))}`);
    lines.push(`      price: ${endSwing.price.toFixed(2)}`);
    lines.push(`      type: ${yamlQuote(endSwing.kind === 'low' ? 'swing_low' : 'swing_high')}`);
    lines.push(`    direction: ${segment.direction}`);
    lines.push('    related_pdas: []');
    lines.push('    notes: ""');
  });

  lines.push('');
  lines.push('market_structures: []');
  return lines.join('\n');
}

export function addFvgAnnotation(anchorTime, high, low, direction, timeframe) {
  const tfSec = timeframe * 60;
  const startTime = anchorTime - tfSec;
  const endTime = anchorTime + tfSec * 2;
  const color = direction === 'bullish' ? '#26a69a33' : '#ef535033';

  const primitive = new FvgPrimitive(
    state.chart,
    state.candlestickSeries,
    startTime,
    endTime,
    high,
    low,
    color
  );
  state.candlestickSeries.attachPrimitive(primitive);

  const id = makeId('fvg');
  annotations.fvgs.push({ id, anchorTime, high, low, direction, timeframe, primitive });
  triggerRedraw();
  return id;
}
