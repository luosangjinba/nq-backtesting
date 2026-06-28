import assert from 'node:assert/strict';
import { evaluate, waitForExpression } from './browser-cdp-client.js';

export async function verifyComparisonDataAndViewport({ client }) {
    const fetchCallsWithoutRange = await evaluate(client, `window.__comparisonFetchCalls`);
    assert.equal(fetchCallsWithoutRange, 0, 'Comparison window should not request bars before a main range exists');

    await evaluate(client, `
      (async () => {
        const store = await import('/src/data/bar-store.js');
        store.setBars([
          { time: '2026-06-12 09:30', timestamp: 1781256600, tradingDay: '2026-06-12', open: 29494.5, high: 29501, low: 29371, close: 29430.5, volume: 4223 },
          { time: '2026-06-12 10:00', timestamp: 1781258400, tradingDay: '2026-06-12', open: 29430.5, high: 29470, low: 29410, close: 29455.5, volume: 4123 },
          { time: '2026-06-12 10:30', timestamp: 1781260200, tradingDay: '2026-06-12', open: 29455.5, high: 29520, low: 29448, close: 29510.25, volume: 4023 },
        ], '2026-06-12 09:30', '2026-06-12 10:30', 1, { startTs: 1781256600, endTs: 1781260200 }, { instrument: 'NQ' });
        return true;
      })();
    `);
    await waitForExpression(client, `window.__comparisonFetchCalls === 2 && document.querySelector('[data-comparison-placeholder]').hidden`);
    const loaded = await evaluate(client, `
      (() => {
        return {
          fetchCalls: window.__comparisonFetchCalls,
          url: window.__comparisonLastBarsUrl,
          urls: window.__comparisonBarsUrls,
          info: document.querySelector('#comparison-chart-info').textContent,
          placeholderHidden: document.querySelector('[data-comparison-placeholder]').hidden,
          overlayStatus: document.querySelector('[data-comparison-overlay-status]').textContent,
        };
      })();
    `);
    assert.equal(loaded.fetchCalls, 2, 'Comparison window should request comparison bars and replay source bars after main range loads');
    assert.ok(loaded.urls.some((url) => /instrument=NQ/.test(url) && /tf=60/.test(url)), 'Comparison window should request its own default timeframe');
    assert.ok(loaded.urls.some((url) => /instrument=NQ/.test(url) && /tf=1/.test(url)), 'Comparison window should request 1M replay source for HTF progressive replay');
    assert.equal(loaded.info, 'NQ 1H');
    assert.equal(loaded.placeholderHidden, true, 'Comparison placeholder should hide after data loads');
    assert.match(loaded.overlayStatus, /Time overlays ready/, 'Comparison overlay status should update after data loads');
    const pane2NoSyncFollow = await evaluate(client, `
      (async () => {
        const paneStore = await import('/src/chart-panes/chart-pane-store.js');
        const store = await import('/src/data/bar-store.js');
        paneStore.setPaneSyncEnabled('pane-1', false);
        const before = window.__comparisonFetchCalls;
        store.setBars([
          { time: '2026-06-15 09:30', timestamp: 1781515800, tradingDay: '2026-06-15', open: 29500, high: 29520, low: 29490, close: 29510, volume: 4223 },
          { time: '2026-06-15 10:00', timestamp: 1781517600, tradingDay: '2026-06-15', open: 29510, high: 29530, low: 29495, close: 29515, volume: 4123 },
          { time: '2026-06-15 10:30', timestamp: 1781519400, tradingDay: '2026-06-15', open: 29515, high: 29540, low: 29500, close: 29525, volume: 4023 },
        ], '2026-06-15 09:30', '2026-06-15 10:30', 1, { startTs: 1781515800, endTs: 1781519400 }, { instrument: 'NQ' });
        await new Promise((resolve) => setTimeout(resolve, 180));
        const after = window.__comparisonFetchCalls;
        paneStore.setPaneSyncEnabled('pane-1', true);
        return { before, after };
      })();
    `);
    assert.deepEqual(pane2NoSyncFollow, { before: 2, after: 2 }, 'Pane 2 No Sync should stop primary range loads from driving Pane 1 reloads');
    await evaluate(client, `
      (async () => {
        const store = await import('/src/data/bar-store.js');
        store.setBars([
          { time: '2026-06-12 09:30', timestamp: 1781256600, tradingDay: '2026-06-12', open: 29494.5, high: 29501, low: 29371, close: 29430.5, volume: 4223 },
          { time: '2026-06-12 10:00', timestamp: 1781258400, tradingDay: '2026-06-12', open: 29430.5, high: 29470, low: 29410, close: 29455.5, volume: 4123 },
          { time: '2026-06-12 10:30', timestamp: 1781260200, tradingDay: '2026-06-12', open: 29455.5, high: 29520, low: 29448, close: 29510.25, volume: 4023 },
        ], '2026-06-12 09:30', '2026-06-12 10:30', 1, { startTs: 1781256600, endTs: 1781260200 }, { instrument: 'NQ' });
      })();
    `);
    await waitForExpression(client, `window.__comparisonFetchCalls === 4`);
    const independentVisibleRanges = await evaluate(client, `
      (async () => {
        const primaryChart = await import('/src/chart/chart-manager.js');
        const comparisonChart = await import('/src/chart/comparison-chart-manager.js');
        const roundRange = (range) => ({
          from: Number(Number(range?.from).toFixed(3)),
          to: Number(Number(range?.to).toFixed(3)),
        });
        comparisonChart.setComparisonVisibleLogicalRange(0, 8);
        primaryChart.setVisibleLogicalRange(0, 2);
        await new Promise((resolve) => setTimeout(resolve, 120));
        const comparisonAfterPrimaryMove = roundRange(comparisonChart.getComparisonVisibleLogicalRange());
        primaryChart.setVisibleLogicalRange(0, 2);
        comparisonChart.setComparisonVisibleLogicalRange(4, 12);
        await new Promise((resolve) => setTimeout(resolve, 120));
        const primaryAfterComparisonMove = roundRange(primaryChart.getVisibleLogicalRange());
        return {
          comparisonAfterPrimaryMove,
          primaryAfterComparisonMove,
        };
      })();
    `);
    assert.deepEqual(
      independentVisibleRanges.comparisonAfterPrimaryMove,
      { from: 0, to: 8 },
      'Primary time movement should not sync-scroll the comparison pane'
    );
    assert.deepEqual(
      independentVisibleRanges.primaryAfterComparisonMove,
      { from: 0, to: 2 },
      'Comparison time movement should not sync-scroll the primary pane'
    );
    const primaryMenuPaneLabels = await evaluate(client, `
      (async () => {
        const menu = await import('/src/pda/manual-context-menu.js');
        const html = menu.renderManualContextMenu({
          left: 0,
          top: 0,
          maxHeight: 400,
          timeLabel: 'NQ 1M',
          disabled: '',
          orderSetupItems: '',
          liveRecordItems: '',
          pdaItems: '',
          smtItems: '',
          segmentItems: '',
          pointSetItems: '',
          chartNoteItems: '',
          timeOverlayItems: '',
          clearItems: '',
        });
        const host = document.createElement('div');
        host.innerHTML = html;
        return [...host.querySelectorAll('.pda-submenu-panel .pda-menu-item')]
          .map((item) => item.textContent.trim());
      })();
    `);
    assert.ok(primaryMenuPaneLabels.includes('Time in Pane 1'), 'Primary context menu should use pane terminology for cross-pane locate');
    assert.equal(primaryMenuPaneLabels.includes('Time in Comparison'), false, 'Primary context menu should not show old Comparison locate wording');
    const comparisonViewportAction = await evaluate(client, `
      (async () => {
        const manager = await import('/src/chart/comparison-chart-manager.js');
        const before = manager.getComparisonVisibleLogicalRange();
        const controls = document.querySelector('#comparison-viewport-controls');
        const disabledCountBefore = controls.querySelectorAll('button:disabled').length;
        controls.querySelector('[data-action="zoomIn"]').click();
        await new Promise((resolve) => setTimeout(resolve, 80));
        const afterZoom = manager.getComparisonVisibleLogicalRange();
        manager.setComparisonVisibleLogicalRange(before.from, before.to);
        await new Promise((resolve) => setTimeout(resolve, 120));
        const afterReset = manager.getComparisonVisibleLogicalRange();
        return {
          disabledCountBefore,
          before,
          afterZoom,
          afterReset,
          beforeWidth: Number(before?.to) - Number(before?.from),
          afterZoomWidth: Number(afterZoom?.to) - Number(afterZoom?.from),
          afterResetWidth: Number(afterReset?.to) - Number(afterReset?.from),
        };
      })();
    `);
    assert.equal(comparisonViewportAction.disabledCountBefore, 0, 'Comparison viewport buttons should enable after comparison data loads');
    assert.ok(
      comparisonViewportAction.afterZoomWidth < comparisonViewportAction.beforeWidth,
      `Comparison viewport zoom button should control comparison chart: ${JSON.stringify(comparisonViewportAction)}`
    );
    assert.ok(
      Math.abs(comparisonViewportAction.afterResetWidth - comparisonViewportAction.beforeWidth) < 0.01,
      `Comparison viewport test should restore the prior range: ${JSON.stringify(comparisonViewportAction)}`
    );

    const canvasHealth = await evaluate(client, `
      (() => {
        const canvases = [...document.querySelectorAll('#comparison-chart-canvas canvas')];
        const colors = new Set();
        let paintedPixels = 0;
        for (const canvas of canvases) {
          const ctx = canvas.getContext('2d');
          if (!ctx || !canvas.width || !canvas.height) continue;
          const image = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
          for (let i = 0; i < image.length; i += 4 * 16) {
            const alpha = image[i + 3];
            if (!alpha) continue;
            paintedPixels += 1;
            colors.add([image[i], image[i + 1], image[i + 2], alpha].join(','));
          }
        }
        return { canvasCount: canvases.length, paintedPixels, uniqueColors: colors.size };
      })();
    `);
    assert.ok(canvasHealth.canvasCount > 0, 'Comparison chart should create canvas elements');
    assert.ok(canvasHealth.paintedPixels > 0, 'Comparison canvas should contain painted pixels');
    assert.ok(canvasHealth.uniqueColors > 2, 'Comparison canvas should not be a blank single-color surface');
}
