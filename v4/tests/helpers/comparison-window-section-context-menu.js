import assert from 'node:assert/strict';
import { evaluate } from './browser-cdp-client.js';

export async function verifyComparisonContextMenu({ client }) {
    const contextMenuResult = await evaluate(client, `
      (async () => {
        const { getComparisonChartContext } = await import('/src/chart/chart-context.js');
        const context = getComparisonChartContext();
        const chartEl = document.querySelector('#comparison-chart-canvas');
        const rect = chartEl.getBoundingClientRect();
        const bars = context.getDisplayBars();
        const first = bars[0];
        const last = bars[bars.length - 1];
        const pdaStore = await import('/src/pda/pda-store.js');
        const segmentStore = await import('/src/segment/segment-store.js');
        pdaStore.loadAnnotations([]);
        segmentStore.loadSegments([]);
        const openAt = (bar, price) => {
          const x = context.timeToCoordinate(bar.timestamp);
          const y = context.priceToCoordinate(price);
          chartEl.dispatchEvent(new MouseEvent('contextmenu', {
            bubbles: true,
            cancelable: true,
            clientX: rect.left + x,
            clientY: rect.top + y,
          }));
        };
        const openBlankAt = () => {
          const shellRect = document.querySelector('#comparison-window').getBoundingClientRect();
          const barXs = bars
            .map((bar) => context.timeToCoordinate(bar.timestamp))
            .filter((x) => Number.isFinite(Number(x)));
          const minBarX = Math.min(...barXs);
          const maxBarX = Math.max(...barXs);
          const localX = maxBarX + 80 < shellRect.width - 12
            ? maxBarX + 80
            : Math.max(12, minBarX - 80);
          chartEl.dispatchEvent(new MouseEvent('contextmenu', {
            bubbles: true,
            cancelable: true,
            clientX: rect.left + localX,
            clientY: rect.top + rect.height / 2,
          }));
        };

        openBlankAt();
        const blankMenu = document.querySelector('#comparison-context-menu');
        const locateSubmenu = blankMenu.querySelector('.pda-menu-submenu');
        const locateLabels = [...locateSubmenu.querySelectorAll('.pda-submenu-panel .pda-menu-item')]
          .map((item) => item.textContent.trim());
        const blankMenuRect = blankMenu.getBoundingClientRect();
        const chartRect = chartEl.getBoundingClientRect();
        const blankMenuTopElement = document.elementFromPoint(
          blankMenuRect.left + 10,
          blankMenuRect.top + 10
        );
        const blankMenuReachable = Boolean(blankMenuTopElement?.closest('#comparison-context-menu'));
        const blankMenuConstrained = blankMenu.classList.contains('is-scroll-constrained');
        const blankMenuFitsVertically = blankMenuRect.bottom <= chartRect.bottom + 1;
        const blankObDisabled = document
          .querySelector('[data-pda-action="ob-last-bar"]')
          ?.hasAttribute('disabled');

        openAt(first, first.low);
        document.querySelector('[data-pda-action="bsl"]').click();
        await new Promise((resolve) => setTimeout(resolve, 350));

        openAt(bars[1], bars[1].close);
        document.querySelector('[data-pda-action="fvg"]').click();
        await new Promise((resolve) => setTimeout(resolve, 350));

        openAt(first, first.low);
        document.querySelector('[data-comparison-action="comparison-segment-start-low"]').click();
        await new Promise((resolve) => setTimeout(resolve, 100));

        openAt(last, last.high);
        document.querySelector('[data-comparison-action="comparison-segment-finish-high"]').click();
        await new Promise((resolve) => setTimeout(resolve, 600));

        const orderActive = await import('/src/order/order-review-active.js');
        orderActive.createChartReviewSet({
          bar: first,
          price: first.close,
          timeframe: '1H',
        });
        openAt(bars[1], bars[1].close);
        const submenuEntries = [...document.querySelectorAll('#comparison-context-menu .pda-menu-submenu')]
          .map((submenu) => ({
            submenu,
            label: submenu.querySelector('.pda-menu-submenu-trigger')?.textContent.trim() || '',
          }));
        const orderSetupSubmenu = submenuEntries
          .find((entry) => entry.label.startsWith('Order Setup ·'))
          ?.submenu;
        const liveRecordSubmenu = submenuEntries
          .find((entry) => entry.label === 'Live Records')
          ?.submenu;
        orderSetupSubmenu?.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
        orderSetupSubmenu?.querySelector('.pda-menu-submenu-trigger')?.focus();
        await new Promise((resolve) => setTimeout(resolve, 50));
        const orderSetupPanel = orderSetupSubmenu?.querySelector('.pda-submenu-panel');
        const orderSetupPanelRect = orderSetupPanel?.getBoundingClientRect();
        const orderSetupPanelTopElement = orderSetupPanelRect
          ? document.elementFromPoint(orderSetupPanelRect.left + 10, orderSetupPanelRect.top + 10)
          : null;
        const orderSetupPanelVisible = Boolean(
          orderSetupSubmenu?.classList.contains('is-open') &&
            orderSetupPanelRect?.width > 0 &&
            orderSetupPanelRect?.height > 0 &&
            orderSetupPanelTopElement?.closest('.pda-submenu-panel') === orderSetupPanel
        );
        const orderSetupLabels = [...(orderSetupPanel?.querySelectorAll('.pda-menu-item') || [])]
          .map((item) => item.textContent.trim());
        liveRecordSubmenu?.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
        liveRecordSubmenu?.querySelector('.pda-menu-submenu-trigger')?.focus();
        await new Promise((resolve) => setTimeout(resolve, 50));
        const liveRecordPanel = liveRecordSubmenu?.querySelector('.pda-submenu-panel');
        const liveRecordPanelRect = liveRecordPanel?.getBoundingClientRect();
        const liveRecordPanelVisible = Boolean(
          liveRecordSubmenu?.classList.contains('is-open') &&
            liveRecordPanelRect?.width > 0 &&
            liveRecordPanelRect?.height > 0
        );
        const liveRecordLabels = [...(liveRecordPanel?.querySelectorAll('.pda-menu-item') || [])]
          .map((item) => item.textContent.trim());
        const oldEvidenceActionExists = Boolean(
          document.querySelector('[data-comparison-action="comparison-order-add-bar-evidence"]')
        );

        const annotations = pdaStore.getAnnotations();
        const segments = segmentStore.getSegments();
        const comparisonPda = annotations.find((annotation) => annotation.sourceChartId === 'comparison-window');
        const comparisonFvg = annotations.find((annotation) => annotation.sourceChartId === 'comparison-window' && annotation.type === 'fvg');
        const comparisonSegment = segments.find((segment) => segment.sourceChartId === 'comparison-window');
        const pdaHitTest = await import('/src/pda/pda-hit-test.js');
        const segmentHitTest = await import('/src/segment/segment-hit-test.js');
        const chartContexts = await import('/src/chart/chart-context.js');
        const primaryContext = chartContexts.getPrimaryChartContext();
        const comparisonContext = chartContexts.getComparisonChartContext();
        const pdaHitX = comparisonContext.timeToCoordinate(first.timestamp);
        const pdaHitY = comparisonContext.priceToCoordinate(first.high);
        const primaryPdaHitX = primaryContext.timeToCoordinate(first.timestamp);
        const primaryPdaHitY = primaryContext.priceToCoordinate(first.high);
        const comparisonPdaHit = pdaHitTest.hitTestPdaAnnotations({
          x: pdaHitX,
          y: pdaHitY,
          context: comparisonContext,
        });
        const primaryPdaHit = pdaHitTest.hitTestPdaAnnotations({
          x: primaryPdaHitX,
          y: primaryPdaHitY,
          context: primaryContext,
        });
        const segmentHitX = comparisonContext.timeToCoordinate(last.timestamp);
        const segmentHitY = comparisonContext.priceToCoordinate(last.high);
        const primarySegmentHitX = primaryContext.timeToCoordinate(last.timestamp);
        const primarySegmentHitY = primaryContext.priceToCoordinate(last.high);
        const comparisonSegmentHit = segmentHitTest.hitTestSegments({
          x: segmentHitX,
          y: segmentHitY,
          context: comparisonContext,
        });
        const primarySegmentHit = segmentHitTest.hitTestSegments({
          x: primarySegmentHitX,
          y: primarySegmentHitY,
          context: primaryContext,
        });
        return {
          menuExists: Boolean(document.querySelector('#comparison-context-menu')),
          menuReachable: blankMenuReachable,
          locateLabels,
          menuConstrained: blankMenuConstrained,
          menuFitsVertically: blankMenuFitsVertically,
          menuGeometry: {
            menuTop: blankMenuRect.top,
            menuBottom: blankMenuRect.bottom,
            menuHeight: blankMenuRect.height,
            chartTop: chartRect.top,
            chartBottom: chartRect.bottom,
            chartHeight: chartRect.height,
            maxHeight: getComputedStyle(blankMenu).maxHeight,
            overflowY: getComputedStyle(blankMenu).overflowY,
          },
          blankObDisabled,
          orderSetupPanelVisible,
          orderSetupLabels,
          liveRecordPanelVisible,
          liveRecordLabels,
          oldEvidenceActionExists,
          sourceIsolation: {
            comparisonPdaHit: Boolean(comparisonPda && comparisonPdaHit?.id === comparisonPda.id),
            primaryPdaHit: Boolean(comparisonPda && primaryPdaHit?.id === comparisonPda.id),
            comparisonSegmentHit: Boolean(comparisonSegment && comparisonSegmentHit?.id === comparisonSegment.id),
            primarySegmentHit: Boolean(comparisonSegment && primarySegmentHit?.id === comparisonSegment.id),
          },
          comparisonPda: comparisonPda ? {
            type: comparisonPda.type,
            sourceChartId: comparisonPda.sourceChartId,
            sourceChartLabel: comparisonPda.sourceChartLabel,
            sourceInstrument: comparisonPda.sourceInstrument,
            sourceTimeframe: comparisonPda.sourceTimeframe,
            sourceContext: comparisonPda.sourceContext,
          } : null,
          comparisonFvg: comparisonFvg ? {
            type: comparisonFvg.type,
            direction: comparisonFvg.direction,
            sourceChartId: comparisonFvg.sourceChartId,
            sourceInstrument: comparisonFvg.sourceInstrument,
            sourceTimeframe: comparisonFvg.sourceTimeframe,
            sourceContext: comparisonFvg.sourceContext,
          } : null,
          comparisonSegment: comparisonSegment ? {
            sourceChartId: comparisonSegment.sourceChartId,
            sourceChartLabel: comparisonSegment.sourceChartLabel,
            sourceInstrument: comparisonSegment.sourceInstrument,
            sourceTimeframe: comparisonSegment.sourceTimeframe,
            sourceContext: comparisonSegment.sourceContext,
            direction: comparisonSegment.direction,
          } : null,
        };
      })();
    `);
    assert.equal(contextMenuResult.menuExists, true, 'Comparison context menu should exist');
    assert.equal(contextMenuResult.menuReachable, true, 'Comparison context menu should render above the chart canvas');
    assert.ok(contextMenuResult.locateLabels.includes('Time in Pane 2'), 'Comparison context menu should use pane terminology for cross-pane locate');
    assert.ok(contextMenuResult.locateLabels.includes('Copy Pane 1 Time'), 'Comparison context menu should use pane terminology for copy time');
    assert.equal(contextMenuResult.locateLabels.includes('Time in Main'), false, 'Comparison context menu should not show old Main locate wording');
    assert.equal(contextMenuResult.locateLabels.includes('Copy Comparison Time'), false, 'Comparison context menu should not show old Comparison copy wording');
    assert.equal(contextMenuResult.menuConstrained, true, 'Comparison context menu should become scroll constrained in a compact window');
    assert.equal(
      contextMenuResult.menuFitsVertically,
      true,
      `Comparison context menu should stay inside the chart viewport: ${JSON.stringify(contextMenuResult.menuGeometry)}`
    );
    assert.equal(contextMenuResult.blankObDisabled, true, 'Comparison OB Last Bar should be disabled without a comparison bar');
    assert.equal(contextMenuResult.orderSetupPanelVisible, true, 'Pane 1 Order Setup submenu should open');
    assert.ok(
      contextMenuResult.orderSetupLabels.includes('Create Bullish Setup Here'),
      'Pane 1 should reuse the shared Order Setup creation menu'
    );
    assert.ok(
      contextMenuResult.orderSetupLabels.includes('Set Entry Here'),
      'Pane 1 should reuse the shared Order Setup edit menu'
    );
    assert.equal(contextMenuResult.liveRecordPanelVisible, true, 'Pane 1 Live Records submenu should open');
    assert.ok(
      contextMenuResult.liveRecordLabels.includes('Create Bullish Live Record Here'),
      'Pane 1 should reuse the shared Live Records creation menu'
    );
    assert.ok(
      contextMenuResult.liveRecordLabels.includes('Set Result / Exit Here'),
      'Pane 1 should reuse the shared Live Records edit menu'
    );
    assert.equal(contextMenuResult.oldEvidenceActionExists, false, 'Pane 1 should not keep the old comparison-only evidence action');
    assert.deepEqual(contextMenuResult.sourceIsolation, {
      comparisonPdaHit: true,
      primaryPdaHit: false,
      comparisonSegmentHit: true,
      primarySegmentHit: false,
    }, 'Pane 1 PDA/Segment should hit only the Pane 1 chart context');
    assert.equal(contextMenuResult.comparisonPda?.sourceChartLabel, 'Pane 1', 'Pane 1 PDA creation should keep the visible pane label');
    assert.equal(contextMenuResult.comparisonFvg?.sourceChartId, 'comparison-window', 'Pane 1 FVG creation should keep the chart source');
    assert.equal(contextMenuResult.comparisonSegment?.sourceChartLabel, 'Pane 1', 'Pane 1 Segment creation should keep the visible pane label');
}
