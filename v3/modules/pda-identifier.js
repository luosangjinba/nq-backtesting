/**
 * PDA 自动识别模块
 * 根据点击位置自动识别 FVG、BSL、SSL 等 PDA 类型
 */

/**
 * 识别 FVG（Fair Value Gap）
 * @param {Array} candleData - K 线数据数组 [{time, open, high, low, close}, ...]
 * @param {number} clickTime - 点击位置的时间戳（秒）
 * @returns {Object|null} - 识别结果 {startTime, endTime, high, low, direction} 或 null
 */
export function identifyFvg(candleData, clickTime) {
  console.log('[FVG 识别] 开始识别', {
    candleDataLength: candleData?.length,
    clickTime,
    firstCandle: candleData?.[0],
    lastCandle: candleData?.[candleData.length - 1],
  });

  if (!candleData || candleData.length < 3) {
    console.warn('[FVG 识别] K 线数据不足（需要至少 3 根）');
    return null;
  }

  // 找到点击位置对应的 K 线索引
  const clickIndex = candleData.findIndex((candle) => candle.time === clickTime);
  if (clickIndex === -1) {
    console.warn('[FVG 识别] 未找到点击位置的 K 线', {
      clickTime,
      availableTimes: candleData.slice(0, 5).map((c) => c.time),
    });
    return null;
  }

  console.log('[FVG 识别] 找到点击位置', { clickIndex, clickTime });

  // 尝试以点击位置为中心 K 线（K2）识别 FVG
  // FVG 由 3 根 K 线组成：K1 - K2 - K3
  // 向上 FVG: K1.low > K3.high
  // 向下 FVG: K1.high < K3.low

  // 情况 1: 点击位置是 K2（中间 K 线）
  if (clickIndex >= 1 && clickIndex < candleData.length - 1) {
    const result = checkFvgPattern(
      candleData[clickIndex - 1],
      candleData[clickIndex],
      candleData[clickIndex + 1]
    );
    if (result) {
      return result;
    }
  }

  // 情况 2: 点击位置是 K1（第一根 K 线）
  if (clickIndex < candleData.length - 2) {
    const result = checkFvgPattern(
      candleData[clickIndex],
      candleData[clickIndex + 1],
      candleData[clickIndex + 2]
    );
    if (result) {
      return result;
    }
  }

  // 情况 3: 点击位置是 K3（第三根 K 线）
  if (clickIndex >= 2) {
    const result = checkFvgPattern(
      candleData[clickIndex - 2],
      candleData[clickIndex - 1],
      candleData[clickIndex]
    );
    if (result) {
      return result;
    }
  }

  console.log('[FVG 识别] 未识别到 FVG 模式');
  return null;
}

/**
 * 检查 3 根 K 线是否形成 FVG 模式
 * @param {Object} k1 - 第一根 K 线
 * @param {Object} k2 - 第二根 K 线
 * @param {Object} k3 - 第三根 K 线
 * @returns {Object|null} - FVG 信息或 null
 */
function checkFvgPattern(k1, k2, k3) {
  // 向上 FVG: K1.low > K3.high
  if (k1.low > k3.high) {
    return {
      startTime: k1.time,
      endTime: k3.time,
      high: k1.low,
      low: k3.high,
      direction: 'bullish',
    };
  }

  // 向下 FVG: K1.high < K3.low
  if (k1.high < k3.low) {
    return {
      startTime: k1.time,
      endTime: k3.time,
      high: k3.low,
      low: k1.high,
      direction: 'bearish',
    };
  }

  return null;
}

/**
 * 格式化时间戳为字符串
 * @param {number} timestamp - Unix 时间戳（秒）
 * @returns {string} - 格式化的时间字符串 "YYYY-MM-DD HH:MM"
 */
export function formatTimestamp(timestamp) {
  const date = new Date(timestamp * 1000);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day} ${hours}:${minutes}`;
}
