/**
 * PDA 录入表单模块
 *
 * 功能：
 * - 显示/隐藏侧边栏
 * - 根据 PDA 类型切换表单字段
 * - 表单验证
 * - 自动填充识别的数据
 * - 时间输入框自动格式化
 */

import { formatTimeInput } from './utils.js';

// 侧边栏元素
const sidebar = document.getElementById('pdaFormSidebar');
const sidebarTitle = document.getElementById('sidebarTitle');
const sidebarCloseBtn = document.getElementById('sidebarCloseBtn');
const sidebarCancelBtn = document.getElementById('sidebarCancelBtn');
const sidebarSaveBtn = document.getElementById('sidebarSaveBtn');

// 表单元素
const formPdaType = document.getElementById('formPdaType');
const formTimeframe = document.getElementById('formTimeframe');
const fvgFields = document.getElementById('fvgFields');
const bslSslFields = document.getElementById('bslSslFields');
// FVG 字段
const formFvgStartTime = document.getElementById('formFvgStartTime');
const formFvgEndTime = document.getElementById('formFvgEndTime');
const formFvgHigh = document.getElementById('formFvgHigh');
const formFvgLow = document.getElementById('formFvgLow');
const errorFvgStartTime = document.getElementById('errorFvgStartTime');
const errorFvgEndTime = document.getElementById('errorFvgEndTime');
const errorFvgHigh = document.getElementById('errorFvgHigh');
const errorFvgLow = document.getElementById('errorFvgLow');

// BSL/SSL 字段
const formBslSslTime = document.getElementById('formBslSslTime');
const formBslSslPrice = document.getElementById('formBslSslPrice');
const errorBslSslTime = document.getElementById('errorBslSslTime');
const errorBslSslPrice = document.getElementById('errorBslSslPrice');

// 备注字段
const formNotes = document.getElementById('formNotes');

// 当前表单数据
let currentFormData = null;
let onSaveCallback = null;

/**
 * 设置保存回调函数
 * @param {Function} callback - 保存成功后的回调
 */
export function setOnSaveCallback(callback) {
  onSaveCallback = callback;
}

/**
 * 显示侧边栏
 * @param {Object} options - 表单选项
 * @param {string} options.pdaType - PDA 类型 (fvg, bsl, ssl)
 * @param {number} options.timeframe - 周期（分钟）
 * @param {Object} options.autoFill - 自动填充的数据
 */
export function showPdaForm(options) {
  const { pdaType, timeframe, autoFill = {} } = options;

  // 保存当前表单数据
  currentFormData = { pdaType, timeframe, autoFill };

  // 设置标题
  const typeNames = {
    fvg: 'FVG',
    bsl: 'BSL',
    ssl: 'SSL',
  };
  sidebarTitle.textContent = `添加 ${typeNames[pdaType] || 'PDA'}`;

  // 设置 PDA 类型和周期
  formPdaType.value = typeNames[pdaType] || pdaType.toUpperCase();
  formTimeframe.value = formatTimeframe(timeframe);

  // 切换字段显示
  if (pdaType === 'fvg') {
    fvgFields.style.display = 'block';
    bslSslFields.style.display = 'none';
    fillFvgFields(autoFill);
  } else if (pdaType === 'bsl' || pdaType === 'ssl') {
    fvgFields.style.display = 'none';
    bslSslFields.style.display = 'block';
    fillBslSslFields(autoFill);
  }

  // 清空备注
  formNotes.value = '';

  // 清空错误提示
  clearErrors();

  // 显示侧边栏
  sidebar.classList.remove('collapsed');
}

/**
 * 隐藏侧边栏
 */
export function hidePdaForm() {
  sidebar.classList.add('collapsed');
  currentFormData = null;
}

/**
 * 填充 FVG 字段
 */
function fillFvgFields(autoFill) {
  formFvgStartTime.value = autoFill.startTime || '';
  formFvgEndTime.value = autoFill.endTime || '';
  formFvgHigh.value = autoFill.high || autoFill.priceHigh || '';
  formFvgLow.value = autoFill.low || autoFill.priceLow || '';
}

/**
 * 填充 BSL/SSL 字段
 */
function fillBslSslFields(autoFill) {
  formBslSslTime.value = autoFill.time || '';
  formBslSslPrice.value = autoFill.price || '';
}

/**
 * 格式化周期显示
 */
