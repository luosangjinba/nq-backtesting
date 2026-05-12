/**
 * 时间输入格式化模块
 *
 * 功能：自动将 12 位数字格式化为标准时间格式
 * 输入：YYYYMMDDHHNN (如 201201090930)
 * 输出：YYYY-MM-DD HH:NN (如 2012-01-09 09:30)
 *
 * 使用方法：
 * 1. 引入模块：<script src="time_format_module.js"></script>
 * 2. 初始化：TimeFormatModule.init(['inputId1', 'inputId2']);
 * 3. 手动格式化：TimeFormatModule.format('201201090930');
 */

const TimeFormatModule = (function() {
  'use strict';

  /**
   * 格式化时间字符串
   * @param {string} value - 输入值
   * @returns {string} - 格式化后的值
   */
  function format(value) {
    if (!value) return value;

    // 移除所有非数字字符
    const digits = value.replace(/\D/g, '');

    // 必须是 12 位数字：YYYYMMDDHHNN
    if (digits.length !== 12) {
      return value; // 不符合格式，返回原值
    }

    const year = digits.substring(0, 4);
    const month = digits.substring(4, 6);
    const day = digits.substring(6, 8);
    const hour = digits.substring(8, 10);
    const minute = digits.substring(10, 12);

    // 验证有效性
    if (!isValidDate(year, month, day, hour, minute)) {
   return value;
    }

    return `${year}-${month}-${day} ${hour}:${minute}`;
  }

  /**
   * 验证日期时间有效性
   * @private
   */
  function isValidDate(year, month, day, hour, minute) {
    const m = parseInt(month);
    const d = parseInt(day);
    const h = parseInt(hour);
    const min = parseInt(minute);

    if (m < 1 || m > 12) return false;
    if (d < 1 || d > 31) return false;
    if (h > 23) return false;
    if (min > 59) return false;

    return true;
  }

  /**
   * 为输入框绑定格式化事件
   * @param {HTMLInputElement} input - 输入框元素
   * @param {Object} options - 配置选项
   */
  function bindInput(input, options = {}) {
    if (!input) {
      console.warn('TimeFormatModule: 输入框不存在');
      return;
    }

    const config = {
      onBlur: true,        // 失焦时格式化
      onEnter: true,       // 回车时格式化
      onEnterCallback: null, // 回车后的回调函数
      ...options
    };

    // 失焦事件
    if (config.onBlur) {
      input.addEventListener('blur', (e) => {
        const formatted = format(e.target.value.trim());
        e.target.value = formatted;
      });
    }

    // 回车事件
    if (config.onEnter) {
      input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          const formatted = format(e.target.value.trim());
          e.target.value = formatted;

          // 执行回调
          if (typeof config.onEnterCallback === 'function') {
            config.onEnterCallback(formatted);
          }
      });
    }
  }

  /**
   * 批量初始化输入框
   * @param {string[]|HTMLInputElement[]} inputs - 输入框 ID 数组或元素数组
   * @param {Object} options - 配置选项
   */
  function init(inputs, options = {}) {
    if (!Array.isArray(inputs)) {
      console.error('TimeFormatModule: inputs 必须是数组');
      return;
    }

    inputs.forEach(input => {
      let element;

      if (typeof input === 'string') {
        element = document.getElementById(input);
      } else if (input instanceof HTMLInputElement) {
      element = input;
      }

      if (element) {
        bindInput(element, options);
      } else {
        console.warn(`TimeFormatModule: 找不到输入框 "${input}"`);
      }
    });
  }

  /**
   * 解析格式化后的时间字符串
   * @param {string} formatted - 格式化后的时间字符串 (YYYY-MM-DD HH:NN)
   * @returns {Object|null} - { year, month, day, hour, minute } 或 null
   */
  function parse(formatted) {
    const pattern = /^(\d{4})-(\d{2})-(\d{2})\s+(\d{2}):(\d{2})$/;
    const match = formatted.match(pattern);

    if (!match) return null;

    return {
      year: match[1],
    month: match[2],
      day: match[3],
      hour: match[4],
   minute: match[5]
    };
  }

  /**
   * 转换为 Date 对象
   * @param {string} formatted - 格式化后的时间字符串
   * @returns {Date|null} - Date 对象或 null
   */
  function toDate(formatted) {
    const parsed = parse(formatted);
    if (!parsed) return null;

    return new Date(
      parseInt(parsed.year),
      parseInt(parsed.month) - 1, // 月份从 0 开始
      parseInt(parsed.day),
      parseInt(parsed.hour),
      parseInt(parsed.minute)
    );
  }

  /**
   * 转换为 Unix 时间戳（秒）
   * @param {string} formatted - 格式化后的时间字符串
   * @returns {number|null} - Unix 时间戳或 null
   */
  function toTimestamp(formatted) {
    const date = toDate(formatted);
    return date ? Math.floor(date.getTime() / 1000) : null;
  }

  // 公开 API
  return {
    format,
    init,
  bindInput,
    parse,
    toDate,
    toTimestamp,
    version: '1.0.0'
  };
})();

// 如果是 Node.js 环境，导出模块
if (typeof module !== 'undefined' && module.exports) {
  module.exports = TimeFormatModule;
}
