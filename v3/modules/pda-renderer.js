/**
 * pda-renderer.js - PDA 渲染模块
 * 负责所有 PDA 类型的渲染逻辑（FVG 矩形、BSL/SSL 短线、Daily H/L、ICT Midnight 等）
 */

import { state, API_BASE } from './chart.js';
import { findNearestBarTime } from './utils.js';

/**
 * 流动性默认参数
 */
const LIQUIDITY_DEFAULTS = {
  lineLength: 2, // 向右延伸 K 线数
  showLabel: true, // 是否显示文字标签
  lineWidth: 1,
  labelFont: '11px sans-serif',
  labelPadding: 4, // 标签距离线段右端的像素间隔
  lineStyle: 'solid', // 线条样式：'solid' 或 'dashed'
};

const SEGMENT_DEFAULTS = {
  lineWidth: 2,
};

// ============================
// FVG 矩形渲染（基于官方 Rectangle Drawing Tool）
// ==============================

/**
 * FVG 矩形渲染器
 */
class FvgRenderer {
  constructor(view) {
    this._view = view;
  }

  draw(target) {
    target.useBitmapCoordinateSpace((scope) => {
      const p1 = this._view._p1;
      const p2 = this._view._p2;
      if (p1.x === null || p1.y === null || p2.x === null || p2.y === null) {
        return;
      }

      const ctx = scope.context;
      const fillColor = this._view._source._fillColor;

      // 计算矩形位置和大小
      const x = Math.min(p1.x, p2.x) * scope.horizontalPixelRatio;
      const y = Math.min(p1.y, p2.y) * scope.verticalPixelRatio;
      const width = Math.abs(p2.x - p1.x) * scope.horizontalPixelRatio;
      const height = Math.abs(p2.y - p1.y) * scope.verticalPixelRatio;

      // 填充
      ctx.fillStyle = fillColor;
      ctx.fillRect(x, y, width, height);

      // 中间虚线
      const midY = y + height / 2;
      ctx.strokeStyle = fillColor.replace('33', ''); // 移除透明度
      ctx.lineWidth = 1;
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ctx.moveTo(x, midY);
      ctx.lineTo(x + width, midY);
      ctx.stroke();
      ctx.setLineDash([]);
    });
  }
}

/**
 * FVG 视图
 */
class FvgView {
  constructor(source) {
    this._source = source;
    this._p1 = { x: null, y: null };
    this._p2 = { x: null, y: null };
  }

  update() {
    const series = this._source._series;
    const chart = this._source._chart;

    // 价格 → Y 坐标
    const y1 = series.priceToCoordinate(this._source._topPrice);
    const y2 = series.priceToCoordinate(this._source._bottomPrice);

    // 时间 → X 坐标
    const timeScale = chart.timeScale();
    const x1 = timeScale.timeToCoordinate(this._source._startTime);
    const x2 = timeScale.timeToCoordinate(this._source._endTime);

    this._p1 = { x: x1, y: y1 };
    this._p2 = { x: x2, y: y2 };
  }

  renderer() {
    return new FvgRenderer(this);
  }
}

/**
 * FVG Primitive
 */
export class FvgPrimitive {
  constructor(chart, series, startTime, endTime, topPrice, bottomPrice, color = '#ab47bc33') {
    this._chart = chart;
    this._series = series;
    this._startTime = startTime;
    this._endTime = endTime;
    this._topPrice = topPrice;
    this._bottomPrice = bottomPrice;
    this._fillColor = color;
    this._view = new FvgView(this);
  }

  updateAllViews() {
    this._view.update();
  }

  paneViews() {
    return [this._view];
  }
}

/**
 * 添加 FVG 标记
 */
export function addFvgMarker(startTime, endTime, topPrice, bottomPrice, color = '#ab47bc33') {
  const primitive = new FvgPrimitive(
    state.chart,
    state.candlestickSeries,
    startTime,
    endTime,
    topPrice,
    bottomPrice,
    color
  );
  state.candlestickSeries.attachPrimitive(primitive);
  state.fvgPrimitives.push(primitive);
}

// ===========================
// BSL/SSL 流动性短线渲染
// ============================

