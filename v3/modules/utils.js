/**
 * utils.js - 工具函数模块
 * 提供时间格式化、数据查找等通用工具函数
 */

/**
 * 显示/隐藏加载状态
 */
export function showLoading(show) {
  let overlay = document.querySelector('.loading-overlay');
  if (show) {
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.className = 'loading-overlay';
      overlay.innerHTML = `
        <div class="loading-content">
          <div class="loading-spinner"></div>
          <div class="loading-text">加载中...</div>
        </div>
      `;
      document.getElementById('chart').appendChild(overlay);
    }
  } else {
    if (overlay) {
      overlay.remove();
    }
  }
}

/**
 * 时间格式化工具
 * 支持 8 位（YYYYMMDD）或 12 位（YYYYMMDDHHmm）输入
 */
export function formatTimeInput(value) {
  console.log('formatTimeInput 调用:', value);
  const digits = value.replace(/\D/g, '');
  console.log('提取数字:', digits, '长度:', digits.length);

  // 支持 8 位（YYYYMMDD）或 12 位（YYYYMMDDHHmm）
  if (digits.length === 8) {
    // 8 位：自动补 00:00
    const year = digits.substring(0, 4);
    const month = digits.substring(4, 6);
    const day = digits.substring(6, 8);
    if (parseInt(month) < 1 || parseInt(month) > 12) return value;
    if (parseInt(day) < 1 || parseInt(day) > 31) return value;
    const formatted = `${year}-${month}-${day} 00:00`;
    console.log('格式化结果 (8位):', formatted);
    return formatted;
  } else if (digits.length === 12) {
    // 12 位：完整时间
    const year = digits.substring(0, 4);
    const month = digits.substring(4, 6);
    const day = digits.substring(6, 8);
    const hour = digits.substring(8, 10);
    const minute = digits.substring(10, 12);
    if (parseInt(month) < 1 || parseInt(month) > 12) return value;
    if (parseInt(day) < 1 || parseInt(day) > 31) return value;
    if (parseInt(hour) > 23) return value;
    if (parseInt(minute) > 59) return value;
    const formatted = `${year}-${month}-${day} ${hour}:${minute}`;
    console.log('格式化结果 (12位):', formatted);
    return formatted;
  }

  // 其他长度：保持原样
  console.log('长度不匹配，保持原样');
  return value;
}

/**
 * 查找最近的 K 线时间
 * @param {number} targetTime - 目标时间戳（秒）
 * @param {number[]} barTimestamps - K 线时间戳数组
 * @returns {number|null} 最近的 K 线时间戳
 */
export function findNearestBarTime(targetTime, barTimestamps) {
  if (!barTimestamps || barTimestamps.length === 0) {
    return null;
  }

  let nearest = barTimestamps[0];
  let minDiff = Math.abs(targetTime - nearest);

  for (const barTime of barTimestamps) {
    const diff = Math.abs(targetTime - barTime);
    if (diff < minDiff) {
      minDiff = diff;
      nearest = barTime;
    }
  }

  return nearest;
}

/**
 * 格式化时间戳为字符串
 * @param {number} timestamp - Unix 时间戳（秒）
 * @returns {string} 格式化的时间字符串 "YYYY-MM-DD HH:MM"
 */
export function formatTimestamp(timestamp) {
  const date = new Date(timestamp * 1000);
  // 使用 UTC 时间，与图表显示一致
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  const hours = String(date.getUTCHours()).padStart(2, '0');
  const minutes = String(date.getUTCMinutes()).padStart(2, '0');
  return `${year}-${month}-${day} ${hours}:${minutes}`;
}
