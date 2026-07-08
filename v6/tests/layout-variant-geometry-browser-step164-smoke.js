import assert from 'node:assert/strict';
import { evaluate } from '../../v4/tests/helpers/browser-cdp-client.js';
import { openV6Page } from './helpers/v6-browser-harness.js';

const page = await openV6Page({ height: 820, width: 1280 });

try {
  const value = JSON.parse(await evaluate(page.client, `
    (async () => JSON.stringify(await (async () => {
      const commands = await import('/v6/src/runtime/commands.js');
      const contracts = await import('/v6/src/contracts/app-contracts.js');
      const root = document.querySelector('[data-v6-root]');
      await root.__v6LayoutSurfaceBridge.ready;
      const chartSurface = document.querySelector('[data-v6-chart-surface]');
      const read = () => {
        const styles = getComputedStyle(chartSurface);
        return {
          columns: styles.gridTemplateColumns,
          mode: chartSurface.dataset.v6ChartLayoutMode,
          paneCount: chartSurface.dataset.v6ChartLayoutPaneCount,
          rows: styles.gridTemplateRows,
          state: root.__v6WorkstationChartSurface.getState().layout,
          variant: chartSurface.dataset.v6ChartLayoutVariant,
          hosts: [...document.querySelectorAll('[data-v6-chart-engine-host]')].map((host) => {
            const hostStyles = getComputedStyle(host);
            return {
              computedGridArea: hostStyles.gridArea,
              gridArea: host.style.gridArea,
              heightStyle: hostStyles.height,
              hidden: host.hidden,
              minHeight: hostStyles.minHeight,
              paneId: host.dataset.v6PaneId,
              slot: host.dataset.v6ChartPaneSlot,
              visible: host.dataset.v6ChartPaneVisible,
            };
          }),
        };
      };
      await commands.dispatchCommand(contracts.LAYOUT_COMMANDS.SET_MODE, { mode: 'twice', variant: 'twice-vertical' });
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      const twiceVertical = read();
      await commands.dispatchCommand(contracts.LAYOUT_COMMANDS.SET_MODE, { mode: 'twice', variant: 'twice-horizontal' });
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      const twiceHorizontal = read();
      await commands.dispatchCommand(contracts.LAYOUT_COMMANDS.SET_MODE, { mode: 'triple', variant: 'triple-columns' });
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      const tripleColumns = read();
      await commands.dispatchCommand(contracts.LAYOUT_COMMANDS.SET_MODE, { mode: 'triple', variant: 'triple-rows' });
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      const tripleRows = read();
      await commands.dispatchCommand(contracts.LAYOUT_COMMANDS.SET_MODE, { mode: 'triple', variant: 'triple-right-stack' });
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      const tripleRightStack = read();
      await commands.dispatchCommand(contracts.LAYOUT_COMMANDS.SET_MODE, { mode: 'triple', variant: 'triple-left-stack' });
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      const tripleLeftStack = read();
      return { tripleColumns, tripleLeftStack, tripleRightStack, tripleRows, twiceHorizontal, twiceVertical };
    })()))()
  `));

  assert.equal(value.twiceVertical.variant, 'twice-vertical');
  assert.equal(value.twiceVertical.state.variant, 'twice-vertical');
  assert.deepEqual(value.twiceVertical.hosts.map((host) => [host.paneId, host.hidden, host.visible, host.slot]), [
    ['main', false, 'true', '1'],
    ['secondary', false, 'true', '2'],
    ['tertiary', true, 'false', ''],
  ]);
  assert.deepEqual(value.twiceVertical.hosts.map((host) => host.computedGridArea), [
    '1 / 1 / 2 / 2',
    '1 / 2 / 2 / 3',
    'auto',
  ]);
  assert.match(value.twiceVertical.columns, /repeat\(2, minmax\(0px, 1fr\)\)|0px 0px/);
  assert.deepEqual(value.twiceVertical.hosts.slice(0, 2).map((host) => host.minHeight), ['0px', '0px']);

  assert.equal(value.twiceHorizontal.variant, 'twice-horizontal');
  assert.deepEqual(value.twiceHorizontal.hosts.map((host) => host.computedGridArea), [
    '1 / 1 / 2 / 2',
    '2 / 1 / 3 / 2',
    'auto',
  ]);
  assert.match(value.twiceHorizontal.rows, /repeat\(2, minmax\(0px, 1fr\)\)|0px 0px/);
  assert.notEqual(value.twiceHorizontal.rows, value.twiceVertical.rows);
  assert.deepEqual(value.twiceHorizontal.hosts.slice(0, 2).map((host) => host.minHeight), ['0px', '0px']);

  assert.equal(value.tripleColumns.variant, 'triple-columns');
  assert.deepEqual(value.tripleColumns.hosts.map((host) => host.gridArea), [
    '1 / 1 / 2 / 2',
    '1 / 2 / 2 / 3',
    '1 / 3 / 2 / 4',
  ]);
  assert.match(value.tripleColumns.columns, /repeat\(3, minmax\(0px, 1fr\)\)|0px 0px 0px/);

  assert.equal(value.tripleRows.variant, 'triple-rows');
  assert.deepEqual(value.tripleRows.hosts.map((host) => host.gridArea), [
    '1 / 1 / 2 / 2',
    '2 / 1 / 3 / 2',
    '3 / 1 / 4 / 2',
  ]);
  assert.match(value.tripleRows.rows, /repeat\(3, minmax\(0px, 1fr\)\)|0px 0px 0px/);
  assert.notEqual(value.tripleRows.rows, value.tripleColumns.rows);
  assert.deepEqual(value.tripleRows.hosts.map((host) => host.minHeight), ['0px', '0px', '0px']);

  assert.equal(value.tripleRightStack.variant, 'triple-right-stack');
  assert.deepEqual(value.tripleRightStack.hosts.map((host) => host.gridArea), [
    '1 / 1 / 3 / 2',
    '1 / 2 / 2 / 3',
    '2 / 2 / 3 / 3',
  ]);
  assert.match(value.tripleRightStack.columns, /repeat\(2, minmax\(0px, 1fr\)\)|0px 0px/);
  assert.match(value.tripleRightStack.rows, /repeat\(2, minmax\(0px, 1fr\)\)|0px 0px/);
  assert.deepEqual(value.tripleRightStack.hosts.map((host) => host.minHeight), ['0px', '0px', '0px']);

  assert.equal(value.tripleLeftStack.variant, 'triple-left-stack');
  assert.deepEqual(value.tripleLeftStack.hosts.map((host) => host.gridArea), [
    '1 / 1 / 2 / 2',
    '2 / 1 / 3 / 2',
    '1 / 2 / 3 / 3',
  ]);
  assert.notDeepEqual(
    value.tripleLeftStack.hosts.map((host) => host.gridArea),
    value.tripleRightStack.hosts.map((host) => host.gridArea),
  );
  assert.deepEqual(value.tripleLeftStack.hosts.map((host) => host.minHeight), ['0px', '0px', '0px']);
} finally {
  await page.cleanup();
}

console.log('v6 layout variant geometry browser step 164 smoke passed');