/**
 * 流动性短线渲染器
 */
class LiquidityRenderer {
  constructor(view) {
    this._view = view;
  }

  draw(target) {
    target.useBitmapCoordinateSpace((scope) => {
      if (this._view._p1.x === null || this._view._p2.x === null || this._view._p1.y === null)
        return;

      const p1 = this._view._p1;
      const p2 = this._view._p2;
      const source = this._view._source;
      const ctx = scope.context;
      const hRatio = scope.horizontalPixelRatio;
      const vRatio = scope.verticalPixelRatio;

      const x1 = p1.x * hRatio;
      const x2 = p2.x * hRatio;
      const y = p1.y * vRatio;

      // 短线
      ctx.strokeStyle = source._lineColor;
      ctx.lineWidth = source._options.lineWidth * Math.min(hRatio, vRatio);

      // 设置线条样式
      if (source._options.lineStyle === 'dashed') {
        ctx.setLineDash([5, 5]);
      } else {
        ctx.setLineDash([]);
      }

      ctx.beginPath();
      ctx.moveTo(x1, y);
      ctx.lineTo(x2, y);
      ctx.stroke();

      // 文字标签
      if (source._options.showLabel && source._label) {
        ctx.fillStyle = source._textColor;
        ctx.font = source._options.labelFont;
        const padding = source._options.labelPadding * vRatio;
        ctx.textAlign = 'right';
        if (source._position === 'above') {
          ctx.textBaseline = 'bottom';
          ctx.fillText(source._label, x2, y - padding);
        } else {
          ctx.textBaseline = 'top';
          ctx.fillText(source._label, x2, y + padding);
        }
      }
    });
  }
}

/**
 * 流动性视图
 */
class LiquidityView {
  constructor(source) {
    this._source = source;
    this._p1 = { x: null, y: null };
    this._p2 = { x: null, y: null };
  }

  update() {
    const series = this._source._series;
    const chart = this._source._chart;
    const timeScale = chart.timeScale();

    const y = series.priceToCoordinate(this._source._price);
    const anchorCoord = timeScale.timeToCoordinate(this._source._anchorTime);
    let rightX = null;
    if (anchorCoord !== null) {
      const logical = timeScale.coordinateToLogical(anchorCoord);
      if (logical !== null) {
        rightX = timeScale.logicalToCoordinate(logical + this._source._options.lineLength);
      }
    } else {
      // 锚点时间不在当前图表范围内，标记不会显示
      // 这是正常情况（例如切换周期后，某些 PDA 的时间点不在新周期的 K 线上）
      // console.debug('[DEBUG] anchorCoord 为 null，标记不会显示:', this._source._label);
    }

    this._p1 = { x: anchorCoord, y };
    this._p2 = { x: rightX, y };
  }

  renderer() {
    return new LiquidityRenderer(this);
  }
}

/**
 * 流动性 Primitive
 */
export class LiquidityPrimitive {
  constructor(
    chart,
    series,
    anchorTime,
    price,
    lineColor,
    textColor,
    label,
    position,
    options = {}
  ) {
    this._chart = chart;
    this._series = series;
    this._anchorTime = anchorTime;
    this._price = price;
    this._lineColor = lineColor;
    this._textColor = textColor;
    this._label = label;
    this._position = position;
    this._options = { ...LIQUIDITY_DEFAULTS, ...options };
    this._view = new LiquidityView(this);
  }

  updateAllViews() {
    this._view.update();
  }

  paneViews() {
    return [this._view];
  }
}

class SegmentRenderer {
  constructor(view) {
    this._view = view;
  }

  draw(target) {
    target.useBitmapCoordinateSpace((scope) => {
      const p1 = this._view._p1;
      const p2 = this._view._p2;
      if (p1.x === null || p1.y === null || p2.x === null || p2.y === null) {
        return;
      }

      const source = this._view._source;
      const ctx = scope.context;
      const hRatio = scope.horizontalPixelRatio;
      const vRatio = scope.verticalPixelRatio;

      ctx.strokeStyle = source._lineColor;
      ctx.lineWidth = source._options.lineWidth * Math.min(hRatio, vRatio);
      ctx.setLineDash([]);
      ctx.beginPath();
      ctx.moveTo(p1.x * hRatio, p1.y * vRatio);
      ctx.lineTo(p2.x * hRatio, p2.y * vRatio);
      ctx.stroke();
    });
  }
}

