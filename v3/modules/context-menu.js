/**
 * context-menu.js - 右键菜单模块
 * 负责创建、显示、关闭右键菜单，以及菜单键盘导航
 */

import { state } from './chart.js';

/**
 * 创建右键菜单
 * @param {number} x - 菜单 X 坐标（相对于视口）
 * @param {number} y - 菜单 Y 坐标（相对于视口）
 * @param {Array} items - 菜单项配置数组
 */
export function createContextMenu(x, y, items) {
  // 移除已存在的菜单
  closeContextMenu();

  const menu = document.createElement('div');
  menu.className = 'context-menu';

  // 边界检测：防止菜单超出屏幕
  const menuWidth = 200;
  const menuHeight = items.length * 40; // 近似高度
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;

  let adjustedX = x;
  let adjustedY = y;

  if (x + menuWidth > viewportWidth) {
    adjustedX = viewportWidth - menuWidth - 10;
  }

  if (y + menuHeight > viewportHeight) {
    adjustedY = viewportHeight - menuHeight - 10;
  }

  menu.style.left = `${adjustedX}px`;
  menu.style.top = `${adjustedY}px`;

  // 收集可选菜单项（不含 divider 和 disabled）
  const selectableItems = [];

  // 构建菜单项
  items.forEach((item) => {
    if (item.type === 'divider') {
      const divider = document.createElement('div');
      divider.className = 'menu-divider';
      menu.appendChild(divider);
    } else {
      const menuItem = document.createElement('div');
      menuItem.className = `menu-item ${item.danger ? 'danger' : ''} ${
        item.disabled ? 'disabled' : ''
      }`;

      menuItem.innerHTML = `
        <span class="icon">${item.icon || ''}</span>
        <span class="label">${item.label}</span>
        ${item.shortcut ? `<span class="shortcut">${item.shortcut}</span>` : ''}
      `;

      if (!item.disabled) {
        const currentIndex = selectableItems.length;
        selectableItems.push({ element: menuItem, action: item.action });

        menuItem.addEventListener('click', (e) => {
          e.stopPropagation();
          const keepOpen = item.action();
          // If action returns true (e.g. opening a submenu), don't close
          if (!keepOpen) {
            closeContextMenu();
          }
        });

        // 鼠标 hover 同步 selectedIndex
        menuItem.addEventListener('mouseenter', () => {
          updateMenuSelection(currentIndex);
        });
      }

      menu.appendChild(menuItem);
    }
  });

  document.body.appendChild(menu);
  state.currentMenu = menu;
  state.menuItems = selectableItems;
  state.selectedMenuIndex = -1;

  console.log(`✓ 右键菜单已显示 (${items.length} 项, ${selectableItems.length} 可选)`);
}

/**
 * 关闭右键菜单
 */
export function closeContextMenu() {
  if (state.currentMenu) {
    state.currentMenu.remove();
    state.currentMenu = null;
    state.menuItems = [];
    state.selectedMenuIndex = -1;
  }
}

/**
 * 更新菜单选中项
 * @param {number} index - 菜单项索引
 */
export function updateMenuSelection(index) {
  if (index < 0 || index >= state.menuItems.length) return;

  // 移除旧选中样式
  if (state.selectedMenuIndex >= 0 && state.selectedMenuIndex < state.menuItems.length) {
    state.menuItems[state.selectedMenuIndex].element.classList.remove('selected');
  }

  // 添加新选中样式
  state.selectedMenuIndex = index;
  state.menuItems[index].element.classList.add('selected');
}

/**
 * 菜单键盘导航：向下
 */
export function moveMenuSelectionDown() {
  if (state.menuItems.length === 0) return;

  let nextIndex = state.selectedMenuIndex + 1;
  if (nextIndex >= state.menuItems.length) {
    nextIndex = 0; // 循环到第一项
  }

  updateMenuSelection(nextIndex);
}

/**
 * 菜单键盘导航：向上
 */
export function moveMenuSelectionUp() {
  if (state.menuItems.length === 0) return;

  let nextIndex = state.selectedMenuIndex - 1;
  if (nextIndex < 0) {
    nextIndex = state.menuItems.length - 1; // 循环到最后一项
  }

  updateMenuSelection(nextIndex);
}