function formatTimeframe(tf) {
  if (tf < 60) return `${tf}M`;
  if (tf < 1440) return `${tf / 60}H`;
  if (tf < 10080) return `${tf / 1440}D`;
  return `${tf / 10080}W`;
}

/**
 * 验证表单
 * @returns {Object|null} 验证通过返回表单数据，否则返回 null
 */
function validateForm() {
  clearErrors();

  const { pdaType, timeframe } = currentFormData;
  let isValid = true;

  if (pdaType === 'fvg') {
    // 验证 FVG 字段
    if (!formFvgStartTime.value.trim()) {
      showError(formFvgStartTime, errorFvgStartTime, '请输入起始时间');
      isValid = false;
    }
    if (!formFvgEndTime.value.trim()) {
      showError(formFvgEndTime, errorFvgEndTime, '请输入结束时间');
      isValid = false;
    }
    if (!formFvgHigh.value.trim()) {
      showError(formFvgHigh, errorFvgHigh, '请输入上边界价格');
      isValid = false;
    }
    if (!formFvgLow.value.trim()) {
      showError(formFvgLow, errorFvgLow, '请输入下边界价格');
      isValid = false;
    }

    // 验证价格范围
    const high = parseFloat(formFvgHigh.value);
    const low = parseFloat(formFvgLow.value);
    if (!isNaN(high) && !isNaN(low) && high <= low) {
      showError(formFvgHigh, errorFvgHigh, '上边界必须大于下边界');
      isValid = false;
    }

    if (!isValid) return null;

    return {
      pda_type: 'fvg',
      timeframe,
      start_time: formFvgStartTime.value.trim(),
      end_time: formFvgEndTime.value.trim(),
      price_high: high,
      price_low: low,
      notes: formNotes.value.trim(),
    };
  } else if (pdaType === 'bsl' || pdaType === 'ssl') {
    // 验证 BSL/SSL 字段
    if (!formBslSslTime.value.trim()) {
      showError(formBslSslTime, errorBslSslTime, '请输入时间');
      isValid = false;
    }
    if (!formBslSslPrice.value.trim()) {
      showError(formBslSslPrice, errorBslSslPrice, '请输入价格');
      isValid = false;
    }

    const price = parseFloat(formBslSslPrice.value);
    if (isNaN(price)) {
      showError(formBslSslPrice, errorBslSslPrice, '请输入有效的价格');
      isValid = false;
    }

    if (!isValid) return null;

    return {
      pda_type: pdaType,
      timeframe,
      anchor_time: formBslSslTime.value.trim(),
      price,
      notes: formNotes.value.trim(),
    };
  }

  return null;
}

/**
 * 显示错误提示
 */
function showError(inputElement, errorElement, message) {
  inputElement.classList.add('error');
  errorElement.textContent = message;
  errorElement.classList.add('visible');
}

/**
 * 清空所有错误提示
 */
function clearErrors() {
  // FVG 错误
  formFvgStartTime.classList.remove('error');
  formFvgEndTime.classList.remove('error');
  formFvgHigh.classList.remove('error');
  formFvgLow.classList.remove('error');
  errorFvgStartTime.classList.remove('visible');
  errorFvgEndTime.classList.remove('visible');
  errorFvgHigh.classList.remove('visible');
  errorFvgLow.classList.remove('visible');

  // BSL/SSL 错误
  formBslSslTime.classList.remove('error');
  formBslSslPrice.classList.remove('error');
  errorBslSslTime.classList.remove('visible');
  errorBslSslPrice.classList.remove('visible');
}

/**
 * 获取表单数据（验证后）
 * @returns {Object|null} 表单数据或 null
 */
export function getFormData() {
  return validateForm();
}

// 事件监听
sidebarCloseBtn.addEventListener('click', hidePdaForm);
sidebarCancelBtn.addEventListener('click', hidePdaForm);

// 保存按钮
sidebarSaveBtn.addEventListener('click', () => {
  const formData = validateForm();
  if (formData && onSaveCallback) {
    onSaveCallback(formData);
  }
});

// ESC 键关闭侧边栏
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && !sidebar.classList.contains('collapsed')) {
    hidePdaForm();
  }
});

// 时间输入框自动格式化
const timeInputs = [formFvgStartTime, formFvgEndTime, formBslSslTime];
timeInputs.forEach((input) => {
  input.addEventListener('blur', (e) => {
    const formatted = formatTimeInput(e.target.value);
    if (formatted !== e.target.value) {
      e.target.value = formatted;
    }
  });
});
