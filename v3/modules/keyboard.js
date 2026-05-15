/**
 * keyboard.js - 键盘导航模块
 * 负责全局快捷键和菜单键盘导航
 */

import { state } from './chart.js';
import {
  closeContextMenu,
  moveMenuSelectionDown,
  moveMenuSelectionUp,
  triggerMenuSelection,
} from './context-menu.js';
import { closePdaDetail } from './pda-detail.js';

/**
 * 初始化键盘事件监听
 * @param {Function} refreshData - 刷新数据的回调函数
 */
export function initKeyboardNavigation(refreshData) {
  // 全局键盘事件
  document.addEventListener('keydown', (e) => {
    // F5 刷新数据（避免输入框获得焦点时触发）
    if (e.key === 'F5') {
      const activeElement = document.activeElement;
      const isInputFocused =
        activeElement &&
        (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA');

      if (!isInputFocused) {
        e.preventDefault();
        refreshData();
      }
    }
    // ESC 键关闭菜单和浮窗
    else if (e.key === 'Escape') {
      if (state.currentPopover) {
        closePdaDetail();
        console.log('✓ 浮窗已关闭 (ESC)');
      } else if (state.currentMenu) {
        closeContextMenu();
        console.log('✓ 菜单已关闭 (ESC)');
      }
    }
    // 菜单打开时的键盘导航
    else if (state.currentMenu) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        moveMenuSelectionDown();
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        moveMenuSelectionUp();
      } else if (e.key === 'Enter') {
        e.preventDefault();
        triggerMenuSelection();
      }
    }
  });

  // 窗口 resize 时关闭菜单
  window.addEventListener('resize', () => {
    if (state.currentMenu) {
      closeContextMenu();
      console.log('✓ 菜单已关闭 (resize)');
    }
  });

  console.log('✓ 键盘导航初始化完成');
}