/**
 * 菜单键盘导航：触发选中项
 */
export function triggerMenuSelection() {
  if (state.selectedMenuIndex >= 0 && state.selectedMenuIndex < state.menuItems.length) {
    const item = state.menuItems[state.selectedMenuIndex];
    item.action();
    closeContextMenu();
  }
}

/**
 * 显示 PDA 菜单
 * @param {number} x - 菜单 X 坐标
 * @param {number} y - 菜单 Y 坐标
 * @param {Object} pda - PDA 记录对象
 * @param {Function} showPdaDetail - 显示 PDA 详情的回调函数
 * @param {Function} updateStatus - 更新状态栏的回调函数
 */
export function showPdaMenu(
  x,
  y,
  pda,
  showPdaDetail,
  updateStatus,
  onVisibilityChange,
  onHidePda,
  onPermanentDeletePda,
  onUnmatchManual
) {
  const pdaId = pda.pdaId;
  const pdaType = pda.pdaType.toUpperCase();
  const isManual = pda.source === 'manual_add' || pda.source === 'manual_eqh_eql';
  const hasMatch = pda.extraFields?.matched_auto_pda_id || pda.extraFields?.matched_manual_pda_id;

  console.log(`右键点击 PDA: ${pdaId} (${pdaType})`);

  const items = [
    {
      icon: '👁️',
      label: '可见周期',
      action: () => {
        console.log('[操作] 可见周期:', pda);
        if (onVisibilityChange) onVisibilityChange(pda, x, y);
        return true;
      },
    },
    {
      icon: '🚫',
      label: '隐藏',
      action: () => {
        console.log('[操作] 隐藏 PDA:', pdaId);
        closeContextMenu();
        if (onHidePda) onHidePda(pda);
      },
    },
  ];

  if (hasMatch) {
    items.push({
      icon: '↩️',
      label: '取消匹配',
      action: () => {
        console.log('[操作] 取消匹配:', pdaId);
        closeContextMenu();
        if (onUnmatchManual) onUnmatchManual(pda);
      },
    });
  }

  if (isManual) {
    items.push({
      icon: '🗑️',
      label: '永久删除',
      danger: true,
      action: () => {
        console.log('[操作] 永久删除 PDA:', pdaId);
        closeContextMenu();
        if (onPermanentDeletePda) onPermanentDeletePda(pda);
      },
    });
  }

  items.push(
    { type: 'divider' },
    {
      icon: '📋',
      label: '查看详情',
      action: () => {
        console.log('[操作] 查看详情:', pda);
        closeContextMenu();
        showPdaDetail(pda, x, y);
      },
    },
    {
      icon: '📍',
      label: '定位到此 PDA',
      action: () => {
        console.log('[操作] 定位到 PDA:', pdaId);
        const anchorTime = pda.anchorTs || pda.anchorTime;
        let timestamp;
        if (typeof anchorTime === 'number') {
          timestamp = anchorTime;
        } else if (typeof anchorTime === 'string') {
          timestamp = Math.floor(new Date(anchorTime.replace(' ', 'T') + 'Z').getTime() / 1000);
        }
        if (timestamp && state.chart) {
          const timeScale = state.chart.timeScale();
          const range = 7200;
          timeScale.setVisibleRange({ from: timestamp - range, to: timestamp + range });
        }
      },
    },
    {
      icon: '📄',
      label: '复制 PDA ID',
      action: () => {
        console.log('[操作] 复制 PDA ID:', pdaId);
        navigator.clipboard.writeText(pdaId).then(() => {
          updateStatus(`已复制: ${pdaId}`);
        });
      },
    }
  );

  createContextMenu(x, y, items);
}

export function showHiddenPdaMenu(x, y, pda, onRestorePda, onPermanentDeletePda) {
  const pdaId = pda.pdaId;
  const isManual = pda.source === 'manual_add' || pda.source === 'manual_eqh_eql';

  const items = [
    {
      icon: '👁️',
      label: '恢复显示',
      action: () => {
        console.log('[操作] 恢复 PDA:', pdaId);
        closeContextMenu();
        if (onRestorePda) onRestorePda(pda);
      },
    },
  ];

  if (isManual) {
    items.push({
      icon: '🗑️',
      label: '永久删除',
      danger: true,
      action: () => {
        console.log('[操作] 永久删除 PDA:', pdaId);
        closeContextMenu();
        if (onPermanentDeletePda) onPermanentDeletePda(pda);
      },
    });
  }

  createContextMenu(x, y, items);
}

