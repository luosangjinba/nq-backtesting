import assert from 'node:assert/strict';
import { evaluate } from '../../v4/tests/helpers/browser-cdp-client.js';
import { openV6Page } from './helpers/v6-browser-harness.js';
import {
  getVisibleRecentSessionRowActions,
} from '../src/shell/session-row-action-boundaries.js';

const page = await openV6Page({ height: 760, width: 1200 });

try {
  const value = JSON.parse(await evaluate(page.client, `
    (async () => {
      const root = document.querySelector('[data-v6-root]');
      document.querySelector('[data-v6-dashboard-toggle]')?.click();
      await new Promise((resolve) => setTimeout(resolve, 0));
      document.querySelector('[data-v6-dashboard-create-session]')?.click();
      await new Promise((resolve) => setTimeout(resolve, 0));
      document.querySelector('[data-v6-dashboard-open-session]')?.click();
      await new Promise((resolve) => setTimeout(resolve, 0));
      const visibleText = (node) => {
        if (!node) return '';
        const walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT, {
          acceptNode(textNode) {
            const parent = textNode.parentElement;
            if (!parent) return NodeFilter.FILTER_REJECT;
            if (parent.closest('[hidden], [aria-hidden="true"]')) return NodeFilter.FILTER_REJECT;
            const style = getComputedStyle(parent);
            if (style.display === 'none' || style.visibility === 'hidden') return NodeFilter.FILTER_REJECT;
            return NodeFilter.FILTER_ACCEPT;
          },
        });
        const parts = [];
        while (walker.nextNode()) {
          const text = walker.currentNode.nodeValue.trim();
          if (text) parts.push(text);
        }
        return parts.join(' ');
      };
      const text = (selector) => document.querySelector(selector)?.textContent?.trim() || '';
      const hidden = (selector) => document.querySelector(selector)?.hidden === true;
      const ariaHidden = (selector) => document.querySelector(selector)?.getAttribute('aria-hidden') || '';
      const header = document.querySelector('[data-v6-workstation-header]');
      const readiness = document.querySelector('[data-v6-readiness-surface]');
      return JSON.stringify({
        readinessInHeader: Boolean(header?.querySelector('[data-v6-readiness-surface]')),
        readinessHidden: readiness?.hidden ?? false,
        standaloneReadiness: Boolean(document.querySelector('[data-v6-workstation-shell] > [data-v6-readiness-surface]')),
        readinessState: text('[data-v6-readiness-state]'),
        readinessDetail: text('[data-v6-readiness-missing]'),
        runtimeText: text('[data-v6-readiness-runtime-count]'),
        commandText: text('[data-v6-readiness-command-count]'),
        gateText: text('[data-v6-readiness-gate-count]'),
        runtimeHidden: hidden('[data-v6-readiness-runtime-count]'),
        commandHidden: hidden('[data-v6-readiness-command-count]'),
        gateHidden: hidden('[data-v6-readiness-gate-count]'),
        gateListHidden: hidden('[data-v6-readiness-gates]'),
        runtimeAriaHidden: ariaHidden('[data-v6-readiness-runtime-count]'),
        commandAriaHidden: ariaHidden('[data-v6-readiness-command-count]'),
        gateAriaHidden: ariaHidden('[data-v6-readiness-gate-count]'),
        gateListAriaHidden: ariaHidden('[data-v6-readiness-gates]'),
        visibleHeaderText: visibleText(header),
        visibleBodyText: visibleText(document.body),
        readinessReady: readiness?.dataset.ready || '',
        readinessRunning: readiness?.dataset.running || '',
        workstationHidden: document.querySelector('[data-v6-workstation-main]')?.hidden ?? true,
        rootSurface: root?.dataset.v6Surface || '',
        controllerState: root?.__v6ReadinessSurface?.getState?.(),
      });
    })()
  `));

  assert.equal(value.readinessInHeader, true);
  assert.equal(value.readinessHidden, true);
  assert.equal(value.standaloneReadiness, false);
  assert.equal(value.workstationHidden, false);
  assert.equal(value.rootSurface, 'workstation');
  assert.equal(value.readinessState, 'System ready');
  assert.equal(value.readinessDetail, 'Replay workstation is ready');
  assert.match(value.runtimeText, /services active/);
  assert.equal(value.commandText, 'Commands ready');
  assert.equal(value.gateText, 'Core checks passed');
  assert.equal(value.runtimeHidden, true);
  assert.equal(value.commandHidden, true);
  assert.equal(value.gateHidden, true);
  assert.equal(value.gateListHidden, true);
  assert.equal(value.runtimeAriaHidden, 'true');
  assert.equal(value.commandAriaHidden, 'true');
  assert.equal(value.gateAriaHidden, 'true');
  assert.equal(value.gateListAriaHidden, 'true');
  assert.equal(value.visibleHeaderText.includes('System ready'), false);
  assert.equal(value.visibleHeaderText.includes('services active'), false);
  assert.equal(value.visibleHeaderText.includes('Commands ready'), false);
  assert.equal(value.visibleHeaderText.includes('Core checks passed'), false);
  assert.equal(value.visibleBodyText.includes('boundary-smoke.js'), false);
  assert.equal(value.visibleBodyText.includes('Cache-hit latency'), false);
  assert.equal(value.visibleBodyText.includes('mixed-timeframe-visible-latency-browser-smoke.js'), false);
  assert.equal(value.readinessReady, 'true');
  assert.equal(value.readinessRunning, 'true');
  assert.equal(value.controllerState.ready, true);
  assert.equal(value.controllerState.running, true);
  assert.equal(value.controllerState.commandLabel, 'Commands ready');
  assert.match(value.controllerState.runtimeLabel, /services active/);

  assert.deepEqual(
    getVisibleRecentSessionRowActions().map((action) => action.id),
    ['summary', 'analytics', 'copy', 'journal'],
  );
} finally {
  await page.cleanup();
}

console.log('v6 diagnostics visibility cleanup browser smoke passed');