class SegmentView {
  constructor(source) {
    this._source = source;
    this._p1 = { x: null, y: null };
    this._p2 = { x: null, y: null };
  }

  update() {
    const series = this._source._series;
    const chart = this._source._chart;
    const timeScale = chart.timeScale();

    this._p1 = {
      x: timeScale.timeToCoordinate(this._source._startTime),
      y: series.priceToCoordinate(this._source._startPrice),
    };
    this._p2 = {
      x: timeScale.timeToCoordinate(this._source._endTime),
      y: series.priceToCoordinate(this._source._endPrice),
    };
  }

  renderer() {
    return new SegmentRenderer(this);
  }
}

export class SegmentPrimitive {
  constructor(chart, series, startTime, startPrice, endTime, endPrice, lineColor, options = {}) {
    this._chart = chart;
    this._series = series;
    this._startTime = startTime;
    this._startPrice = startPrice;
    this._endTime = endTime;
    this._endPrice = endPrice;
    this._lineColor = lineColor;
    this._options = { ...SEGMENT_DEFAULTS, ...options };
    this._view = new SegmentView(this);
  }

  updateAllViews() {
    this._view.update();
  }

  paneViews() {
    return [this._view];
  }
}

/**
 * 添加 BSL 标记
 */
export function addBslMarker(timestamp, price, label = 'BSL', options = {}) {
  const primitive = new LiquidityPrimitive(
    state.chart,
    state.candlestickSeries,
    timestamp,
    price,
    '#5b9cf6',
    '#26a69a',
    label,
    'above',
    options
  );
  state.candlestickSeries.attachPrimitive(primitive);
  state.liquidityPrimitives.push(primitive);
}

/**
 * 添加 SSL 标记
 */
export function addSslMarker(timestamp, price, label = 'SSL', options = {}) {
  const primitive = new LiquidityPrimitive(
    state.chart,
    state.candlestickSeries,
    timestamp,
    price,
    '#ffb74d',
    '#ef5350',
    label,
    'below',
    options
  );
  state.candlestickSeries.attachPrimitive(primitive);
  state.liquidityPrimitives.push(primitive);
}

/**
 * 添加 Daily High 标记
 */
export function addDailyHighMarker(timestamp, price, label = 'Daily High', options = {}) {
  const primitive = new LiquidityPrimitive(
    state.chart,
    state.candlestickSeries,
    timestamp,
    price,
    '#26a69a',
    '#26a69a',
    label,
    'above',
    options
  );
  state.candlestickSeries.attachPrimitive(primitive);
  state.liquidityPrimitives.push(primitive);
}

/**
 * 添加 Daily Low 标记
 */
export function addDailyLowMarker(timestamp, price, label = 'Daily Low', options = {}) {
  const primitive = new LiquidityPrimitive(
    state.chart,
    state.candlestickSeries,
    timestamp,
    price,
    '#ef5350',
    '#ef5350',
    label,
    'below',
    options
  );
  state.candlestickSeries.attachPrimitive(primitive);
  state.liquidityPrimitives.push(primitive);
}

/**
 * 添加 ICT Midnight High 标记
 */
export function addIctMidnightHighMarker(timestamp, price, label = 'ICT Mid High', options = {}) {
  const primitive = new LiquidityPrimitive(
    state.chart,
    state.candlestickSeries,
    timestamp,
    price,
    '#26a69a',
    '#26a69a',
    label,
    'above',
    { ...options, lineStyle: 'dashed' }
  );
  state.candlestickSeries.attachPrimitive(primitive);
  state.liquidityPrimitives.push(primitive);
}

/**
 * 添加 ICT Midnight Low 标记
 */
