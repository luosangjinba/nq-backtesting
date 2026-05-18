/**
 * pda-detector.js - PDA 点击检测模块
 * 负责检测用户点击位置是否命中 PDA
 */

import { state } from './chart.js';
import { isVisiblePda } from './pda-renderer.js';

/**
 * 查找点击位置的 PDA
 * @param {number} clientX - 鼠标 X 坐标（相对于视口）
 * @param {number} clientY - 鼠标 Y 坐标（相对于视口）
 * @returns {Object|null} 找到的 PDA 记录，未找到返回 null
 */
export function findPdaAtPosition(clientX, clientY) {
  if (!state.chart || !state.candlestickSeries || state.pdaRecords.length === 0) {
    return null;
  }

  // 获取图表容器的边界
  const chartContainer = document.getElementById('chart');
  const rect = chartContainer.getBoundingClientRect();

  // 计算相对于图表的坐标
  const x = clientX - rect.left;
  const y = clientY - rect.top;

  // 转换为图表坐标
  const timeScale = state.chart.timeScale();

  // 坐标 → 时间和价格
  const timestamp = timeScale.coordinateToTime(x);
  const price = state.candlestickSeries.coordinateToPrice(y);

  if (!timestamp || !price) {
    return null;
  }

  console.log('点击坐标:', { x, y, timestamp, price });

  // 查找最近的 PDA（容差范围）
  // 时间容差：当前 timeframe 的 1 根 K 线
  const currentTf = parseInt(document.getElementById('tfSelect').value);
  const timeTolerance = currentTf * 60; // 转换为秒

  // 价格容差：基于像素距离反推（10px）
  const pixelTolerance = 10;
  let priceTolerance = 5; // 默认值
  try {
    const coordinate1 = state.candlestickSeries.coordinateToPrice(y - pixelTolerance);
    const coordinate2 = state.candlestickSeries.coordinateToPrice(y + pixelTolerance);
    if (coordinate1 !== null && coordinate2 !== null) {
      priceTolerance = Math.abs(coordinate1 - coordinate2) / 2;
    }
  } catch (e) {
    console.warn('价格容差计算失败，使用默认值:', e);
  }

  console.log('容差:', { timeTolerance, priceTolerance });

  let closestPda = null;
  let minDistance = Infinity;

  const tf = parseInt(document.getElementById('tfSelect').value);
  const tfMap = {
    1: '1M',
    5: '5M',
    15: '15M',
    30: '30M',
    60: '1H',
    240: '4H',
    1440: 'D',
    10080: '1W',
  };
  const currentTimeframe = tfMap[tf] || '1H';

  state.pdaRecords.forEach((record) => {
    // 只检测可见的 PDA（与渲染逻辑一致）
    if (!isVisiblePda(record, currentTimeframe)) return;

    const pdaType = record.pdaType;
    const anchorTime = record.anchorTs || record.anchorTime;

    // 转换时间
    let pdaTimestamp;
    if (typeof anchorTime === 'number') {
      pdaTimestamp = anchorTime;
    } else if (typeof anchorTime === 'string') {
      pdaTimestamp = Math.floor(new Date(anchorTime.replace(' ', 'T') + 'Z').getTime() / 1000);
    } else {
      return;
    }

    // 检查时间范围
    const timeDiff = Math.abs(timestamp - pdaTimestamp);
    if (timeDiff > timeTolerance) {
      return;
    }

    // 检查价格范围
    let priceDiff = Infinity;

    if (pdaType === 'bsl') {
      const pdaPrice = record.price || record.priceHigh;
      if (pdaPrice) {
        priceDiff = Math.abs(price - pdaPrice);
      }
    } else if (pdaType === 'ssl') {
      const pdaPrice = record.price || record.priceLow;
      if (pdaPrice) {
        priceDiff = Math.abs(price - pdaPrice);
      }
    } else if (pdaType === 'fvg') {
      const priceHigh = record.priceHigh;
      const priceLow = record.priceLow;
      if (priceHigh && priceLow) {
        // 检查是否在 FVG 范围内
        if (price >= priceLow && price <= priceHigh) {
          priceDiff = 0; // 在范围内，距离为 0
        } else {
          priceDiff = Math.min(Math.abs(price - priceHigh), Math.abs(price - priceLow));
        }
      }
    } else if (pdaType === 'nwog') {
      const priceHigh = record.priceHigh;
      const priceLow = record.priceLow;
      if (priceHigh && priceLow) {
        // NWOG 是价格区间，检查是否在范围内
        if (price >= priceLow && price <= priceHigh) {
          priceDiff = 0;
        } else {
          priceDiff = Math.min(Math.abs(price - priceHigh), Math.abs(price - priceLow));
        }
      }
    } else if (pdaType === 'ndog') {
      const priceHigh = record.priceHigh;
      const priceLow = record.priceLow;
      if (priceHigh && priceLow) {
        // NDOG 是价格区间，检查是否在范围内
        if (price >= priceLow && price <= priceHigh) {
          priceDiff = 0;
        } else {
          priceDiff = Math.min(Math.abs(price - priceHigh), Math.abs(price - priceLow));
        }
      }
    } else if (pdaType === 'daily_high') {
      const pdaPrice = record.price || record.priceHigh;
      if (pdaPrice) {
        priceDiff = Math.abs(price - pdaPrice);
      }
    } else if (pdaType === 'daily_low') {
      const pdaPrice = record.price || record.priceLow;
      if (pdaPrice) {
        priceDiff = Math.abs(price - pdaPrice);
      }
    } else if (pdaType === 'ict_midnight_day_high') {
      const pdaPrice = record.price || record.priceHigh;
      if (pdaPrice) {
        priceDiff = Math.abs(price - pdaPrice);
      }
    } else if (pdaType === 'ict_midnight_day_low') {
      const pdaPrice = record.price || record.priceLow;
      if (pdaPrice) {
        priceDiff = Math.abs(price - pdaPrice);
      }
    } else if (pdaType === 'eqh') {
      const pdaPrice = record.price || record.priceHigh;
      if (pdaPrice) {
        priceDiff = Math.abs(price - pdaPrice);
      }
    } else if (pdaType === 'eql') {
      const pdaPrice = record.price || record.priceLow;
      if (pdaPrice) {
        priceDiff = Math.abs(price - pdaPrice);
      }
    }

    if (priceDiff > priceTolerance) {
      return;
    }

    // 计算综合距离（时间 + 价格）
    const distance = timeDiff / timeTolerance + priceDiff / priceTolerance;

    if (distance < minDistance) {
      minDistance = distance;
      closestPda = record;
    }
  });

  if (closestPda) {
    console.log('找到 PDA:', closestPda);
  } else {
    console.log('未找到 PDA');
  }

  return closestPda;
}
