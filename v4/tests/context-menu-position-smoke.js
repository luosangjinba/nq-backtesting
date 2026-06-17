import assert from 'node:assert/strict';

import { repositionContextMenu } from '../src/pda/manual-context-menu.js';

function createClassList() {
  const values = new Set();
  return {
    contains(name) {
      return values.has(name);
    },
    toggle(name, force) {
      if (force) values.add(name);
      else values.delete(name);
    },
  };
}

function createMenu({ bounds, rect, scrollHeight }) {
  const chartEl = {
    getBoundingClientRect() {
      return bounds;
    },
  };
  const containerEl = {
    parentElement: chartEl,
  };
  return {
    classList: createClassList(),
    parentElement: containerEl,
    scrollHeight,
    style: {},
    getBoundingClientRect() {
      return rect;
    },
  };
}

const bottomMenu = createMenu({
  bounds: { width: 800, height: 500 },
  rect: { width: 220, height: 300 },
  scrollHeight: 300,
});
const bottomResult = repositionContextMenu(bottomMenu, 600, 420);
assert.equal(bottomMenu.style.left, '576px', 'menu clamps horizontally inside chart bounds');
assert.equal(bottomMenu.style.top, '196px', 'menu repositions above bottom edge using measured height');
assert.equal(bottomResult.constrained, false, 'normal-height menu is not scroll constrained');
assert.equal(bottomMenu.classList.contains('pda-menu-submenu-left'), true, 'submenu opens left near right edge');

const tallMenu = createMenu({
  bounds: { width: 800, height: 500 },
  rect: { width: 220, height: 492 },
  scrollHeight: 900,
});
const tallResult = repositionContextMenu(tallMenu, 120, 420);
assert.equal(tallMenu.style.top, '4px', 'over-tall menu starts at top margin');
assert.equal(tallMenu.style.maxHeight, '492px', 'over-tall menu is limited to available height');
assert.equal(tallResult.constrained, true, 'over-tall menu gets scroll constrained');
assert.equal(tallMenu.classList.contains('is-scroll-constrained'), true, 'scroll constraint class is applied');

console.log('context menu position smoke ok');
