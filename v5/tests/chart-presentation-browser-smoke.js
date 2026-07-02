import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { rm } from 'node:fs/promises';
import http from 'node:http';
import {
  createCdpClient,
  evaluate,
  waitForExpression,
  waitForProcessExit,
  waitForTargets,
} from '../../v4/tests/helpers/browser-cdp-client.js';

const CHROME_BIN = process.env.CHROME_BIN || 'google-chrome';
const DEBUG_PORT = Number(process.env.CHROME_DEBUG_PORT || 9376);
const PROFILE_DIR = process.env.CHROME_PROFILE_DIR || `/tmp/v5-chart-presentation-browser-smoke-${process.pid}`;

function getFreePort() {
  return new Promise((resolve, reject) => {
    const server = http.createServer();
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      server.close(() => resolve(address.port));
    });
    server.on('error', reject);
  });
}

function waitForHttpOk(url, timeoutMs = 8_000) {
  const deadline = Date.now() + timeoutMs;
  return new Promise((resolve, reject) => {
    const attempt = () => {
      const request = http.get(url, (response) => {
        response.resume();
        if (response.statusCode && response.statusCode >= 200 && response.statusCode < 400) {
          resolve();
          return;
        }
        retry();
      });
      request.on('error', retry);
    };
    const retry = () => {
      if (Date.now() > deadline) {
        reject(new Error(`Timed out waiting for ${url}`));
        return;
      }
      setTimeout(attempt, 100);
    };
    attempt();
  });
}

