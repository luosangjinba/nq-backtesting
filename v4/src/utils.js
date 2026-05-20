// 通用工具函数

/**
 * 时间输入自动格式化
 * 支持 8 位（YYYYMMDD → YYYY-MM-DD 00:00）或 12 位（YYYYMMDDHHmm → YYYY-MM-DD HH:mm）
 * 无效值保持原样
 */
export function formatTimeInput(value) {
  const digits = value.replace(/\D/g, '');

  if (digits.length === 8) {
    const year = digits.substring(0, 4);
    const month = digits.substring(4, 6);
    const day = digits.substring(6, 8);
    if (parseInt(month) < 1 || parseInt(month) > 12) return value;
    if (parseInt(day) < 1 || parseInt(day) > 31) return value;
    return `${year}-${month}-${day} 00:00`;
  }

  if (digits.length === 12) {
    const year = digits.substring(0, 4);
    const month = digits.substring(4, 6);
    const day = digits.substring(6, 8);
    const hour = digits.substring(8, 10);
    const minute = digits.substring(10, 12);
    if (parseInt(month) < 1 || parseInt(month) > 12) return value;
    if (parseInt(day) < 1 || parseInt(day) > 31) return value;
    if (parseInt(hour) > 23) return value;
    if (parseInt(minute) > 59) return value;
    return `${year}-${month}-${day} ${hour}:${minute}`;
  }

  return value;
}