export function addIctMidnightLowMarker(timestamp, price, label = 'ICT Mid Low', options = {}) {
  const primitive = new LiquidityPrimitive(
    state.chart,
    state.candlestickSeries,
    timestamp,
    price,
    '#ef5350',
    '#ef5350',
    label,
    'below',
    { ...options, lineStyle: 'dashed' }
  );
  state.candlestickSeries.attachPrimitive(primitive);
  state.liquidityPrimitives.push(primitive);
}

/**
 * 清除所有 PDA 标记
 */
export function clearAllPdaMarkers() {
  // 清除 BSL/SSL 短线
  state.liquidityPrimitives.forEach((primitive) => {
    state.candlestickSeries.detachPrimitive(primitive);
  });
  state.liquidityPrimitives = [];

  // 清除 FVG 矩形
  state.fvgPrimitives.forEach((primitive) => {
    state.candlestickSeries.detachPrimitive(primitive);
  });
  state.fvgPrimitives = [];

  console.log('✓ 已清除所有 PDA 标记');
}

/**
 * 从 v2 API 批量加载 PDA 数据
 */
export async function loadPdaData(startTime, endTime) {
  try {
    console.log('开始加载 PDA 数据...');

    // 构建 API URL
    const tf = parseInt(document.getElementById('tfSelect').value);
    const tfMap = { 1: '1M', 5: '5M', 15: '15M', 60: '1H', 240: '4H', 1440: 'D', 10080: '1W' };
    const timeframe = tfMap[tf] || '1H';

    const url =
      `${API_BASE}/v2/pda_records?` +
      `anchor_time_from=${encodeURIComponent(startTime)}&` +
      `anchor_time_to=${encodeURIComponent(endTime)}&` +
      `timeframe=${timeframe}&` +
      `limit=1000`;

    console.log('PDA API URL:', url);

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    console.log('PDA API 响应:', data);

    if (!data.ok) {
      throw new Error(data.error || 'PDA 加载失败');
    }

    let records = data.result.records || [];
    console.log(`✓ 获取到 ${records.length} 条 ${timeframe} PDA 记录`);

    // 如果当前周期 >= 15M 且 <= 1H，额外加载日级 PDA
    if (tf >= 15 && tf <= 60) {
      console.log('当前周期 >= 15M，额外加载日级 PDA...');
      const dailyTypes = [
        'daily_high',
        'daily_low',
        'ict_midnight_day_high',
        'ict_midnight_day_low',
        'nwog',
        'ndog',
      ];
      const dailyUrl =
        `${API_BASE}/v2/pda_records?` +
        `anchor_time_from=${encodeURIComponent(startTime)}&` +
        `anchor_time_to=${encodeURIComponent(endTime)}&` +
        `timeframe=D&` +
        dailyTypes.map((t) => `type=${t}`).join('&') +
        `&limit=1000`;

      console.log('日级 PDA API URL:', dailyUrl);

      try {
        const dailyResponse = await fetch(dailyUrl);
        if (dailyResponse.ok) {
          const dailyData = await dailyResponse.json();
          if (dailyData.ok) {
            const dailyRecords = dailyData.result.records || [];
            console.log(`✓ 获取到 ${dailyRecords.length} 条日级 PDA 记录`);
            records = records.concat(dailyRecords);
          } else {
            console.warn('日级 PDA 加载失败:', dailyData.error);
          }
        } else {
          console.warn('日级 PDA 请求失败:', dailyResponse.status);
        }
      } catch (err) {
        console.warn('日级 PDA 请求异常:', err);
      }
    }

    console.log(`✓ 合并后共 ${records.length} 条 PDA 记录`);

    // 存储 PDA 数据（用于点击检测）
    state.pdaRecords = records;

    // 清除旧标记
    clearAllPdaMarkers();

    // 统计各类型数量
    const stats = {
      bsl: 0,
      ssl: 0,
      fvg: 0,
      nwog: 0,
      ndog: 0,
      daily_high: 0,
      daily_low: 0,
      ict_midnight_day_high: 0,
      ict_midnight_day_low: 0,
      other: 0,
    };

    // 遍历记录，按类型渲染
    records.forEach((record) => {
      const pdaType = record.pdaType;

      // 日级 PDA 使用 occurrence_time
      const dailyTypes = [
        'daily_high',
        'daily_low',
        'ict_midnight_day_high',
        'ict_midnight_day_low',
        'nwog',
        'ndog',
      ];
      const useOccurrenceTime = dailyTypes.includes(pdaType);
      const timeValue = useOccurrenceTime
        ? record.occurrenceTime || record.anchorTs || record.anchorTime
        : record.anchorTs || record.anchorTime;

      // 转换时间为 Unix 时间戳（秒）
      let timestamp;
      if (typeof timeValue === 'number') {
        timestamp = timeValue;
      } else if (typeof timeValue === 'string') {
        timestamp = Math.floor(new Date(timeValue.replace(' ', 'T') + 'Z').getTime() / 1000);
      } else {
        console.warn('无效的时间值:', timeValue, record);
        return;
      }

      // 日级 PDA 需要查找最近的 K 线时间
      if (useOccurrenceTime) {
        const nearestTime = findNearestBarTime(timestamp, state.barTimestamps);
        if (nearestTime !== null) {
          console.log(
            `[DEBUG] 日级 PDA 时间映射: ${pdaType} ${timestamp} → ${nearestTime} (偏移 ${Math.abs(timestamp - nearestTime)}s)`
          );
          timestamp = nearestTime;
        }
      }

      // 根据类型渲染
      if (pdaType === 'bsl') {
        const price = record.price || record.priceHigh;
        if (price) {
          addBslMarker(timestamp, price, 'BSL');
          stats.bsl++;
        }
      } else if (pdaType === 'ssl') {
        const price = record.price || record.priceLow;
        if (price) {
          addSslMarker(timestamp, price, 'SSL');
          stats.ssl++;
        }
      } else if (pdaType === 'fvg') {
        const priceHigh = record.priceHigh;
        const priceLow = record.priceLow;
        const direction = record.direction;

        if (priceHigh && priceLow) {
          const tfSeconds = tf * 60;
          const startTime = timestamp - tfSeconds;
          const endTime = timestamp + tfSeconds * 2;
          const color = direction === 'bullish' ? '#26a69a33' : '#ef535033';
          addFvgMarker(startTime, endTime, priceHigh, priceLow, color);
          stats.fvg++;
        }
      } else if (pdaType === 'nwog') {
        const priceHigh = record.priceHigh;
        const priceLow = record.priceLow;
        if (priceHigh && priceLow) {
          const color = '#ab47bc33';
          const endTime = timestamp + 24 * 3600;
          addFvgMarker(timestamp, endTime, priceHigh, priceLow, color);
        }
        stats.nwog++;
      } else if (pdaType === 'ndog') {
        const priceHigh = record.priceHigh;
        const priceLow = record.priceLow;
        if (priceHigh && priceLow) {
          const color = '#26c6da33';
          const endTime = timestamp + 24 * 3600;
          addFvgMarker(timestamp, endTime, priceHigh, priceLow, color);
          stats.ndog++;
        }
      } else if (pdaType === 'daily_high') {
        const price = record.price || record.priceHigh;
        if (price) {
          addDailyHighMarker(timestamp, price, 'Daily High');
          stats.daily_high++;
        }
      } else if (pdaType === 'daily_low') {
        const price = record.price || record.priceLow;
        if (price) {
          addDailyLowMarker(timestamp, price, 'Daily Low');
          stats.daily_low++;
        }
      } else if (pdaType === 'ict_midnight_day_high') {
        const price = record.price || record.priceHigh;
        if (price) {
          addIctMidnightHighMarker(timestamp, price, 'ICT Mid High');
          stats.ict_midnight_day_high++;
        }
      } else if (pdaType === 'ict_midnight_day_low') {
        const price = record.price || record.priceLow;
        if (price) {
          addIctMidnightLowMarker(timestamp, price, 'ICT Mid Low');
          stats.ict_midnight_day_low++;
        }
      } else {
        stats.other++;
      }
    });

    console.log('✓ PDA 渲染完成:', stats);
    return records;
  } catch (error) {
    console.error('PDA 加载失败:', error);
    throw error;
  }
}
