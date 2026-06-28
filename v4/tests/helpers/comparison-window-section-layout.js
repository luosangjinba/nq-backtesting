import assert from 'node:assert/strict';
import { evaluate } from './browser-cdp-client.js';

export async function verifyComparisonPaneLayout({ client }) {
    const initial = await evaluate(client, `
      ({
        layoutButton: Boolean(document.querySelector('#chartLayoutBtn')),
        layoutSingleRight: Boolean(document.querySelector('[data-layout-action="single-comparison"]')),
        layoutTwoColumn: Boolean(document.querySelector('[data-layout-action="two-column"]')),
        splitToggle: Boolean(document.querySelector('#splitScreenToggle')),
        secondaryInstrument: Boolean(document.querySelector('#secondaryInstrumentSelect')),
        secondaryTimeframe: Boolean(document.querySelector('#secondaryTfSelect')),
        splitLayout: Boolean(document.querySelector('#splitLayoutSelect')),
        secondaryPanel: Boolean(document.querySelector('#secondary-chart-panel')),
      })
    `);
    assert.deepEqual(initial, {
      layoutButton: true,
      layoutSingleRight: true,
      layoutTwoColumn: true,
      splitToggle: false,
      secondaryInstrument: false,
      secondaryTimeframe: false,
      splitLayout: false,
      secondaryPanel: false,
    }, 'Comparison window should remain available after old Split UI is removed');

    const shown = await evaluate(client, `
      (() => {
      document.querySelector('#chartLayoutBtn').click();
      document.querySelector('[data-layout-action="two-column"]').click();
      const root = document.querySelector('#comparison-window-root');
      const win = document.querySelector('#comparison-window');
      const instrument = document.querySelector('[data-comparison-instrument]');
      const timeframe = document.querySelector('[data-comparison-timeframe]');
      const overlaySync = document.querySelector('[data-comparison-overlay-sync]');
      const close = document.querySelector('[data-comparison-close]');
      const reset = document.querySelector('[data-comparison-reset]');
      const header = document.querySelector('.comparison-window-header');
      const rail = document.querySelector('.comparison-window-rail');
      const status = document.querySelector('[data-comparison-status]');
      const placeholderTitle = document.querySelector('.comparison-window-placeholder-title');
      const overlayStatus = document.querySelector('[data-comparison-overlay-status]');
      const placeholder = document.querySelector('[data-comparison-placeholder]');
      const stack = document.querySelector('#chart-stack').getBoundingClientRect();
      const primary = document.querySelector('#primary-chart-panel').getBoundingClientRect();
      return {
        hidden: root.hidden,
        width: win.getBoundingClientRect().width,
        height: win.getBoundingClientRect().height,
        instrumentValue: instrument.value,
        timeframeValue: timeframe.value,
        overlaySyncValue: overlaySync.value,
        overlaySyncOptions: [...overlaySync.options].map((option) => ({ value: option.value, text: option.textContent })),
        headerDisplay: getComputedStyle(header).display,
        railDisplay: getComputedStyle(rail).display,
        overlaySyncDisplay: getComputedStyle(overlaySync.closest('label')).display,
        instrumentDisplay: getComputedStyle(instrument.closest('label')).display,
        timeframeDisplay: getComputedStyle(timeframe.closest('label')).display,
        closeDisplay: getComputedStyle(close).display,
        resetDisplay: getComputedStyle(reset).display,
        statusText: status.textContent,
        placeholderTitle: placeholderTitle.textContent,
        placeholderHidden: placeholder.hidden,
        overlayStatusText: overlayStatus.textContent,
        stackWidth: stack.width,
        stackHeight: stack.height,
        primaryWidth: primary.width,
        primaryHeight: primary.height,
      };
      })();
    `);
    assert.equal(shown.hidden, false, 'Comparison window should be visible after toggle');
    assert.ok(shown.width >= 180, 'Sliding comparison window should have stable width');
    assert.ok(shown.height >= 210, 'Comparison window should have stable height');
    assert.equal(shown.instrumentValue, 'NQ', 'Hidden legacy comparison instrument control should retain descriptor value');
    assert.equal(shown.timeframeValue, '60', 'Hidden legacy comparison timeframe control should retain descriptor value');
    assert.equal(shown.headerDisplay, 'none', 'Pane mode should hide legacy comparison header');
    assert.equal(shown.railDisplay, 'none', 'Pane mode should hide legacy comparison drag rail');
    assert.equal(shown.instrumentDisplay, 'none', 'Pane mode should hide legacy per-window instrument control');
    assert.equal(shown.timeframeDisplay, 'none', 'Pane mode should hide legacy per-window timeframe control');
    assert.equal(shown.closeDisplay, 'none', 'Pane mode should hide legacy Close action');
    assert.equal(shown.resetDisplay, 'none', 'Pane mode should hide legacy Reset action');
    assert.equal(shown.overlaySyncValue, 'sync', 'Comparison drawings should default to Sync');
    assert.equal(shown.overlaySyncDisplay, 'none', 'Pane mode should hide legacy Drawings control');
    assert.deepEqual(shown.overlaySyncOptions, [
      { value: 'sync', text: 'Sync' },
      { value: 'no-sync', text: 'No Sync' },
    ]);
    assert.equal(shown.placeholderTitle, '', 'Pane 2 empty state title should stay quiet');
    assert.equal(shown.statusText, '', 'Pane 2 empty state status should stay quiet');
    assert.equal(shown.placeholderHidden, true, 'Pane 2 ordinary empty state should not show central placeholder text');
    assert.equal(shown.overlayStatusText, 'Pane 1 overlays waiting for data', 'Pane 1 overlay empty state should not use old comparison wording');
    const twoPaneLayout = await evaluate(client, `
      (() => {
        const legend = document.querySelector('#ohlc-legend');
        legend.innerHTML = '<span class="ohlc-label">O</span><span class="ohlc-value">1.00</span>';
        const legendRect = legend.getBoundingClientRect();
        const root = document.querySelector('#comparison-window-root').getBoundingClientRect();
        const winRect = document.querySelector('#comparison-window').getBoundingClientRect();
        const primary = document.querySelector('#primary-chart-panel').getBoundingClientRect();
        const stack = document.querySelector('#chart-stack').getBoundingClientRect();
        const divider = document.querySelector('[data-chart-pane-divider]').getBoundingClientRect();
        return {
          stackTwoPane: document.querySelector('#chart-stack').classList.contains('chart-stack-two-pane'),
          rootPane: document.querySelector('#comparison-window-root').classList.contains('comparison-pane-root'),
          dividerVisible: !document.querySelector('[data-chart-pane-divider]').hidden,
          dividerWidth: divider.width,
          primaryLeft: primary.left,
          primaryRight: primary.right,
          primaryWidth: primary.width,
          rootLeft: root.left,
          rootRight: root.right,
          rootWidth: root.width,
          stackWidth: stack.width,
          legendLeft: legendRect.left,
          windowLeft: winRect.left,
          windowRight: winRect.right,
          windowWidth: winRect.width,
          cssOffset: getComputedStyle(document.querySelector('#chart-stack')).getPropertyValue('--primary-legend-left-offset').trim(),
        };
      })();
    `);
    assert.equal(twoPaneLayout.stackTwoPane, true, 'Comparison should switch chart stack into two-pane layout');
    assert.equal(twoPaneLayout.rootPane, true, 'Comparison root should be a pane flex child');
    assert.equal(twoPaneLayout.dividerVisible, true, 'Two-pane layout should show a draggable pane divider');
    assert.ok(twoPaneLayout.dividerWidth >= 1, 'Pane divider should have a visible center line');
    assert.ok(
      Math.abs(twoPaneLayout.primaryWidth - twoPaneLayout.rootWidth) <= 4,
      `Primary and comparison panes should be equal width: ${JSON.stringify(twoPaneLayout)}`
    );
    assert.ok(
      Math.abs(twoPaneLayout.rootLeft - twoPaneLayout.primaryRight) <= 3,
      `Comparison pane should sit to the right of primary pane: ${JSON.stringify(twoPaneLayout)}`
    );
    assert.equal(twoPaneLayout.cssOffset, '0px', 'Primary legend should not need overlay offset in two-pane layout');

    const paneDividerResize = await evaluate(client, `
      (() => {
        const divider = document.querySelector('[data-chart-pane-divider]');
        const stack = document.querySelector('#chart-stack');
        const primary = document.querySelector('#primary-chart-panel');
        const comparison = document.querySelector('#comparison-window-root');
        const stackRect = stack.getBoundingClientRect();
        const before = {
          primary: primary.getBoundingClientRect().width,
          comparison: comparison.getBoundingClientRect().width,
        };
        const pointerId = 33;
        divider.dispatchEvent(new PointerEvent('pointerdown', {
          bubbles: true,
          cancelable: true,
          button: 0,
          pointerId,
          clientX: stackRect.left + stackRect.width / 2,
          clientY: stackRect.top + 40,
        }));
        divider.dispatchEvent(new PointerEvent('pointermove', {
          bubbles: true,
          cancelable: true,
          button: 0,
          pointerId,
          clientX: stackRect.left + stackRect.width * 0.62,
          clientY: stackRect.top + 40,
        }));
        divider.dispatchEvent(new PointerEvent('pointerup', {
          bubbles: true,
          cancelable: true,
          button: 0,
          pointerId,
          clientX: stackRect.left + stackRect.width * 0.62,
          clientY: stackRect.top + 40,
        }));
        const afterDrag = {
          primary: primary.getBoundingClientRect().width,
          comparison: comparison.getBoundingClientRect().width,
          cssWidth: getComputedStyle(stack).getPropertyValue('--primary-pane-width').trim(),
        };
        divider.dispatchEvent(new MouseEvent('dblclick', { bubbles: true, cancelable: true }));
        const afterReset = {
          primary: primary.getBoundingClientRect().width,
          comparison: comparison.getBoundingClientRect().width,
          cssWidth: getComputedStyle(stack).getPropertyValue('--primary-pane-width').trim(),
        };
        return { before, afterDrag, afterReset };
      })();
    `);
    assert.ok(
      paneDividerResize.afterDrag.primary > paneDividerResize.before.primary + 40,
      `Dragging divider right should widen primary pane: ${JSON.stringify(paneDividerResize)}`
    );
    assert.ok(
      paneDividerResize.afterDrag.comparison < paneDividerResize.before.comparison - 40,
      `Dragging divider right should narrow comparison pane: ${JSON.stringify(paneDividerResize)}`
    );
    assert.match(paneDividerResize.afterDrag.cssWidth, /^62\.00%$/, 'Pane divider drag should set primary pane width CSS variable');
    assert.ok(
      Math.abs(paneDividerResize.afterReset.primary - paneDividerResize.afterReset.comparison) <= 4,
      `Double-clicking divider should restore equal pane widths: ${JSON.stringify(paneDividerResize)}`
    );

    const viewportControlsPlacement = await evaluate(client, `
      (() => {
        const primaryControls = document.querySelector('#viewport-controls');
        const comparisonControls = document.querySelector('#comparison-viewport-controls');
        const primaryRect = primaryControls.getBoundingClientRect();
        const comparisonRect = comparisonControls.getBoundingClientRect();
        const primary = document.querySelector('#primary-chart-panel').getBoundingClientRect();
        const win = document.querySelector('#comparison-window').getBoundingClientRect();
        const primaryCenter = primaryRect.left + primaryRect.width / 2;
        const comparisonCenter = comparisonRect.left + comparisonRect.width / 2;
        return {
          primaryButtonCount: primaryControls.querySelectorAll('button').length,
          comparisonButtonCount: comparisonControls.querySelectorAll('button').length,
          comparisonDisabledCount: comparisonControls.querySelectorAll('button:disabled').length,
          primaryCenter,
          expectedPrimaryCenter: primary.left + primary.width / 2,
          comparisonCenter,
          expectedComparisonCenter: win.left + win.width / 2,
        };
      })();
    `);
    assert.ok(
      Math.abs(viewportControlsPlacement.primaryCenter - viewportControlsPlacement.expectedPrimaryCenter) <= 3,
      `Primary viewport controls should center in visible main area: ${JSON.stringify(viewportControlsPlacement)}`
    );
    assert.ok(
      Math.abs(viewportControlsPlacement.comparisonCenter - viewportControlsPlacement.expectedComparisonCenter) <= 3,
      `Comparison viewport controls should center inside comparison window: ${JSON.stringify(viewportControlsPlacement)}`
    );
    assert.equal(viewportControlsPlacement.comparisonButtonCount, 5, 'Comparison viewport controls should render zoom/reset/scroll buttons');
    const paneSyncButtons = await evaluate(client, `
      (() => {
        const buttons = [...document.querySelectorAll('.chart-pane-sync-toggle')];
        const primary = document.querySelector('#primary-chart-panel').getBoundingClientRect();
        const comparison = document.querySelector('#comparison-window-root').getBoundingClientRect();
        return {
          count: buttons.length,
          labels: buttons.map((button) => button.textContent),
          badgeParents: buttons.map((button) => button.closest('[data-pane-badge]')?.dataset.paneBadge),
          offsets: buttons.map((button) => {
            const rect = button.getBoundingClientRect();
            const paneRect = button.dataset.paneSyncToggle === 'pane-1' ? primary : comparison;
            return {
              paneId: button.dataset.paneSyncToggle,
              left: Math.round(rect.left - paneRect.left),
              right: Math.round(rect.right - paneRect.left),
            };
          }),
        };
      })();
    `);
    assert.equal(paneSyncButtons.count, 2, 'Each pane should render a pane-level Sync/No Sync button');
    assert.deepEqual(paneSyncButtons.labels, ['Sync', 'Sync'], 'Both panes should default to Sync');
    assert.deepEqual(paneSyncButtons.badgeParents, ['pane-1', 'pane-2'], 'Pane Sync buttons should live inside their pane badges');
    assert.ok(
      paneSyncButtons.offsets.every((offset) => offset.left >= 80 && offset.right <= 210),
      `Pane Sync buttons should stay in the left badge area, away from right price axes: ${JSON.stringify(paneSyncButtons.offsets)}`
    );
    const paneBadges = await evaluate(client, `
      (() => {
        const primaryBadge = document.querySelector('[data-pane-badge="pane-1"]');
        const comparisonBadge = document.querySelector('[data-pane-badge="pane-2"]');
        const comparisonInfo = document.querySelector('#comparison-chart-info');
        return {
          primaryText: primaryBadge?.querySelector('[data-pane-badge-label="pane-1"]')?.textContent,
          comparisonText: comparisonBadge?.querySelector('[data-pane-badge-label="pane-2"]')?.textContent,
          primaryParent: primaryBadge?.parentElement?.id,
          comparisonParent: comparisonBadge?.parentElement?.id,
          comparisonInfoDisplay: getComputedStyle(comparisonInfo).display,
        };
      })();
    `);
    assert.deepEqual(paneBadges, {
      primaryText: 'Pane 2 · NQ 1H',
      comparisonText: 'Pane 1 · NQ 1H',
      primaryParent: 'primary-chart-panel',
      comparisonParent: 'comparison-window-root',
      comparisonInfoDisplay: 'none',
    }, 'Both panes should render a unified Symbol/TF badge and hide old comparison-only info chrome');
    const customPaneLabels = await evaluate(client, `
      (async () => {
        const paneStore = await import('/src/chart-panes/chart-pane-store.js');
        paneStore.setPaneLabel('pane-1', 'Execution');
        paneStore.setPaneLabel('pane-2', 'Context');
        await new Promise((resolve) => requestAnimationFrame(resolve));
        const renamed = {
          primary: document.querySelector('[data-pane-badge-label="pane-1"]')?.textContent,
          comparison: document.querySelector('[data-pane-badge-label="pane-2"]')?.textContent,
        };
        paneStore.setPaneLabel('pane-1', 'Pane 2');
        paneStore.setPaneLabel('pane-2', 'Pane 1');
        await new Promise((resolve) => requestAnimationFrame(resolve));
        return {
          renamed,
          restored: {
            primary: document.querySelector('[data-pane-badge-label="pane-1"]')?.textContent,
            comparison: document.querySelector('[data-pane-badge-label="pane-2"]')?.textContent,
          },
        };
      })();
    `);
    assert.deepEqual(customPaneLabels.renamed, {
      primary: 'Execution · NQ 1H',
      comparison: 'Context · NQ 1H',
    }, 'Pane badges should support custom pane labels');
    assert.deepEqual(customPaneLabels.restored, {
      primary: 'Pane 2 · NQ 1H',
      comparison: 'Pane 1 · NQ 1H',
    }, 'Pane labels should restore for remaining regression coverage');
    const activePaneFocus = await evaluate(client, `
      (() => {
        const comparisonRoot = document.querySelector('#comparison-window-root');
        comparisonRoot.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
        const comparisonActive = comparisonRoot.classList.contains('chart-pane-active');
        document.querySelector('#tfSelect').value = '1';
        document.querySelector('#tfSelect').dispatchEvent(new Event('change', { bubbles: true }));
        const toolbarAfterComparison = {
          instrument: document.querySelector('#primaryInstrumentSelect').value,
          timeframe: document.querySelector('#tfSelect').value,
        };
        const comparisonBadgeAfterTf = document.querySelector('[data-pane-badge-label="pane-2"]')?.textContent;
        document.querySelector('#tfSelect').value = '60';
        document.querySelector('#tfSelect').dispatchEvent(new Event('change', { bubbles: true }));
        const comparisonBadgeRestored = document.querySelector('[data-pane-badge-label="pane-2"]')?.textContent;
        const primary = document.querySelector('#primary-chart-panel');
        primary.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
        return {
          comparisonActive,
          primaryActive: primary.classList.contains('chart-pane-active'),
          toolbarAfterComparison,
          comparisonBadgeAfterTf,
          comparisonBadgeRestored,
          toolbarAfterPrimary: {
            instrument: document.querySelector('#primaryInstrumentSelect').value,
            timeframe: document.querySelector('#tfSelect').value,
          },
        };
      })();
    `);
    assert.equal(activePaneFocus.comparisonActive, true, 'Clicking comparison pane should make it active');
    assert.deepEqual(activePaneFocus.toolbarAfterComparison, { instrument: 'NQ', timeframe: '1' }, 'Toolbar should update active comparison pane timeframe');
    assert.equal(activePaneFocus.comparisonBadgeAfterTf, 'Pane 1 · NQ 1M', 'Comparison badge should update when active pane timeframe changes');
    assert.equal(activePaneFocus.comparisonBadgeRestored, 'Pane 1 · NQ 1H', 'Comparison badge should restore after active pane timeframe returns to 1H');
    assert.equal(activePaneFocus.primaryActive, true, 'Clicking primary pane should make it active');
    assert.deepEqual(activePaneFocus.toolbarAfterPrimary, { instrument: 'NQ', timeframe: '60' }, 'Toolbar should follow active primary pane');
    const allNoSync = await evaluate(client, `
      (() => {
        const buttons = [...document.querySelectorAll('.chart-pane-sync-toggle')];
        buttons.forEach((button) => button.click());
        const labelsAfterOff = buttons.map((button) => button.textContent);
        buttons.forEach((button) => button.click());
        return {
          labelsAfterOff,
          labelsRestored: buttons.map((button) => button.textContent),
        };
      })();
    `);
    assert.deepEqual(allNoSync.labelsAfterOff, ['No Sync', 'No Sync'], 'Both panes may be No Sync at the same time');
    assert.deepEqual(allNoSync.labelsRestored, ['Sync', 'Sync'], 'Pane sync buttons should toggle back independently');

    const nativePriceAxisLayout = await evaluate(client, `
      (() => {
        const win = document.querySelector('#comparison-window').getBoundingClientRect();
        const canvas = document.querySelector('#comparison-chart-canvas').getBoundingClientRect();
        return {
          customAxisExists: Boolean(document.querySelector('[data-comparison-boundary-price-axis]')),
          canvasRight: canvas.right,
          windowRight: win.right,
          canvasWidth: canvas.width,
          windowWidth: win.width,
        };
      })();
    `);
    assert.equal(nativePriceAxisLayout.customAxisExists, false, 'Comparison should use native Lightweight Charts price axis, not a custom DOM axis');
    assert.ok(
      Math.abs(nativePriceAxisLayout.canvasRight - nativePriceAxisLayout.windowRight) <= 2,
      `Native comparison chart should end at the Comparison/Main boundary: ${JSON.stringify(nativePriceAxisLayout)}`
    );
    assert.ok(
      Math.abs(nativePriceAxisLayout.canvasWidth - nativePriceAxisLayout.windowWidth) <= 2,
      `Native comparison chart width should match the visible Comparison window: ${JSON.stringify(nativePriceAxisLayout)}`
    );
    const inspectorLayout = await evaluate(client, `
      (async () => {
        const inspector = document.querySelector('#inspector-sidebar');
        inspector?.classList.add('open');
        await new Promise((resolve) => setTimeout(resolve, 260));
        const win = document.querySelector('#comparison-window').getBoundingClientRect();
        const canvas = document.querySelector('#comparison-chart-canvas').getBoundingClientRect();
        const stack = document.querySelector('#chart-stack').getBoundingClientRect();
        inspector?.classList.remove('open');
        await new Promise((resolve) => setTimeout(resolve, 180));
        return {
          inspectorExists: Boolean(inspector),
          stackWidth: stack.width,
          canvasRight: canvas.right,
          windowRight: win.right,
        };
      })();
    `);
    assert.equal(inspectorLayout.inspectorExists, true, 'Inspector sidebar should exist for layout regression');
    assert.ok(
      Math.abs(inspectorLayout.canvasRight - inspectorLayout.windowRight) <= 2,
      `Native comparison price axis should follow layout resize from Inspector: ${JSON.stringify(inspectorLayout)}`
    );
    const legacyPaneActions = await evaluate(client, `
      (() => {
        const close = document.querySelector('[data-comparison-close]');
        const reset = document.querySelector('[data-comparison-reset]');
        const instrument = document.querySelector('[data-comparison-instrument]');
        const timeframe = document.querySelector('[data-comparison-timeframe]');
        const overlaySync = document.querySelector('[data-comparison-overlay-sync]');
        const header = document.querySelector('.comparison-window-header');
        const rail = document.querySelector('.comparison-window-rail');
        return {
          headerDisplay: getComputedStyle(header).display,
          railDisplay: getComputedStyle(rail).display,
          closeDisplay: getComputedStyle(close).display,
          resetDisplay: getComputedStyle(reset).display,
          instrumentDisplay: getComputedStyle(instrument.closest('label')).display,
          timeframeDisplay: getComputedStyle(timeframe.closest('label')).display,
          overlaySyncDisplay: getComputedStyle(overlaySync.closest('label')).display,
        };
      })();
    `);
    assert.deepEqual(legacyPaneActions, {
      headerDisplay: 'none',
      railDisplay: 'none',
      closeDisplay: 'none',
      resetDisplay: 'none',
      instrumentDisplay: 'none',
      timeframeDisplay: 'none',
      overlaySyncDisplay: 'none',
    }, 'Pane mode should hide legacy window-specific controls');

    const handleContextMenu = await evaluate(client, `
      (() => {
        const handle = document.querySelector('.comparison-window-left-handle');
        const event = new MouseEvent('contextmenu', { bubbles: true, cancelable: true });
        const dispatchResult = handle.dispatchEvent(event);
        return {
          dispatchResult,
          defaultPrevented: event.defaultPrevented,
          menuHidden: document.querySelector('#comparison-context-menu').hidden,
        };
      })();
    `);
    assert.equal(handleContextMenu.dispatchResult, false, 'Left handle contextmenu should be cancelled');
    assert.equal(handleContextMenu.defaultPrevented, true, 'Left handle contextmenu should prevent default');
    assert.equal(handleContextMenu.menuHidden, true, 'Left handle contextmenu should not open comparison menu');

    const stageDrag = await evaluate(client, `
      (() => {
      const before = document.querySelector('#comparison-window').getBoundingClientRect();
      return { x: before.left + before.width / 2, y: before.top + before.height / 2, beforeLeft: before.left, beforeTop: before.top };
      })();
    `);
    await client.send('Input.dispatchMouseEvent', {
      type: 'mousePressed',
      x: stageDrag.x,
      y: stageDrag.y,
      button: 'left',
      clickCount: 1,
    });
    await client.send('Input.dispatchMouseEvent', {
      type: 'mouseMoved',
      x: stageDrag.x + 90,
      y: stageDrag.y + 50,
      button: 'left',
    });
    await client.send('Input.dispatchMouseEvent', {
      type: 'mouseReleased',
      x: stageDrag.x + 90,
      y: stageDrag.y + 50,
      button: 'left',
      clickCount: 1,
    });
    const stageMoved = await evaluate(client, `
      (() => {
      const after = document.querySelector('#comparison-window').getBoundingClientRect();
      return { beforeLeft: ${stageDrag.beforeLeft}, afterLeft: after.left, beforeTop: ${stageDrag.beforeTop}, afterTop: after.top };
      })();
    `);
    assert.equal(stageMoved.afterLeft, stageMoved.beforeLeft, 'Dragging inside chart stage should not move outer window');
    assert.equal(stageMoved.afterTop, stageMoved.beforeTop, 'Dragging inside chart stage should not move outer window vertically');
}