/**
 * 显示空白区域菜单（用于手动添加 PDA）
 * @param {number} x - 菜单 X 坐标
 * @param {number} y - 菜单 Y 坐标
 * @param {Object} chartCoordinates - 图表坐标 { time, price }
 */
export function showBlankAreaMenu(x, y, chartCoordinates, onAddPda) {
  console.log('右键点击空白区域:', chartCoordinates);

  const items = [
    {
      icon: '➕',
      label: '手动添加 FVG',
      action: () => {
        console.log('[操作] 手动添加 FVG:', chartCoordinates);
        if (onAddPda) onAddPda('fvg', chartCoordinates);
      },
    },
    {
      icon: '➕',
      label: '手动添加 BSL',
      action: () => {
        console.log('[操作] 手动添加 BSL:', chartCoordinates);
        if (onAddPda) onAddPda('bsl', chartCoordinates);
      },
    },
    {
      icon: '➕',
      label: '手动添加 SSL',
      action: () => {
        console.log('[操作] 手动添加 SSL:', chartCoordinates);
        if (onAddPda) onAddPda('ssl', chartCoordinates);
      },
    },
    {
      type: 'divider',
    },
    {
      icon: '🔄',
      label: '刷新数据',
      shortcut: 'F5',
      action: () => {
        console.log('[操作] 刷新数据');
        closeContextMenu();
        // 触发刷新（通过全局事件或回调）
        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'F5' }));
      },
    },
  ];

  createContextMenu(x, y, items);
}

/**
 * 显示 K 线菜单（用于标注 Swing Low/High 和 FVG）
 * @param {number} x - 菜单 X 坐标
 * @param {number} y - 菜单 Y 坐标
 * @param {Object} barData - K 线数据 { time, open, high, low, close }
 * @param {number} timeframe - 周期（分钟）
 * @param {Function} onAnnotate - 标注回调函数
 */
export function showKlineMenu(x, y, barData, timeframe, onAnnotate, onClearAllManual) {
  console.log('右键点击 K 线:', barData);

  const items = [
    {
      icon: '📍',
      label: '标注 BSL',
      action: () => {
        console.log('[操作] 标注 BSL:', barData);
        if (onAnnotate) onAnnotate('bsl', barData, timeframe);
      },
    },
    {
      icon: '📍',
      label: '标注 SSL',
      action: () => {
        console.log('[操作] 标注 SSL:', barData);
        if (onAnnotate) onAnnotate('ssl', barData, timeframe);
      },
    },
    {
      icon: '📍',
      label: '标注 FVG',
      action: () => {
        console.log('[操作] 标注 FVG:', barData);
        if (onAnnotate) onAnnotate('fvg', barData, timeframe);
      },
    },
    { type: 'divider' },
    {
      icon: '📍',
      label: '标注 Swing Low',
      action: () => {
        if (onAnnotate) onAnnotate('swingLow', barData, timeframe);
      },
    },
    {
      icon: '📍',
      label: '标注 Swing High',
      action: () => {
        if (onAnnotate) onAnnotate('swingHigh', barData, timeframe);
      },
    },
    {
      icon: '↩️',
      label: '撤销上一步',
      action: () => {
        if (onAnnotate) onAnnotate('undoStage3', barData, timeframe);
      },
    },
    { type: 'divider' },
    {
      icon: '🧹',
      label: '清除所有已标注 PDA',
      danger: true,
      action: () => {
        console.log('[操作] 清除所有已标注 PDA');
        closeContextMenu();
        if (onClearAllManual) onClearAllManual();
      },
    },
    { type: 'divider' },
    {
      icon: '🔄',
      label: '刷新数据',
      shortcut: 'F5',
      action: () => {
        closeContextMenu();
        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'F5' }));
      },
    },
  ];

  createContextMenu(x, y, items);
}
