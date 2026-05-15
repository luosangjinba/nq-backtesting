/**
 * pda-detail.js - PDA 详情浮窗模块
 * 负责显示和关闭 PDA 详情浮窗
 */

import { state } from './chart.js';

/**
 * 关闭 PDA 详情浮窗
 */
export function closePdaDetail() {
  if (state.currentPopover) {
    state.currentPopover.remove();
    state.currentPopover = null;
    document.removeEventListener('click', handlePopoverOutsideClick);
  }
}

/**
 * 处理浮窗外部点击
 */
function handlePopoverOutsideClick(e) {
  if (state.currentPopover && !state.currentPopover.contains(e.target)) {
    closePdaDetail();
  }
}

/**
 * 显示 PDA 详情浮窗
 * @param {Object} pda - PDA 记录对象
 * @param {number} x - 浮窗 X 坐标（相对于视口）
 * @param {number} y - 浮窗 Y 坐标（相对于视口）
 */
export function showPdaDetail(pda, x, y) {
  closePdaDetail();

  const popover = document.createElement('div');
  popover.className = 'pda-detail-popover';

  const pdaType = pda.pdaType.toUpperCase();
  const timeframe = pda.timeframe || 'N/A';
  const title = `${pdaType} · ${timeframe}`;

  let detailRows = '';

  // ID
  detailRows += `<div class="detail-row"><span class="detail-label">ID:</span><span class="detail-value">${pda.pdaId}</span></div>`;

  // 时间
  const anchorTime = pda.anchorTs || pda.anchorTime;
  let timeStr = 'N/A';
  if (typeof anchorTime === 'number') {
    const date = new Date(anchorTime * 1000);
    timeStr = date.toISOString().replace('T', ' ').substring(0, 16) + ' ET';
  } else if (typeof anchorTime === 'string') {
    timeStr = anchorTime + ' ET';
  }
  detailRows += `<div class="detail-row"><span class="detail-label">时间:</span><span class="detail-value">${timeStr}</span></div>`;

  // 价格（单点 PDA）
  if (
    pda.pdaType === 'bsl' ||
    pda.pdaType === 'ssl' ||
    pda.pdaType === 'daily_high' ||
    pda.pdaType === 'daily_low' ||
    pda.pdaType === 'ict_midnight_day_high' ||
    pda.pdaType === 'ict_midnight_day_low'
  ) {
    const price = pda.price || pda.priceHigh || pda.priceLow || 'N/A';
    detailRows += `<div class="detail-row"><span class="detail-label">价格:</span><span class="detail-value">${price}</span></div>`;
  }
  // 价格范围（区间 PDA）
  else if (pda.pdaType === 'fvg' || pda.pdaType === 'nwog' || pda.pdaType === 'ndog') {
    const priceHigh = pda.priceHigh || 'N/A';
    const priceLow = pda.priceLow || 'N/A';
    detailRows += `<div class="detail-row"><span class="detail-label">价格范围:</span><span class="detail-value">${priceLow} - ${priceHigh}</span></div>`;

    // FVG 显示 direction
    if (pda.pdaType === 'fvg') {
      const direction = pda.direction || 'N/A';
      detailRows += `<div class="detail-row"><span class="detail-label">Direction:</span><span class="detail-value">${direction}</span></div>`;
    }
  }

  // 周期
  detailRows += `<div class="detail-row"><span class="detail-label">周期:</span><span class="detail-value">${timeframe}</span></div>`;

  // 来源（自动扫描 / 手动）
  const isManual = pda.pdaId && pda.pdaId.startsWith('manual_');
  const sourceBadge = isManual
    ? '<span class="detail-badge badge-manual">手动</span>'
    : '<span class="detail-badge badge-auto">自动扫描</span>';
  detailRows += `<div class="detail-row"><span class="detail-label">来源:</span><span class="detail-value">${sourceBadge}</span></div>`;

  // 关联组（如果有）
  if (pda.referenceGroup) {
    detailRows += `<div class="detail-divider"></div><div class="detail-row"><span class="detail-label">关联组:</span><span class="detail-value">${pda.referenceGroup}</span></div>`;
  }

  // 构建浮窗 HTML
  popover.innerHTML = `
    <div class="popover-header">
      <div class="popover-title">
        <span>📋</span>
     <span>${title}</span>
    </div>
      <div class="popover-close">×</div>
    </div>
    <div class="popover-body">${detailRows}</div>
  `;

  document.body.appendChild(popover);

  // 绑定关闭按钮事件
  const closeBtn = popover.querySelector('.popover-close');
  closeBtn.addEventListener('click', closePdaDetail);

  // 边界检测：防止浮窗超出屏幕
  const popoverRect = popover.getBoundingClientRect();
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;

  let adjustedX = x;
  let adjustedY = y;

  if (x + popoverRect.width > viewportWidth) {
    adjustedX = viewportWidth - popoverRect.width - 10;
  }

  if (y + popoverRect.height > viewportHeight) {
    adjustedY = viewportHeight - popoverRect.height - 10;
  }

  popover.style.left = adjustedX + 'px';
  popover.style.top = adjustedY + 'px';

  state.currentPopover = popover;

  // 延迟绑定外部点击事件（避免立即触发）
  setTimeout(() => {
    document.addEventListener('click', handlePopoverOutsideClick);
  }, 0);

  console.log('✓ PDA 详情浮窗已显示');
}
