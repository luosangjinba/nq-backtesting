import assert from 'node:assert/strict';
import { evaluate } from './browser-cdp-client.js';

export async function verifyComparisonOverlayPolicy({ client }) {
    const syncedHitResult = await evaluate(client, `
      (async () => {
        const comparisonStore = await import('/src/comparison/comparison-window-store.js');
        const pdaStore = await import('/src/pda/pda-store.js');
        const segmentStore = await import('/src/segment/segment-store.js');
        const orderStore = await import('/src/order/order-review-store.js');
        const liveStore = await import('/src/live-record/live-record-store.js');
        const pdaHitTest = await import('/src/pda/pda-hit-test.js');
        const segmentHitTest = await import('/src/segment/segment-hit-test.js');
        const orderHitTest = await import('/src/order/order-setup-hit-test.js');
        const liveHitTest = await import('/src/live-record/live-record-hit-test.js');
        const pdaSelection = await import('/src/pda/pda-selection.js');
        const segmentSelection = await import('/src/segment/segment-selection.js');
        const paneStore = await import('/src/chart-panes/chart-pane-store.js');
        const chartContexts = await import('/src/chart/chart-context.js');
        const primaryContext = chartContexts.getPrimaryChartContext();
        const primaryBars = primaryContext.getDisplayBars();
        const first = primaryBars[0];
        const last = primaryBars[primaryBars.length - 1];
        comparisonStore.setComparisonInstrument('NQ');
        comparisonStore.setComparisonTimeframe(1);
        comparisonStore.setComparisonOverlaySyncMode('sync');
        comparisonStore.setComparisonBars(primaryBars, {
          startTs: first.timestamp,
          endTs: last.timestamp,
        }, {
          start: '2026-06-12 09:30',
          end: '2026-06-12 10:30',
        });
        await new Promise((resolve) => setTimeout(resolve, 350));
        const comparisonContext = chartContexts.getComparisonChartContext();
        pdaStore.addAnnotation({
          id: 'sync-primary-pda',
          source: 'manual',
          type: 'bsl',
          sourceChartId: 'primary',
          sourceChartLabel: 'Pane 2',
          sourceInstrument: 'NQ',
          sourceTimeframe: 1,
          sourceContext: 'NQ 1M',
          timestamp: first.timestamp,
          canonicalTimestamp: first.timestamp,
          anchorTime: first.timestamp,
          price: first.high,
          display: { showLabel: true },
        });
        pdaStore.addAnnotation({
          id: 'sync-comparison-pda',
          source: 'manual',
          type: 'ssl',
          sourceChartId: 'comparison-window',
          sourceChartLabel: 'Pane 1',
          sourceInstrument: 'NQ',
          sourceTimeframe: 1,
          sourceContext: 'NQ 1M',
          timestamp: first.timestamp,
          canonicalTimestamp: first.timestamp,
          anchorTime: first.timestamp,
          price: first.low,
          display: { showLabel: true },
        });
        segmentStore.addSegment({
          id: 'sync-primary-segment',
          source: 'manual',
          sourceChartId: 'primary',
          sourceChartLabel: 'Pane 2',
          sourceInstrument: 'NQ',
          sourceTimeframe: 1,
          timeframe: 1,
          sourceContext: 'NQ 1M',
          direction: 'up',
          start: { timestamp: first.timestamp, time: first.timestamp, price: first.low },
          end: { timestamp: last.timestamp, time: last.timestamp, price: last.high },
          display: {},
        });
        segmentStore.addSegment({
          id: 'sync-comparison-segment',
          source: 'manual',
          sourceChartId: 'comparison-window',
          sourceChartLabel: 'Pane 1',
          sourceInstrument: 'NQ',
          sourceTimeframe: 1,
          timeframe: 1,
          sourceContext: 'NQ 1M',
          direction: 'down',
          start: { timestamp: first.timestamp, time: first.timestamp, price: first.high },
          end: { timestamp: last.timestamp, time: last.timestamp, price: last.low },
          display: {},
        });
        orderStore.addOrderReview({
          id: 'sync-primary-order',
          sourceChartId: 'primary',
          sourceChartLabel: 'Pane 2',
          instrument: 'NQ',
          setupThesis: {
            primaryEventTimestamp: first.timestamp,
            primaryEventTimeframe: '1M',
            primaryEventPrice: first.low,
          },
          entryPlan: {
            direction: 'long',
            entryTimestamp: first.timestamp,
            entryTimeframe: '1M',
            entryPrice: first.close,
            stopLossTimestamp: first.timestamp,
            stopLossTimeframe: '1M',
            stopLoss: first.low,
            targets: [],
          },
          display: {
            elementVisibility: {
              entry: true,
              stopLoss: true,
            },
          },
        });
        orderStore.addOrderReview({
          id: 'sync-comparison-order',
          sourceChartId: 'comparison-window',
          sourceChartLabel: 'Pane 1',
          instrument: 'NQ',
          setupThesis: {
            primaryEventTimestamp: first.timestamp,
            primaryEventTimeframe: '1M',
            primaryEventPrice: first.high,
          },
          entryPlan: {
            direction: 'short',
            entryTimestamp: first.timestamp,
            entryTimeframe: '1M',
            entryPrice: first.high,
            stopLossTimestamp: first.timestamp,
            stopLossTimeframe: '1M',
            stopLoss: first.close,
            targets: [],
          },
          display: {
            elementVisibility: {
              entry: true,
              stopLoss: true,
            },
          },
        });
        liveStore.addLiveRecord({
          id: 'sync-primary-live',
          sourceChartId: 'primary',
          sourceChartLabel: 'Pane 2',
          instrument: 'NQ',
          status: 'closed',
          direction: 'long',
          anchor: {
            timestamp: first.timestamp,
            timeframe: '1M',
            price: first.low,
          },
          execution: {
            entry: {
              role: 'entry',
              timestamp: first.timestamp,
              timeframe: '1M',
              price: first.open,
              complete: true,
            },
            stopLoss: {
              role: 'stopLoss',
              timestamp: first.timestamp,
              timeframe: '1M',
              price: first.low,
              complete: true,
            },
            targets: [],
          },
          result: {
            exitType: 'unknown',
          },
        });
        liveStore.addLiveRecord({
          id: 'sync-comparison-live',
          sourceChartId: 'comparison-window',
          sourceChartLabel: 'Pane 1',
          instrument: 'NQ',
          status: 'closed',
          direction: 'short',
          anchor: {
            timestamp: first.timestamp,
            timeframe: '1M',
            price: first.high,
          },
          execution: {
            entry: {
              role: 'entry',
              timestamp: first.timestamp,
              timeframe: '1M',
              price: first.high,
              complete: true,
            },
            stopLoss: {
              role: 'stopLoss',
              timestamp: first.timestamp,
              timeframe: '1M',
              price: first.close,
              complete: true,
            },
            targets: [],
          },
          result: {
            exitType: 'unknown',
          },
        });
        await new Promise((resolve) => setTimeout(resolve, 350));

        const comparisonPrimaryPdaHit = pdaHitTest.hitTestPdaAnnotations({
          x: comparisonContext.timeToCoordinate(first.timestamp),
          y: comparisonContext.priceToCoordinate(first.high),
          context: comparisonContext,
        });
        const primaryComparisonPdaHit = pdaHitTest.hitTestPdaAnnotations({
          x: primaryContext.timeToCoordinate(first.timestamp),
          y: primaryContext.priceToCoordinate(first.low),
          context: primaryContext,
        });
        const comparisonPrimarySegmentHit = segmentHitTest.hitTestSegments({
          x: comparisonContext.timeToCoordinate(last.timestamp),
          y: comparisonContext.priceToCoordinate(last.high),
          context: comparisonContext,
        });
        const primaryComparisonSegmentHit = segmentHitTest.hitTestSegments({
          x: primaryContext.timeToCoordinate(last.timestamp),
          y: primaryContext.priceToCoordinate(last.low),
          context: primaryContext,
        });
        const comparisonOrderHit = orderHitTest.hitTestOrderSetupElements({
          x: comparisonContext.timeToCoordinate(first.timestamp),
          y: comparisonContext.priceToCoordinate(first.close),
          context: comparisonContext,
        }).primaryHit;
        const comparisonLiveHit = liveHitTest.hitTestLiveRecordElements({
          x: comparisonContext.timeToCoordinate(first.timestamp),
          y: comparisonContext.priceToCoordinate(first.open),
          context: comparisonContext,
        }).primaryHit;
        const pdaCountBeforeDelete = pdaStore.getAnnotations()
          .filter((annotation) => annotation.id === 'sync-primary-pda')
          .length;
        pdaSelection.selectPda(comparisonPrimaryPdaHit?.id);
        const selectedPdaAfterComparisonHit = pdaSelection.getSelectedPda();
        pdaStore.updateAnnotation(comparisonPrimaryPdaHit?.id, { note: 'edited from comparison sync hit' });
        const editedPda = pdaStore.getAnnotationById('sync-primary-pda');
        pdaStore.deleteAnnotation('sync-primary-pda');
        const pdaCountAfterDelete = pdaStore.getAnnotations()
          .filter((annotation) => annotation.id === 'sync-primary-pda')
          .length;

        const segmentCountBeforeDelete = segmentStore.getSegments()
          .filter((segment) => segment.id === 'sync-primary-segment')
          .length;
        segmentSelection.selectSegment(comparisonPrimarySegmentHit?.id);
        const selectedSegmentAfterComparisonHit = segmentSelection.getSelectedSegment();
        segmentStore.updateSegment(comparisonPrimarySegmentHit?.id, { narrative: 'edited from comparison sync hit' });
        const editedSegment = segmentStore.getSegmentById('sync-primary-segment');
        segmentStore.deleteSegment('sync-primary-segment');
        const segmentCountAfterDelete = segmentStore.getSegments()
          .filter((segment) => segment.id === 'sync-primary-segment')
          .length;
        const result = {
          policySafe: (await import('/src/comparison/comparison-overlay-policy.js')).getComparisonOverlaySyncPolicy().safe,
          comparisonPrimaryPdaHit: comparisonPrimaryPdaHit?.id,
          primaryComparisonPdaHit: primaryComparisonPdaHit?.id,
          comparisonPrimarySegmentHit: comparisonPrimarySegmentHit?.id,
          primaryComparisonSegmentHit: primaryComparisonSegmentHit?.id,
          comparisonOrderHit: comparisonOrderHit ? {
            setupId: comparisonOrderHit.setupId,
            element: comparisonOrderHit.element,
          } : null,
          comparisonLiveHit: comparisonLiveHit ? {
            liveRecordId: comparisonLiveHit.liveRecordId,
            element: comparisonLiveHit.element,
          } : null,
          originalRouting: {
            selectedPdaId: selectedPdaAfterComparisonHit?.id,
            editedPdaNote: editedPda?.note,
            pdaCountBeforeDelete,
            pdaCountAfterDelete,
            selectedSegmentId: selectedSegmentAfterComparisonHit?.id,
            editedSegmentNarrative: editedSegment?.narrative,
            segmentCountBeforeDelete,
            segmentCountAfterDelete,
          },
        };
        comparisonStore.setComparisonOverlaySyncMode('sync');
        paneStore.setPaneSyncEnabled('pane-1', false);
        await new Promise((resolve) => setTimeout(resolve, 100));
        result.noSyncIsolation = {
          policySafe: (await import('/src/comparison/comparison-overlay-policy.js')).getComparisonOverlaySyncPolicy().safe,
          primaryPaneSyncEnabled: (await import('/src/comparison/comparison-overlay-policy.js')).getComparisonOverlaySyncPolicy().primaryPaneSyncEnabled,
          comparisonPaneSyncEnabled: (await import('/src/comparison/comparison-overlay-policy.js')).getComparisonOverlaySyncPolicy().comparisonPaneSyncEnabled,
          bothPanesNoSync: (await import('/src/comparison/comparison-overlay-policy.js')).getComparisonOverlaySyncPolicy().bothPanesNoSync,
          primaryComparisonPdaHit: pdaHitTest.hitTestPdaAnnotations({
            x: primaryContext.timeToCoordinate(first.timestamp),
            y: primaryContext.priceToCoordinate(first.low),
            context: primaryContext,
          })?.id || null,
          primaryComparisonSegmentHit: segmentHitTest.hitTestSegments({
            x: primaryContext.timeToCoordinate(last.timestamp),
            y: primaryContext.priceToCoordinate(last.low),
            context: primaryContext,
          })?.id || null,
          primaryComparisonOrderHit: orderHitTest.hitTestOrderSetupElements({
            x: primaryContext.timeToCoordinate(first.timestamp),
            y: primaryContext.priceToCoordinate(first.high),
            context: primaryContext,
          }).primaryHit?.setupId || null,
          primaryComparisonLiveHit: liveHitTest.hitTestLiveRecordElements({
            x: primaryContext.timeToCoordinate(first.timestamp),
            y: primaryContext.priceToCoordinate(first.high),
            context: primaryContext,
          }).primaryHit?.liveRecordId || null,
          comparisonPrimaryPdaHit: pdaHitTest.hitTestPdaAnnotations({
            x: comparisonContext.timeToCoordinate(first.timestamp),
            y: comparisonContext.priceToCoordinate(first.high),
            context: comparisonContext,
          })?.id || null,
          comparisonPrimarySegmentHit: segmentHitTest.hitTestSegments({
            x: comparisonContext.timeToCoordinate(last.timestamp),
            y: comparisonContext.priceToCoordinate(last.high),
            context: comparisonContext,
          })?.id || null,
        };
        paneStore.setPaneSyncEnabled('pane-1', true);
        paneStore.setPaneSyncEnabled('pane-2', false);
        await new Promise((resolve) => setTimeout(resolve, 100));
        result.pane1NoSyncIsolation = {
          policySafe: (await import('/src/comparison/comparison-overlay-policy.js')).getComparisonOverlaySyncPolicy().safe,
          primaryPaneSyncEnabled: (await import('/src/comparison/comparison-overlay-policy.js')).getComparisonOverlaySyncPolicy().primaryPaneSyncEnabled,
          comparisonPaneSyncEnabled: (await import('/src/comparison/comparison-overlay-policy.js')).getComparisonOverlaySyncPolicy().comparisonPaneSyncEnabled,
          bothPanesNoSync: (await import('/src/comparison/comparison-overlay-policy.js')).getComparisonOverlaySyncPolicy().bothPanesNoSync,
          primaryComparisonPdaHit: pdaHitTest.hitTestPdaAnnotations({
            x: primaryContext.timeToCoordinate(first.timestamp),
            y: primaryContext.priceToCoordinate(first.low),
            context: primaryContext,
          })?.id || null,
          primaryComparisonSegmentHit: segmentHitTest.hitTestSegments({
            x: primaryContext.timeToCoordinate(last.timestamp),
            y: primaryContext.priceToCoordinate(last.low),
            context: primaryContext,
          })?.id || null,
          comparisonLocalPdaHit: pdaHitTest.hitTestPdaAnnotations({
            x: comparisonContext.timeToCoordinate(first.timestamp),
            y: comparisonContext.priceToCoordinate(first.low),
            context: comparisonContext,
          })?.id || null,
          comparisonLocalSegmentHit: segmentHitTest.hitTestSegments({
            x: comparisonContext.timeToCoordinate(last.timestamp),
            y: comparisonContext.priceToCoordinate(last.low),
            context: comparisonContext,
          })?.id || null,
          comparisonLocalOrderHit: orderHitTest.hitTestOrderSetupElements({
            x: comparisonContext.timeToCoordinate(first.timestamp),
            y: comparisonContext.priceToCoordinate(first.high),
            context: comparisonContext,
          }).primaryHit?.setupId || null,
          comparisonLocalLiveHit: liveHitTest.hitTestLiveRecordElements({
            x: comparisonContext.timeToCoordinate(first.timestamp),
            y: comparisonContext.priceToCoordinate(first.high),
            context: comparisonContext,
          }).primaryHit?.liveRecordId || null,
        };
        paneStore.setPaneSyncEnabled('pane-1', false);
        paneStore.setPaneSyncEnabled('pane-2', false);
        await new Promise((resolve) => setTimeout(resolve, 100));
        result.allNoSyncIsolation = {
          policySafe: (await import('/src/comparison/comparison-overlay-policy.js')).getComparisonOverlaySyncPolicy().safe,
          primaryPaneSyncEnabled: (await import('/src/comparison/comparison-overlay-policy.js')).getComparisonOverlaySyncPolicy().primaryPaneSyncEnabled,
          comparisonPaneSyncEnabled: (await import('/src/comparison/comparison-overlay-policy.js')).getComparisonOverlaySyncPolicy().comparisonPaneSyncEnabled,
          bothPanesNoSync: (await import('/src/comparison/comparison-overlay-policy.js')).getComparisonOverlaySyncPolicy().bothPanesNoSync,
          primaryLocalPdaHit: pdaHitTest.hitTestPdaAnnotations({
            x: primaryContext.timeToCoordinate(first.timestamp),
            y: primaryContext.priceToCoordinate(first.high),
            context: primaryContext,
          })?.id || null,
          primaryComparisonPdaHit: pdaHitTest.hitTestPdaAnnotations({
            x: primaryContext.timeToCoordinate(first.timestamp),
            y: primaryContext.priceToCoordinate(first.low),
            context: primaryContext,
          })?.id || null,
          comparisonPrimaryPdaHit: pdaHitTest.hitTestPdaAnnotations({
            x: comparisonContext.timeToCoordinate(first.timestamp),
            y: comparisonContext.priceToCoordinate(first.high),
            context: comparisonContext,
          })?.id || null,
          comparisonLocalPdaHit: pdaHitTest.hitTestPdaAnnotations({
            x: comparisonContext.timeToCoordinate(first.timestamp),
            y: comparisonContext.priceToCoordinate(first.low),
            context: comparisonContext,
          })?.id || null,
          primaryLocalSegmentHit: segmentHitTest.hitTestSegments({
            x: primaryContext.timeToCoordinate(last.timestamp),
            y: primaryContext.priceToCoordinate(last.high),
            context: primaryContext,
          })?.id || null,
          comparisonLocalSegmentHit: segmentHitTest.hitTestSegments({
            x: comparisonContext.timeToCoordinate(last.timestamp),
            y: comparisonContext.priceToCoordinate(last.low),
            context: comparisonContext,
          })?.id || null,
          primaryLocalOrderHit: orderHitTest.hitTestOrderSetupElements({
            x: primaryContext.timeToCoordinate(first.timestamp),
            y: primaryContext.priceToCoordinate(first.close),
            context: primaryContext,
          }).primaryHit?.setupId || null,
          comparisonLocalOrderHit: orderHitTest.hitTestOrderSetupElements({
            x: comparisonContext.timeToCoordinate(first.timestamp),
            y: comparisonContext.priceToCoordinate(first.high),
            context: comparisonContext,
          }).primaryHit?.setupId || null,
          primaryLocalLiveHit: liveHitTest.hitTestLiveRecordElements({
            x: primaryContext.timeToCoordinate(first.timestamp),
            y: primaryContext.priceToCoordinate(first.open),
            context: primaryContext,
          }).primaryHit?.liveRecordId || null,
          comparisonLocalLiveHit: liveHitTest.hitTestLiveRecordElements({
            x: comparisonContext.timeToCoordinate(first.timestamp),
            y: comparisonContext.priceToCoordinate(first.high),
            context: comparisonContext,
          }).primaryHit?.liveRecordId || null,
        };
        paneStore.setPaneSyncEnabled('pane-2', true);
        paneStore.setPaneSyncEnabled('pane-1', true);

        const chartEl = document.querySelector('#comparison-chart-canvas');
        const openComparisonAt = (bar, price) => {
          const rect = chartEl.getBoundingClientRect();
          chartEl.dispatchEvent(new MouseEvent('contextmenu', {
            bubbles: true,
            cancelable: true,
            clientX: rect.left + comparisonContext.timeToCoordinate(bar.timestamp),
            clientY: rect.top + comparisonContext.priceToCoordinate(price),
          }));
        };

        const second = primaryBars[1];
        comparisonStore.setComparisonOverlaySyncMode('no-sync');
        paneStore.setPaneSyncEnabled('pane-2', false);
        await new Promise((resolve) => setTimeout(resolve, 100));
        openComparisonAt(second, second.high);
        document.querySelector('[data-pda-action="bsl"]').click();
        await new Promise((resolve) => setTimeout(resolve, 600));

        openComparisonAt(first, first.low);
        document.querySelector('[data-comparison-action="comparison-segment-start-low"]').click();
        await new Promise((resolve) => setTimeout(resolve, 100));
        openComparisonAt(last, last.high);
        document.querySelector('[data-comparison-action="comparison-segment-finish-high"]').click();
        await new Promise((resolve) => setTimeout(resolve, 450));

        const autoPda = pdaStore.getAnnotations()
          .filter((annotation) =>
            annotation.sourceChartId === 'comparison-window' &&
            annotation.type === 'bsl'
          )
          .sort((a, b) => Number(b.createdAt || 0) - Number(a.createdAt || 0))[0];
        const autoSegment = segmentStore.getSegments()
          .filter((segment) =>
            segment.sourceChartId === 'comparison-window' &&
            segment.direction === 'up'
          )
          .sort((a, b) => Number(b.createdAt || 0) - Number(a.createdAt || 0))[0];
        const normalizeAutoHit = (id, expectedId) => id && expectedId && id === expectedId ? 'auto' : id || null;
        const autoPdaTimestamp = autoPda?.canonicalTimestamp ?? autoPda?.timestamp ?? second.timestamp;
        const autoPdaPrice = autoPda?.price ?? second.high;
        const autoSegmentTimestamp = autoSegment?.end?.timestamp ?? last.timestamp;
        const autoSegmentPrice = autoSegment?.end?.price ?? last.high;
        const autoComparisonPdaHit = pdaHitTest.hitTestPdaAnnotations({
          x: comparisonContext.timeToCoordinate(autoPdaTimestamp),
          y: comparisonContext.priceToCoordinate(autoPdaPrice),
          context: comparisonContext,
        });
        const autoPrimaryPdaHit = pdaHitTest.hitTestPdaAnnotations({
          x: primaryContext.timeToCoordinate(autoPdaTimestamp),
          y: primaryContext.priceToCoordinate(autoPdaPrice),
          context: primaryContext,
        });
        const autoComparisonSegmentHit = segmentHitTest.hitTestSegments({
          x: comparisonContext.timeToCoordinate(autoSegmentTimestamp),
          y: comparisonContext.priceToCoordinate(autoSegmentPrice),
          context: comparisonContext,
        });
        const autoPrimarySegmentHit = segmentHitTest.hitTestSegments({
          x: primaryContext.timeToCoordinate(autoSegmentTimestamp),
          y: primaryContext.priceToCoordinate(autoSegmentPrice),
          context: primaryContext,
        });
        result.autoSyncCreation = {
          modeAfterCreate: comparisonStore.getComparisonWindowState().descriptor.overlaySyncMode,
          paneSyncAfterCreate: paneStore.getPaneById('pane-2')?.syncEnabled,
          comparisonPdaHit: normalizeAutoHit(autoComparisonPdaHit?.id, autoPda?.id),
          primaryPdaHit: normalizeAutoHit(autoPrimaryPdaHit?.id, autoPda?.id),
          comparisonSegmentHit: normalizeAutoHit(autoComparisonSegmentHit?.id, autoSegment?.id),
          primarySegmentHit: normalizeAutoHit(autoPrimarySegmentHit?.id, autoSegment?.id),
          autoPdaId: autoPda?.id ? 'auto' : null,
          autoSegmentId: autoSegment?.id ? 'auto' : null,
        };

        comparisonStore.setComparisonOverlaySyncMode('no-sync');
        await new Promise((resolve) => setTimeout(resolve, 100));
        const autoNoSyncComparisonPdaHit = pdaHitTest.hitTestPdaAnnotations({
          x: comparisonContext.timeToCoordinate(autoPdaTimestamp),
          y: comparisonContext.priceToCoordinate(autoPdaPrice),
          context: comparisonContext,
        });
        const autoNoSyncPrimaryPdaHit = pdaHitTest.hitTestPdaAnnotations({
          x: primaryContext.timeToCoordinate(autoPdaTimestamp),
          y: primaryContext.priceToCoordinate(autoPdaPrice),
          context: primaryContext,
        });
        const autoNoSyncComparisonSegmentHit = segmentHitTest.hitTestSegments({
          x: comparisonContext.timeToCoordinate(autoSegmentTimestamp),
          y: comparisonContext.priceToCoordinate(autoSegmentPrice),
          context: comparisonContext,
        });
        const autoNoSyncPrimarySegmentHit = segmentHitTest.hitTestSegments({
          x: primaryContext.timeToCoordinate(autoSegmentTimestamp),
          y: primaryContext.priceToCoordinate(autoSegmentPrice),
          context: primaryContext,
        });
        result.autoSyncCreation.afterNoSync = {
          mode: comparisonStore.getComparisonWindowState().descriptor.overlaySyncMode,
          comparisonPdaHit: normalizeAutoHit(autoNoSyncComparisonPdaHit?.id, autoPda?.id),
          primaryPdaHit: normalizeAutoHit(autoNoSyncPrimaryPdaHit?.id, autoPda?.id),
          comparisonSegmentHit: normalizeAutoHit(autoNoSyncComparisonSegmentHit?.id, autoSegment?.id),
          primarySegmentHit: normalizeAutoHit(autoNoSyncPrimarySegmentHit?.id, autoSegment?.id),
        };

        const esBars = primaryBars.map((bar, index) => ({
          ...bar,
          open: 7400 + index * 8,
          high: 7424 + index * 8,
          low: 7388 + index * 8,
          close: 7412 + index * 8,
        }));
        comparisonStore.setComparisonOverlaySyncMode('no-sync');
        comparisonStore.setComparisonInstrument('ES');
        comparisonStore.setComparisonTimeframe(60);
        comparisonStore.setComparisonBars(esBars, {
          startTs: first.timestamp,
          endTs: last.timestamp,
        }, {
          start: '2026-06-12 09:30',
          end: '2026-06-12 10:30',
        });
        return result;
      })();
    `);
    assert.deepEqual(syncedHitResult, {
      policySafe: true,
      comparisonPrimaryPdaHit: 'sync-primary-pda',
      primaryComparisonPdaHit: 'sync-comparison-pda',
      comparisonPrimarySegmentHit: 'sync-primary-segment',
      primaryComparisonSegmentHit: 'sync-comparison-segment',
      comparisonOrderHit: {
        setupId: 'sync-primary-order',
        element: 'entry',
      },
      comparisonLiveHit: {
        liveRecordId: 'sync-primary-live',
        element: 'entry',
      },
      originalRouting: {
        selectedPdaId: 'sync-primary-pda',
        editedPdaNote: 'edited from comparison sync hit',
        pdaCountBeforeDelete: 1,
        pdaCountAfterDelete: 0,
        selectedSegmentId: 'sync-primary-segment',
        editedSegmentNarrative: 'edited from comparison sync hit',
        segmentCountBeforeDelete: 1,
        segmentCountAfterDelete: 0,
      },
      noSyncIsolation: {
        policySafe: true,
        primaryPaneSyncEnabled: false,
        comparisonPaneSyncEnabled: true,
        bothPanesNoSync: false,
        primaryComparisonPdaHit: null,
        primaryComparisonSegmentHit: null,
        primaryComparisonOrderHit: null,
        primaryComparisonLiveHit: null,
        comparisonPrimaryPdaHit: null,
        comparisonPrimarySegmentHit: null,
      },
      pane1NoSyncIsolation: {
        policySafe: true,
        primaryPaneSyncEnabled: true,
        comparisonPaneSyncEnabled: false,
        bothPanesNoSync: false,
        primaryComparisonPdaHit: 'sync-comparison-pda',
        primaryComparisonSegmentHit: 'sync-comparison-segment',
        comparisonLocalPdaHit: null,
        comparisonLocalSegmentHit: null,
        comparisonLocalOrderHit: null,
        comparisonLocalLiveHit: null,
      },
      allNoSyncIsolation: {
        policySafe: true,
        primaryPaneSyncEnabled: false,
        comparisonPaneSyncEnabled: false,
        bothPanesNoSync: true,
        primaryLocalPdaHit: null,
        primaryComparisonPdaHit: null,
        comparisonPrimaryPdaHit: null,
        comparisonLocalPdaHit: null,
        primaryLocalSegmentHit: null,
        comparisonLocalSegmentHit: null,
        primaryLocalOrderHit: null,
        comparisonLocalOrderHit: null,
        primaryLocalLiveHit: null,
        comparisonLocalLiveHit: null,
      },
      autoSyncCreation: {
        modeAfterCreate: 'sync',
        paneSyncAfterCreate: true,
        comparisonPdaHit: 'auto',
        primaryPdaHit: 'auto',
        comparisonSegmentHit: 'auto',
        primarySegmentHit: 'auto',
        autoPdaId: 'auto',
        autoSegmentId: 'auto',
        afterNoSync: {
          mode: 'no-sync',
          comparisonPdaHit: 'auto',
          primaryPdaHit: 'auto',
          comparisonSegmentHit: 'auto',
          primarySegmentHit: 'auto',
        },
      },
    }, 'Sync safe mode should make Main/Comparison overlays hit-test on both chart contexts');
}
