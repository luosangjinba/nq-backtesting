import assert from 'node:assert/strict';
import { evaluate } from './browser-cdp-client.js';

export async function verifyComparisonReplayWorkspace({ client }) {
    const replayProgressive = await evaluate(client, `
      (async () => {
        const bus = await import('/src/event-bus.js');
        bus.emit('replay:changed', { enabled: true, cursorTimestamp: 1781256600 });
        await new Promise((resolve) => setTimeout(resolve, 250));
        const chart = await import('/src/chart/comparison-chart-manager.js');
        return {
          info: document.querySelector('#comparison-chart-info').textContent,
          chartReady: Boolean(chart.getComparisonChart() && chart.getComparisonSeries()),
          placeholderHidden: document.querySelector('[data-comparison-placeholder]').hidden,
          replaySourceRequested: window.__comparisonBarsUrls.some((url) => /instrument=ES/.test(url) && /tf=1/.test(url)),
        };
      })();
    `);
    assert.deepEqual(replayProgressive, {
      info: 'ES 1H',
      chartReady: true,
      placeholderHidden: true,
      replaySourceRequested: true,
    }, 'Replay progressive HTF path should keep the comparison chart rendered from 1M source data');

    const smtResult = await evaluate(client, `
      (async () => {
        const smtStore = await import('/src/smt/smt-store.js');
        const smtSelection = await import('/src/smt/smt-selection.js');
        const chart = await import('/src/chart/chart-manager.js');
        const record = smtStore.addSmtRecord({
          type: smtStore.SMT_TYPES.LIQUIDITY,
          direction: smtStore.SMT_DIRECTIONS.BEARISH,
          timeframe: '1H',
          primaryInstrument: 'NQ',
          compareInstrument: 'ES',
          compareChartId: 'comparison-window',
          compareChartLabel: 'Pane 1',
          leftTimestamp: 1781254800,
          rightTimestamp: 1781258400,
          primaryLeftPrice: 29501,
          primaryRightPrice: 29470,
          compareLeftPrice: 7424.75,
          compareRightPrice: 7443.5,
        });
        smtSelection.selectSmt(record.id, { chartId: 'comparison-window' });
        await new Promise((resolve) => setTimeout(resolve, 250));
        const selectedBeforeLocate = smtSelection.getSelectedSmt();
        const locateButton = document.querySelector('[data-inspector-action="smt-locate"][data-smt-id="' + record.id + '"]');
        const beforeRange = chart.getVisibleLogicalRange();
        locateButton?.click();
        await new Promise((resolve) => setTimeout(resolve, 250));
        const afterRange = chart.getVisibleLogicalRange();
        return {
          selected: selectedBeforeLocate,
          locateButtonExists: Boolean(locateButton),
          inspectorText: document.querySelector('#inspector-sidebar')?.textContent || '',
          beforeRange,
          afterRange,
        };
      })();
    `);
    assert.equal(smtResult.selected?.id.startsWith('smt_liquidity_'), true, 'SMT selection should store comparison SMT id');
    assert.equal(smtResult.selected?.chartId, 'comparison-window', 'SMT selection should preserve comparison chart id');
    assert.equal(smtResult.locateButtonExists, true, 'SMT inspector should expose locate action');
    assert.match(smtResult.inspectorText, /Bearish Liquidity SMT/, 'Inspector should render selected SMT');
    assert.ok(smtResult.afterRange, 'SMT locate should leave primary chart with a visible range');

    const sameInstrumentCrossTimeframe = await evaluate(client, `
      (async () => {
        const instrumentSelect = document.querySelector('[data-comparison-instrument]');
        const timeframeSelect = document.querySelector('[data-comparison-timeframe]');
        instrumentSelect.value = 'NQ';
        instrumentSelect.dispatchEvent(new Event('change', { bubbles: true }));
        await new Promise((resolve) => setTimeout(resolve, 250));
        timeframeSelect.value = '15';
        timeframeSelect.dispatchEvent(new Event('change', { bubbles: true }));
        await new Promise((resolve) => setTimeout(resolve, 500));
        return {
          info: document.querySelector('#comparison-chart-info').textContent,
          urls: window.__comparisonBarsUrls,
          placeholderHidden: document.querySelector('[data-comparison-placeholder]').hidden,
        };
      })();
    `);
    assert.equal(sameInstrumentCrossTimeframe.info, 'NQ 15M');
    assert.equal(sameInstrumentCrossTimeframe.placeholderHidden, true, 'Same-instrument cross-timeframe load should render data');
    assert.ok(
      sameInstrumentCrossTimeframe.urls.some((url) => /instrument=NQ/.test(url) && /tf=15/.test(url)),
      'Comparison window should request same-instrument cross-timeframe bars'
    );
    assert.ok(
      sameInstrumentCrossTimeframe.urls.some((url) => /instrument=NQ/.test(url) && /tf=1/.test(url)),
      'Comparison window should request same-instrument 1M source for HTF replay'
    );

    const reset = await evaluate(client, `
      (() => {
      document.querySelector('[data-comparison-reset]').click();
      const win = document.querySelector('#comparison-window');
      return {
        left: win.style.left,
        right: win.style.right,
        top: win.style.top,
        width: win.style.width,
        height: win.style.height,
        layoutMode: win.dataset.layoutMode,
      };
      })();
    `);
    assert.deepEqual(reset, {
      left: 'auto',
      right: 'auto',
      top: 'auto',
      width: '100%',
      height: '100%',
      layoutMode: 'two-column',
    });

    const singleRight = await evaluate(client, `
      (async () => {
      document.querySelector('#chartLayoutBtn').click();
      document.querySelector('[data-layout-action="single-comparison"]').click();
      const stack = document.querySelector('#chart-stack');
      const primary = document.querySelector('#primary-chart-panel');
      const root = document.querySelector('#comparison-window-root');
      return {
        hidden: root.hidden,
        stackSingleComparison: stack.classList.contains('chart-stack-single-comparison'),
        stackTwoPane: stack.classList.contains('chart-stack-two-pane'),
        primaryDisplay: getComputedStyle(primary).display,
        rootWidth: root.getBoundingClientRect().width,
        stackWidth: stack.getBoundingClientRect().width,
        activePane: (await import('/src/chart-panes/chart-pane-store.js')).getActivePane().id,
      };
      })();
    `);
    assert.equal(singleRight.hidden, false, 'Single-pane layout should keep Pane 1 visible');
    assert.equal(singleRight.stackSingleComparison, true, 'Single-pane layout should use the Pane 1 workspace');
    assert.equal(singleRight.stackTwoPane, false, 'Single-pane layout should not keep two-column class');
    assert.equal(singleRight.primaryDisplay, 'none', 'Single-pane layout should hide Pane 2');
    assert.ok(Math.abs(singleRight.rootWidth - singleRight.stackWidth) <= 3, 'Pane 1 should fill the chart stack in single-pane layout');
    assert.equal(singleRight.activePane, 'pane-2', 'Single-pane layout should keep Pane 1 active');
    const primaryRangeAfterRestore = await evaluate(client, `
      (async () => {
        const chartManager = await import('/src/chart/chart-manager.js');
        chartManager.setVisibleLogicalRange(0, 1);
        document.querySelector('#chartLayoutBtn').click();
        document.querySelector('[data-layout-action="two-column"]').click();
        await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
        const range = chartManager.getVisibleLogicalRange();
        return {
          stackTwoPane: document.querySelector('#chart-stack').classList.contains('chart-stack-two-pane'),
          primaryDisplay: getComputedStyle(document.querySelector('#primary-chart-panel')).display,
          rangeWidth: range ? range.to - range.from : null,
        };
      })();
    `);
    assert.equal(primaryRangeAfterRestore.stackTwoPane, true, 'Two-column layout should restore after single Pane 1 mode');
    assert.notEqual(primaryRangeAfterRestore.primaryDisplay, 'none', 'Pane 2 should be visible after restoring two-column layout');
    assert.ok(
      primaryRangeAfterRestore.rangeWidth > 2,
      `Pane 2 should recover from a hidden-layout narrow range: ${JSON.stringify(primaryRangeAfterRestore)}`
    );
    const primaryLegendReset = await evaluate(client, `
      (() => getComputedStyle(document.querySelector('#chart-stack')).getPropertyValue('--primary-legend-left-offset').trim())();
    `);
    assert.equal(primaryLegendReset, '0px', 'Primary OHLC legend offset should reset when comparison closes');
}