async function main() {
  const webPort = Number(process.env.V5_WEB_PORT || await getFreePort());
  const pageUrl = process.env.V5_PAGE_URL || `http://127.0.0.1:${webPort}/v5/index.html`;
  const web = spawn('python3', [
    '-m',
    'http.server',
    String(webPort),
    '--bind',
    '127.0.0.1',
  ], { cwd: process.cwd(), stdio: 'ignore' });
  await waitForHttpOk(pageUrl);

  const chrome = spawn(CHROME_BIN, [
    '--headless=new',
    '--disable-gpu',
    '--no-sandbox',
    '--disable-dev-shm-usage',
    `--remote-debugging-port=${DEBUG_PORT}`,
    `--user-data-dir=${PROFILE_DIR}`,
    pageUrl,
  ], { stdio: 'ignore' });

  let client = null;
  try {
    const target = await waitForTargets(DEBUG_PORT);
    client = createCdpClient(target.webSocketDebuggerUrl);
    await client.open();
    await client.send('Runtime.enable');
    await client.send('Page.enable');
    await client.send('Network.setCacheDisabled', { cacheDisabled: true });
    await client.send('Page.navigate', { url: pageUrl });
    await waitForExpression(client, `document.querySelector('[data-v5-root]')?.dataset.booted === 'true'`, 8_000);

    const value = JSON.parse(await evaluate(client, `
      (async () => {
        const originalFetch = window.fetch.bind(window);
        const requests = [];
        window.fetch = async (...args) => {
          const url = String(args[0] || '');
          if (!url.includes('/v4/bars')) {
            return originalFetch(...args);
          }
          const parsed = new URL(url, window.location.href);
          const timeframe = Number(parsed.searchParams.get('tf') || 1);
          const stepSeconds = timeframe * 60;
          const startText = parsed.searchParams.get('start');
          const endText = parsed.searchParams.get('end');
          requests.push({ timeframe, start: startText, end: endText });
          const start = Date.parse(startText.replace(' ', 'T') + ':00.000Z') / 1000;
          const end = Date.parse(endText.replace(' ', 'T') + ':00.000Z') / 1000;
          const bars = [];
          for (let timestamp = start; timestamp <= end; timestamp += stepSeconds) {
            const index = Math.round((timestamp - start) / stepSeconds);
            const open = 300 + index;
            bars.push({
              timestamp,
              open,
              high: open + 1,
              low: open - 1,
              close: open + 0.5,
            });
          }
          return new Response(JSON.stringify({ bars }), {
            status: 200,
            headers: { 'content-type': 'application/json' },
          });
        };

        async function waitFor(label, predicate, timeoutMs = 8000) {
          const deadline = Date.now() + timeoutMs;
          while (Date.now() < deadline) {
            const value = await predicate();
            if (value) return value;
            await new Promise((resolve) => setTimeout(resolve, 100));
          }
          throw new Error('waitFor timed out: ' + label + ' ' + JSON.stringify({
            cursorLabel: document.querySelector('[data-replay-cursor]')?.textContent || '',
            ohlcHidden: document.querySelector('[data-status-ohlc-row]')?.hidden,
            chartOhlcHidden: document.querySelector('[data-chart-ohlc-overlay]')?.hidden,
            canvasPaddingTop: document.querySelector('[data-chart-canvas]')?.style.paddingTop || '',
            canvasPaddingRight: document.querySelector('[data-chart-canvas]')?.style.paddingRight || '',
            lightweightMarginTop: document.querySelector('[data-chart-canvas]')?.dataset.lightweightMarginTopPercent || '',
            lightweightRightOffset: document.querySelector('[data-chart-canvas]')?.dataset.timeScaleRightOffset || '',
            candleTitle: Array.from(document.querySelectorAll('.chart-candle')).at(-1)?.title || '',
            loadStatus: document.querySelector('[data-replay-load-status]')?.textContent || '',
          }));
        }

        try {
          const commands = await import('/v5/src/runtime/commands.js');
          const created = await commands.dispatchCommand('session.create', {
            id: 'browser-chart-presentation',
            instrument: 'NQ',
            timeframe: 1,
            sessionStart: '2026-06-01 09:30',
            sessionEnd: '2026-06-01 09:40',
          });
          await commands.dispatchCommand('app.navigate', {
            routeId: 'chart',
            params: { sessionId: created.session.id },
          });
          await waitFor('initial loaded', async () => {
            const state = await commands.dispatchCommand('replay.getState');
            return state.status === 'initial-loaded';
          });

          const before = await commands.dispatchCommand('replay.getState');
          const requestCount = requests.length;
          const beforeCursorLabel = document.querySelector('[data-replay-cursor]')?.textContent || '';
          const beforeOhlcHidden = document.querySelector('[data-status-ohlc-row]')?.hidden;
          const beforeChartOhlcHidden = document.querySelector('[data-chart-ohlc-overlay]')?.hidden;
          const beforeChartOhlcText = document.querySelector('[data-chart-ohlc-overlay]')?.textContent?.replace(/\\s+/g, ' ').trim() || '';
          const beforeChartOhlcPartCount = document.querySelectorAll('[data-chart-ohlc-legend] .chart-ohlc-part').length;
          const beforeChartOhlcValueClasses = Array
            .from(document.querySelectorAll('[data-chart-ohlc-legend] .chart-ohlc-value'))
            .map((node) => node.className)
            .join('|');
          const toolbarPresentationButtonCount = document.querySelector('[data-replay-workstation-toolbar]')
            ?.querySelectorAll('[data-display-timezone], [data-presentation-time-format], [data-presentation-toggle], [data-presentation-margin], [data-presentation-right-offset]')
            .length || 0;
          const settingsInitiallyHidden = document.querySelector('[data-chart-settings-popover]')?.hidden === true;

          document.querySelector('[data-chart-settings-open]').click();
          await waitFor('settings open', async () =>
            document.querySelector('[data-chart-settings-popover]')?.hidden === false
          );
          const tabCount = document.querySelectorAll('[data-chart-settings-tab]').length;
          const sectionCount = document.querySelectorAll('[data-chart-settings-section]').length;
          const bodyUpInput = document.querySelector('[data-candle-style="body.up"]');
          const beforeApplyCandleBodyUp = document.querySelector('[data-chart-canvas]')?.dataset.candleBodyUp || '';
          bodyUpInput.value = '#22c55e';
          bodyUpInput.dispatchEvent(new Event('input', { bubbles: true }));
          const timeFormatSelect = document.querySelector('select[data-presentation-time-format]');
          timeFormatSelect.value = '12h';
          timeFormatSelect.dispatchEvent(new Event('change', { bubbles: true }));
          document.querySelector('[data-chart-settings-tab="status"]').click();
          const ohlcToggle = document.querySelector('[data-presentation-toggle="showStatusOhlc"]');
          const titleToggle = document.querySelector('[data-presentation-toggle="showStatusTitle"]');
          const titleModeSelect = document.querySelector('[data-presentation-status-title-mode]');
          const marketStatusToggle = document.querySelector('[data-presentation-toggle="showOpenMarketStatus"]');
          const countdownToggle = document.querySelector('[data-presentation-toggle="showBarCountdown"]');
          const beforeCountdownHidden = document.querySelector('[data-countdown-row]')?.hidden;
          const beforeCountdownText = document.querySelector('[data-bar-countdown]')?.textContent || '';
          titleModeSelect.value = 'symbol';
          titleModeSelect.dispatchEvent(new Event('change', { bubbles: true }));
          titleToggle.checked = false;
          titleToggle.dispatchEvent(new Event('change', { bubbles: true }));
          marketStatusToggle.checked = false;
          marketStatusToggle.dispatchEvent(new Event('change', { bubbles: true }));
          ohlcToggle.checked = false;
          ohlcToggle.dispatchEvent(new Event('change', { bubbles: true }));
          countdownToggle.checked = true;
          countdownToggle.dispatchEvent(new Event('change', { bubbles: true }));
          document.querySelector('[data-chart-settings-tab="canvas"]').click();
          const compactToggle = document.querySelector('[data-presentation-margin="compact"]');
          compactToggle.checked = true;
          compactToggle.dispatchEvent(new Event('change', { bubbles: true }));
          const marginTopInput = document.querySelector('[data-presentation-margin-value="topPercent"]');
          const marginBottomInput = document.querySelector('[data-presentation-margin-value="bottomPercent"]');
          marginTopInput.value = '7';
          marginTopInput.dispatchEvent(new Event('input', { bubbles: true }));
          marginBottomInput.value = '9';
          marginBottomInput.dispatchEvent(new Event('input', { bubbles: true }));
          const backgroundColor = document.querySelector('[data-background-style-color="color"]');
          backgroundColor.value = '#020617';
          backgroundColor.dispatchEvent(new Event('input', { bubbles: true }));
          const gridVerticalToggle = document.querySelector('[data-grid-style-toggle="verticalVisible"]');
          const gridHorizontalColor = document.querySelector('[data-grid-style-color="horizontalColor"]');
          const beforeApplyGridVerticalVisible = document.querySelector('[data-chart-canvas]')?.dataset.gridVerticalVisible || '';
          const beforeApplyGridHorizontalColor = document.querySelector('[data-chart-canvas]')?.dataset.gridHorizontalColor || '';
          const beforeApplyBackgroundColor = document.querySelector('[data-chart-canvas]')?.dataset.backgroundColor || '';
          const beforeApplyScaleTextColor = document.querySelector('[data-chart-canvas]')?.dataset.scaleTextColor || '';
          const beforeApplyScaleLineColor = document.querySelector('[data-chart-canvas]')?.dataset.scaleLineColor || '';
          const beforeApplyScaleFontSize = document.querySelector('[data-chart-canvas]')?.dataset.scaleFontSize || '';
          const beforeApplyPriceScaleVisible = document.querySelector('[data-chart-canvas]')?.dataset.priceScaleVisible || '';
          const beforeApplyTimeScaleVisible = document.querySelector('[data-chart-canvas]')?.dataset.timeScaleVisible || '';
          const beforeApplyScaleBordersVisible = document.querySelector('[data-chart-canvas]')?.dataset.scaleBordersVisible || '';
          const beforeApplyWatermarkVisible = document.querySelector('[data-chart-canvas]')?.dataset.watermarkVisible || '';
          const beforeApplyWatermarkText = document.querySelector('[data-chart-canvas]')?.dataset.watermarkText || '';
          const beforeApplyWatermarkColor = document.querySelector('[data-chart-canvas]')?.dataset.watermarkColor || '';
          const beforeApplyWatermarkFontSize = document.querySelector('[data-chart-canvas]')?.dataset.watermarkFontSize || '';
          gridVerticalToggle.checked = false;
          gridVerticalToggle.dispatchEvent(new Event('change', { bubbles: true }));
          gridHorizontalColor.value = '#1f2937';
          gridHorizontalColor.dispatchEvent(new Event('input', { bubbles: true }));
          const scaleTextColor = document.querySelector('[data-scale-style-color="textColor"]');
          const scaleLineColor = document.querySelector('[data-scale-style-color="lineColor"]');
          const scaleFontSize = document.querySelector('[data-scale-style-font-size]');
          scaleTextColor.value = '#38bdf8';
          scaleTextColor.dispatchEvent(new Event('input', { bubbles: true }));
          scaleLineColor.value = '#475569';
          scaleLineColor.dispatchEvent(new Event('input', { bubbles: true }));
          scaleFontSize.value = '14';
          scaleFontSize.dispatchEvent(new Event('change', { bubbles: true }));
          const watermarkToggle = document.querySelector('[data-watermark-style-toggle="visible"]');
          const watermarkText = document.querySelector('[data-watermark-style-text="text"]');
          const watermarkColor = document.querySelector('[data-watermark-style-color="color"]');
          const watermarkFontSize = document.querySelector('[data-watermark-style-font-size]');
          watermarkToggle.checked = true;
          watermarkToggle.dispatchEvent(new Event('change', { bubbles: true }));
          watermarkText.value = 'Replay Review';
          watermarkText.dispatchEvent(new Event('input', { bubbles: true }));
          watermarkColor.value = '#64748b';
          watermarkColor.dispatchEvent(new Event('input', { bubbles: true }));
          watermarkFontSize.value = '64';
          watermarkFontSize.dispatchEvent(new Event('change', { bubbles: true }));
          document.querySelector('[data-chart-settings-tab="scales"]').click();
          const rightOffsetSelect = document.querySelector('select[data-presentation-right-offset]');
          rightOffsetSelect.value = '16';
          rightOffsetSelect.dispatchEvent(new Event('change', { bubbles: true }));
          const dateFormatSelect = document.querySelector('[data-presentation-date-format]');
          const dayLabelsToggle = document.querySelector('[data-presentation-toggle="showDayOfWeekLabels"]');
          dateFormatSelect.value = "MMM DD 'YY";
          dateFormatSelect.dispatchEvent(new Event('change', { bubbles: true }));
          dayLabelsToggle.checked = true;
          dayLabelsToggle.dispatchEvent(new Event('change', { bubbles: true }));
          const priceScaleToggle = document.querySelector('[data-scale-style-toggle="priceScaleVisible"]');
          const timeScaleToggle = document.querySelector('[data-scale-style-toggle="timeScaleVisible"]');
          const scaleBordersToggle = document.querySelector('[data-scale-style-toggle="scaleBordersVisible"]');
          priceScaleToggle.checked = false;
          priceScaleToggle.dispatchEvent(new Event('change', { bubbles: true }));
          const priceScaleSideSelect = document.querySelector('[data-scale-style-side]');
          priceScaleSideSelect.value = 'left';
          priceScaleSideSelect.dispatchEvent(new Event('change', { bubbles: true }));
          timeScaleToggle.checked = false;
          timeScaleToggle.dispatchEvent(new Event('change', { bubbles: true }));
          scaleBordersToggle.checked = false;
          scaleBordersToggle.dispatchEvent(new Event('change', { bubbles: true }));
          const crosshairHorizontalToggle = document.querySelector('[data-crosshair-style-toggle="horizontalVisible"]');
          const crosshairLabelBackground = document.querySelector('[data-crosshair-style-color="labelBackgroundColor"]');
          const beforeApplyCrosshairHorizontalVisible = document.querySelector('[data-chart-canvas]')?.dataset.crosshairHorizontalVisible || '';
          const beforeApplyCrosshairLabelBackground = document.querySelector('[data-chart-canvas]')?.dataset.crosshairLabelBackgroundColor || '';
          crosshairHorizontalToggle.checked = false;
          crosshairHorizontalToggle.dispatchEvent(new Event('change', { bubbles: true }));
          crosshairLabelBackground.value = '#0f172a';
          crosshairLabelBackground.dispatchEvent(new Event('input', { bubbles: true }));
          const beforeApplyCursorLabel = document.querySelector('[data-replay-cursor]')?.textContent || '';
          const beforeApplyChartOhlcHidden = document.querySelector('[data-chart-ohlc-overlay]')?.hidden;
          const beforeApplyRightOffset = document.querySelector('[data-chart-canvas]')?.dataset.timeScaleRightOffset || '';
          const beforeApplyDraftOnlyCandleBodyUp = document.querySelector('[data-chart-canvas]')?.dataset.candleBodyUp || '';
          const beforeApplyDraftOnlyGridVerticalVisible = document.querySelector('[data-chart-canvas]')?.dataset.gridVerticalVisible || '';
          const beforeApplyDraftOnlyGridHorizontalColor = document.querySelector('[data-chart-canvas]')?.dataset.gridHorizontalColor || '';
          const beforeApplyDraftOnlyBackgroundColor = document.querySelector('[data-chart-canvas]')?.dataset.backgroundColor || '';
          const beforeApplyDraftOnlyScaleTextColor = document.querySelector('[data-chart-canvas]')?.dataset.scaleTextColor || '';
          const beforeApplyDraftOnlyScaleLineColor = document.querySelector('[data-chart-canvas]')?.dataset.scaleLineColor || '';
          const beforeApplyDraftOnlyScaleFontSize = document.querySelector('[data-chart-canvas]')?.dataset.scaleFontSize || '';
          const beforeApplyDraftOnlyPriceScaleSide = document.querySelector('[data-chart-canvas]')?.dataset.priceScaleSide || '';
          const beforeApplyDraftOnlyPriceScaleVisible = document.querySelector('[data-chart-canvas]')?.dataset.priceScaleVisible || '';
          const beforeApplyDraftOnlyTimeScaleVisible = document.querySelector('[data-chart-canvas]')?.dataset.timeScaleVisible || '';
          const beforeApplyDraftOnlyScaleBordersVisible = document.querySelector('[data-chart-canvas]')?.dataset.scaleBordersVisible || '';
          const beforeApplyDraftOnlyWatermarkVisible = document.querySelector('[data-chart-canvas]')?.dataset.watermarkVisible || '';
          const beforeApplyDraftOnlyWatermarkText = document.querySelector('[data-chart-canvas]')?.dataset.watermarkText || '';
          const beforeApplyDraftOnlyWatermarkColor = document.querySelector('[data-chart-canvas]')?.dataset.watermarkColor || '';
          const beforeApplyDraftOnlyWatermarkFontSize = document.querySelector('[data-chart-canvas]')?.dataset.watermarkFontSize || '';
          const beforeApplyDraftOnlyCrosshairHorizontalVisible = document.querySelector('[data-chart-canvas]')?.dataset.crosshairHorizontalVisible || '';
          const beforeApplyDraftOnlyCrosshairLabelBackground = document.querySelector('[data-chart-canvas]')?.dataset.crosshairLabelBackgroundColor || '';
          document.querySelector('[data-chart-settings-apply]').click();

          await waitFor('presentation applied', async () =>
            document.querySelector('[data-replay-cursor]')?.textContent === "Mon Jun 01 '26 9:30 AM"
              && document.querySelector('[data-status-ohlc-row]')?.hidden === true
              && document.querySelector('[data-chart-ohlc-overlay]')?.hidden === true
              && document.querySelector('[data-chart-canvas]')?.style.paddingTop === ''
              && document.querySelector('[data-chart-canvas]')?.style.paddingBottom === ''
              && document.querySelector('[data-chart-canvas]')?.style.paddingRight === ''
              && document.querySelector('[data-chart-canvas]')?.dataset.lightweightMarginTopPercent === '7'
              && document.querySelector('[data-chart-canvas]')?.dataset.lightweightMarginBottomPercent === '9'
              && document.querySelector('[data-chart-canvas]')?.dataset.timeScaleRightOffset === '16'
              && document.querySelector('[data-chart-canvas]')?.dataset.candleBodyUp === '#22c55e'
              && document.querySelector('[data-chart-canvas]')?.dataset.gridVerticalVisible === 'false'
              && document.querySelector('[data-chart-canvas]')?.dataset.gridHorizontalColor === '#1f2937'
              && document.querySelector('[data-chart-canvas]')?.dataset.crosshairHorizontalVisible === 'false'
              && document.querySelector('[data-chart-canvas]')?.dataset.crosshairLabelBackgroundColor === '#0f172a'
              && document.querySelector('[data-chart-canvas]')?.dataset.backgroundColor === '#020617'
              && document.querySelector('[data-chart-canvas]')?.dataset.scaleTextColor === '#38bdf8'
              && document.querySelector('[data-chart-canvas]')?.dataset.scaleLineColor === '#475569'
              && document.querySelector('[data-chart-canvas]')?.dataset.scaleFontSize === '14'
              && document.querySelector('[data-chart-canvas]')?.dataset.priceScaleSide === 'left'
              && document.querySelector('[data-chart-canvas]')?.dataset.priceScaleVisible === 'false'
              && document.querySelector('[data-chart-canvas]')?.dataset.timeScaleVisible === 'false'
              && document.querySelector('[data-chart-canvas]')?.dataset.scaleBordersVisible === 'false'
              && document.querySelector('[data-chart-canvas]')?.dataset.watermarkVisible === 'true'
              && document.querySelector('[data-chart-canvas]')?.dataset.watermarkText === 'Replay Review'
              && document.querySelector('[data-chart-canvas]')?.dataset.watermarkColor === '#64748b'
              && document.querySelector('[data-chart-canvas]')?.dataset.watermarkFontSize === '64'
              && document.querySelector('[data-chart-canvas]')?.dataset.dateFormat === "MMM DD 'YY"
              && document.querySelector('[data-chart-canvas]')?.dataset.showDayOfWeekLabels === 'true'
              && document.querySelector('[data-countdown-row]')?.hidden === false
              && document.querySelector('[data-bar-countdown]')?.textContent === '1:00'
              && Array.from(document.querySelectorAll('.chart-candle')).at(-1)?.title?.startsWith("Mon Jun 01 '26 9:30 AM")
          );

          const after = await commands.dispatchCommand('replay.getState');
          return JSON.stringify({
            error: '',
            beforeCursorLabel,
            afterCursorLabel: document.querySelector('[data-replay-cursor]')?.textContent || '',
            beforeOhlcHidden,
            afterOhlcHidden: document.querySelector('[data-status-ohlc-row]')?.hidden,
            beforeChartOhlcHidden,
            afterChartOhlcHidden: document.querySelector('[data-chart-ohlc-overlay]')?.hidden,
            beforeCountdownHidden,
            beforeCountdownText,
            beforeChartOhlcText,
            beforeChartOhlcPartCount,
            beforeChartOhlcValueClasses,
            toolbarPresentationButtonCount,
            settingsInitiallyHidden,
            settingsOpen: document.querySelector('[data-chart-settings-popover]')?.hidden === false,
            tabCount,
            sectionCount,
            beforeApplyCursorLabel,
            beforeApplyChartOhlcHidden,
            beforeApplyRightOffset,
            beforeApplyCandleBodyUp,
            beforeApplyDraftOnlyCandleBodyUp,
            beforeApplyGridVerticalVisible,
            beforeApplyGridHorizontalColor,
            beforeApplyDraftOnlyGridVerticalVisible,
            beforeApplyDraftOnlyGridHorizontalColor,
            beforeApplyBackgroundColor,
            beforeApplyScaleTextColor,
            beforeApplyScaleLineColor,
            beforeApplyScaleFontSize,
            beforeApplyPriceScaleVisible,
            beforeApplyTimeScaleVisible,
            beforeApplyScaleBordersVisible,
            beforeApplyWatermarkVisible,
            beforeApplyWatermarkText,
            beforeApplyWatermarkColor,
            beforeApplyWatermarkFontSize,
            beforeApplyDraftOnlyBackgroundColor,
            beforeApplyDraftOnlyScaleTextColor,
            beforeApplyDraftOnlyScaleLineColor,
            beforeApplyDraftOnlyScaleFontSize,
            beforeApplyDraftOnlyPriceScaleSide,
            beforeApplyDraftOnlyPriceScaleVisible,
            beforeApplyDraftOnlyTimeScaleVisible,
            beforeApplyDraftOnlyScaleBordersVisible,
            beforeApplyDraftOnlyWatermarkVisible,
            beforeApplyDraftOnlyWatermarkText,
            beforeApplyDraftOnlyWatermarkColor,
            beforeApplyDraftOnlyWatermarkFontSize,
            beforeApplyCrosshairHorizontalVisible,
            beforeApplyCrosshairLabelBackground,
            beforeApplyDraftOnlyCrosshairHorizontalVisible,
            beforeApplyDraftOnlyCrosshairLabelBackground,
            selected12h: document.querySelector('select[data-presentation-time-format]')?.value || '',
            titleSelected: document.querySelector('[data-presentation-toggle="showStatusTitle"]')?.checked,
            titleModeSelected: document.querySelector('[data-presentation-status-title-mode]')?.value || '',
            marketStatusSelected: document.querySelector('[data-presentation-toggle="showOpenMarketStatus"]')?.checked,
            countdownSelected: document.querySelector('[data-presentation-toggle="showBarCountdown"]')?.checked,
            selectedBodyUpColor: document.querySelector('[data-candle-style="body.up"]')?.value || '',
            compactSelected: document.querySelector('[data-presentation-margin="compact"]')?.checked,
            marginTopSelected: document.querySelector('[data-presentation-margin-value="topPercent"]')?.value || '',
            marginBottomSelected: document.querySelector('[data-presentation-margin-value="bottomPercent"]')?.value || '',
            rightOffsetSelected: document.querySelector('select[data-presentation-right-offset]')?.value || '',
            dateFormatSelected: document.querySelector('[data-presentation-date-format]')?.value || '',
            dayLabelsSelected: document.querySelector('[data-presentation-toggle="showDayOfWeekLabels"]')?.checked,
            gridVerticalSelected: document.querySelector('[data-grid-style-toggle="verticalVisible"]')?.checked,
            gridHorizontalColorSelected: document.querySelector('[data-grid-style-color="horizontalColor"]')?.value || '',
            crosshairHorizontalSelected: document.querySelector('[data-crosshair-style-toggle="horizontalVisible"]')?.checked,
            crosshairLabelBackgroundSelected: document.querySelector('[data-crosshair-style-color="labelBackgroundColor"]')?.value || '',
            backgroundColorSelected: document.querySelector('[data-background-style-color="color"]')?.value || '',
            scaleTextColorSelected: document.querySelector('[data-scale-style-color="textColor"]')?.value || '',
            scaleLineColorSelected: document.querySelector('[data-scale-style-color="lineColor"]')?.value || '',
            scaleFontSizeSelected: document.querySelector('[data-scale-style-font-size]')?.value || '',
            priceScaleSideSelected: document.querySelector('[data-scale-style-side]')?.value || '',
            priceScaleSelected: document.querySelector('[data-scale-style-toggle="priceScaleVisible"]')?.checked,
            timeScaleSelected: document.querySelector('[data-scale-style-toggle="timeScaleVisible"]')?.checked,
            scaleBordersSelected: document.querySelector('[data-scale-style-toggle="scaleBordersVisible"]')?.checked,
            watermarkSelected: document.querySelector('[data-watermark-style-toggle="visible"]')?.checked,
            watermarkTextSelected: document.querySelector('[data-watermark-style-text="text"]')?.value || '',
            watermarkColorSelected: document.querySelector('[data-watermark-style-color="color"]')?.value || '',
            watermarkFontSizeSelected: document.querySelector('[data-watermark-style-font-size]')?.value || '',
            afterCanvasPaddingTop: document.querySelector('[data-chart-canvas]')?.style.paddingTop || '',
            afterCanvasPaddingBottom: document.querySelector('[data-chart-canvas]')?.style.paddingBottom || '',
            afterCanvasPaddingRight: document.querySelector('[data-chart-canvas]')?.style.paddingRight || '',
            afterCanvasMarginTop: document.querySelector('[data-chart-canvas]')?.dataset.lightweightMarginTopPercent || '',
            afterCanvasMarginBottom: document.querySelector('[data-chart-canvas]')?.dataset.lightweightMarginBottomPercent || '',
            afterCanvasRightOffset: document.querySelector('[data-chart-canvas]')?.dataset.timeScaleRightOffset || '',
            afterCanvasCandleBodyUp: document.querySelector('[data-chart-canvas]')?.dataset.candleBodyUp || '',
            afterCanvasGridVerticalVisible: document.querySelector('[data-chart-canvas]')?.dataset.gridVerticalVisible || '',
            afterCanvasGridHorizontalColor: document.querySelector('[data-chart-canvas]')?.dataset.gridHorizontalColor || '',
            afterCanvasCrosshairHorizontalVisible: document.querySelector('[data-chart-canvas]')?.dataset.crosshairHorizontalVisible || '',
            afterCanvasCrosshairLabelBackground: document.querySelector('[data-chart-canvas]')?.dataset.crosshairLabelBackgroundColor || '',
            afterCanvasBackgroundColor: document.querySelector('[data-chart-canvas]')?.dataset.backgroundColor || '',
            afterCanvasScaleTextColor: document.querySelector('[data-chart-canvas]')?.dataset.scaleTextColor || '',
            afterCanvasScaleLineColor: document.querySelector('[data-chart-canvas]')?.dataset.scaleLineColor || '',
            afterCanvasScaleFontSize: document.querySelector('[data-chart-canvas]')?.dataset.scaleFontSize || '',
            afterCanvasPriceScaleSide: document.querySelector('[data-chart-canvas]')?.dataset.priceScaleSide || '',
            afterCanvasPriceScaleVisible: document.querySelector('[data-chart-canvas]')?.dataset.priceScaleVisible || '',
            afterCanvasTimeScaleVisible: document.querySelector('[data-chart-canvas]')?.dataset.timeScaleVisible || '',
            afterCanvasScaleBordersVisible: document.querySelector('[data-chart-canvas]')?.dataset.scaleBordersVisible || '',
            afterCanvasWatermarkVisible: document.querySelector('[data-chart-canvas]')?.dataset.watermarkVisible || '',
            afterCanvasWatermarkText: document.querySelector('[data-chart-canvas]')?.dataset.watermarkText || '',
            afterCanvasWatermarkColor: document.querySelector('[data-chart-canvas]')?.dataset.watermarkColor || '',
            afterCanvasWatermarkFontSize: document.querySelector('[data-chart-canvas]')?.dataset.watermarkFontSize || '',
            afterCanvasDateFormat: document.querySelector('[data-chart-canvas]')?.dataset.dateFormat || '',
            afterCanvasShowDayOfWeekLabels: document.querySelector('[data-chart-canvas]')?.dataset.showDayOfWeekLabels || '',
            afterCountdownHidden: document.querySelector('[data-countdown-row]')?.hidden,
            afterCountdownText: document.querySelector('[data-bar-countdown]')?.textContent || '',
            beforeCursor: before.cursorTimestamp,
            afterCursor: after.cursorTimestamp,
            beforeDisplayCount: before.displayBars.length,
            afterDisplayCount: after.displayBars.length,
            requestCount,
            afterRequestCount: requests.length,
          });
        } catch (error) {
          return JSON.stringify({ error: error?.stack || error?.message || String(error) });
        } finally {
          window.fetch = originalFetch;
        }
      })()
    `));

    assert.equal(value.error, '', value.error || 'browser smoke failed');
    assert.equal(value.beforeCursorLabel, '2026-06-01 09:30');
    assert.equal(value.afterCursorLabel, "Mon Jun 01 '26 9:30 AM");
    assert.equal(value.beforeOhlcHidden, false);
    assert.equal(value.afterOhlcHidden, true);
    assert.equal(value.beforeChartOhlcHidden, false);
    assert.equal(value.afterChartOhlcHidden, true);
    assert.equal(value.beforeCountdownHidden, true);
    assert.equal(value.beforeCountdownText, '--');
    assert.match(value.beforeChartOhlcText, /^NQ 1m O/);
    assert.equal(value.beforeChartOhlcPartCount, 4);
    assert.match(value.beforeChartOhlcValueClasses, /is-up/);
    assert.equal(value.toolbarPresentationButtonCount, 0);
    assert.equal(value.settingsInitiallyHidden, true);
    assert.equal(value.settingsOpen, false);
    assert.equal(value.tabCount, 4);
    assert.equal(value.sectionCount, 4);
    assert.equal(value.beforeApplyCursorLabel, '2026-06-01 09:30');
    assert.equal(value.beforeApplyChartOhlcHidden, false);
    assert.equal(value.beforeApplyRightOffset, '10');
    assert.equal(value.beforeApplyCandleBodyUp, '#26a69a');
    assert.equal(value.beforeApplyDraftOnlyCandleBodyUp, '#26a69a');
    assert.equal(value.beforeApplyGridVerticalVisible, 'true');
    assert.equal(value.beforeApplyGridHorizontalColor, '#374151');
    assert.equal(value.beforeApplyDraftOnlyGridVerticalVisible, 'true');
    assert.equal(value.beforeApplyDraftOnlyGridHorizontalColor, '#374151');
    assert.equal(value.beforeApplyBackgroundColor, '#111827');
    assert.equal(value.beforeApplyScaleTextColor, '#22d3ee');
    assert.equal(value.beforeApplyScaleLineColor, '#334155');
    assert.equal(value.beforeApplyScaleFontSize, '12');
    assert.equal(value.beforeApplyDraftOnlyPriceScaleSide, 'right');
    assert.equal(value.beforeApplyPriceScaleVisible, 'true');
    assert.equal(value.beforeApplyTimeScaleVisible, 'true');
    assert.equal(value.beforeApplyScaleBordersVisible, 'true');
    assert.equal(value.beforeApplyWatermarkVisible, 'false');
    assert.equal(value.beforeApplyWatermarkText, 'FX Replay');
    assert.equal(value.beforeApplyWatermarkColor, '#334155');
    assert.equal(value.beforeApplyWatermarkFontSize, '48');
    assert.equal(value.beforeApplyDraftOnlyBackgroundColor, '#111827');
    assert.equal(value.beforeApplyDraftOnlyScaleTextColor, '#22d3ee');
    assert.equal(value.beforeApplyDraftOnlyScaleLineColor, '#334155');
    assert.equal(value.beforeApplyDraftOnlyScaleFontSize, '12');
    assert.equal(value.beforeApplyDraftOnlyPriceScaleVisible, 'true');
    assert.equal(value.beforeApplyDraftOnlyTimeScaleVisible, 'true');
    assert.equal(value.beforeApplyDraftOnlyScaleBordersVisible, 'true');
    assert.equal(value.beforeApplyDraftOnlyWatermarkVisible, 'false');
    assert.equal(value.beforeApplyDraftOnlyWatermarkText, 'FX Replay');
    assert.equal(value.beforeApplyDraftOnlyWatermarkColor, '#334155');
    assert.equal(value.beforeApplyDraftOnlyWatermarkFontSize, '48');
    assert.equal(value.beforeApplyCrosshairHorizontalVisible, 'true');
    assert.equal(value.beforeApplyCrosshairLabelBackground, '#334155');
    assert.equal(value.beforeApplyDraftOnlyCrosshairHorizontalVisible, 'true');
    assert.equal(value.beforeApplyDraftOnlyCrosshairLabelBackground, '#334155');
    assert.equal(value.selected12h, '12h');
    assert.equal(value.titleSelected, false);
    assert.equal(value.titleModeSelected, 'symbol');
    assert.equal(value.marketStatusSelected, false);
    assert.equal(value.countdownSelected, true);
    assert.equal(value.selectedBodyUpColor, '#22c55e');
    assert.equal(value.compactSelected, false);
    assert.equal(value.marginTopSelected, '7');
    assert.equal(value.marginBottomSelected, '9');
    assert.equal(value.rightOffsetSelected, '16');
    assert.equal(value.dateFormatSelected, "MMM DD 'YY");
    assert.equal(value.dayLabelsSelected, true);
    assert.equal(value.gridVerticalSelected, false);
    assert.equal(value.gridHorizontalColorSelected, '#1f2937');
    assert.equal(value.crosshairHorizontalSelected, false);
    assert.equal(value.crosshairLabelBackgroundSelected, '#0f172a');
    assert.equal(value.backgroundColorSelected, '#020617');
    assert.equal(value.scaleTextColorSelected, '#38bdf8');
    assert.equal(value.scaleLineColorSelected, '#475569');
    assert.equal(value.scaleFontSizeSelected, '14');
    assert.equal(value.priceScaleSideSelected, 'left');
    assert.equal(value.priceScaleSelected, false);
    assert.equal(value.timeScaleSelected, false);
    assert.equal(value.scaleBordersSelected, false);
    assert.equal(value.watermarkSelected, true);
    assert.equal(value.watermarkTextSelected, 'Replay Review');
    assert.equal(value.watermarkColorSelected, '#64748b');
    assert.equal(value.watermarkFontSizeSelected, '64');
    assert.equal(value.afterCanvasPaddingTop, '');
    assert.equal(value.afterCanvasPaddingBottom, '');
    assert.equal(value.afterCanvasPaddingRight, '');
    assert.equal(value.afterCanvasMarginTop, '7');
    assert.equal(value.afterCanvasMarginBottom, '9');
    assert.equal(value.afterCanvasRightOffset, '16');
    assert.equal(value.afterCanvasCandleBodyUp, '#22c55e');
    assert.equal(value.afterCanvasGridVerticalVisible, 'false');
    assert.equal(value.afterCanvasGridHorizontalColor, '#1f2937');
    assert.equal(value.afterCanvasCrosshairHorizontalVisible, 'false');
    assert.equal(value.afterCanvasCrosshairLabelBackground, '#0f172a');
    assert.equal(value.afterCanvasBackgroundColor, '#020617');
    assert.equal(value.afterCanvasScaleTextColor, '#38bdf8');
    assert.equal(value.afterCanvasScaleLineColor, '#475569');
    assert.equal(value.afterCanvasScaleFontSize, '14');
    assert.equal(value.afterCanvasPriceScaleSide, 'left');
    assert.equal(value.afterCanvasPriceScaleVisible, 'false');
    assert.equal(value.afterCanvasTimeScaleVisible, 'false');
    assert.equal(value.afterCanvasScaleBordersVisible, 'false');
    assert.equal(value.afterCanvasWatermarkVisible, 'true');
    assert.equal(value.afterCanvasWatermarkText, 'Replay Review');
    assert.equal(value.afterCanvasWatermarkColor, '#64748b');
    assert.equal(value.afterCanvasWatermarkFontSize, '64');
    assert.equal(value.afterCanvasDateFormat, "MMM DD 'YY");
    assert.equal(value.afterCanvasShowDayOfWeekLabels, 'true');
    assert.equal(value.afterCountdownHidden, false);
    assert.equal(value.afterCountdownText, '1:00');
    assert.equal(value.afterCursor, value.beforeCursor);
    assert.equal(value.afterDisplayCount, value.beforeDisplayCount);
    assert.equal(value.afterRequestCount, value.requestCount);
  } finally {
    client?.close();
    chrome.kill('SIGTERM');
    await waitForProcessExit(chrome);
    web.kill('SIGTERM');
    await waitForProcessExit(web);
    await rm(PROFILE_DIR, {
      recursive: true,
      force: true,
      maxRetries: 3,
      retryDelay: 100,
    }).catch(() => {});
  }
}

main().then(
  () => console.log('v5 chart presentation browser smoke passed'),
  (error) => {
    console.error(error);
    process.exit(1);
  }
);
