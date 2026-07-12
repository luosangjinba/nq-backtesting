import assert from 'node:assert/strict';
import { evaluate } from '../../v4/tests/helpers/browser-cdp-client.js';
import { openV6Page } from './helpers/v6-browser-harness.js';

const page = await openV6Page({ height: 900, width: 1440 });

try {
  const value = JSON.parse(await evaluate(page.client, `
    (async () => {
      const commands = await import('/v6/src/runtime/commands.js');
      const contracts = await import('/v6/src/contracts/app-contracts.js');

      const sleep = (ms = 0) => new Promise((resolve) => setTimeout(resolve, ms));
      const readoutState = (paneId = 'main') => {
        const readout = document.querySelector(
          '[data-v6-pane-status-readout][data-v6-pane-id="' + paneId + '"] [data-v6-target-materialization-diagnostics]',
        );
        return {
          exists: Boolean(readout),
          hidden: readout?.hidden ?? null,
          mode: readout?.dataset.v6TargetMaterializationDiagnosticsMode || '',
          paneId: readout?.dataset.v6TargetMaterializationDiagnosticsPaneId || '',
          reason: readout?.dataset.v6TargetMaterializationDiagnosticsReason || '',
          rows: [...(readout?.querySelectorAll('[data-v6-target-materialization-diagnostics-row]') || [])].map((row) => ({
            field: row.dataset.v6TargetMaterializationDiagnosticsField || '',
            text: row.textContent || '',
            value: row.dataset.v6TargetMaterializationDiagnosticsValue || '',
          })),
          snapshotReady: readout?.dataset.v6TargetMaterializationDiagnosticsSnapshotReady || '',
          text: readout?.textContent || '',
          title: readout?.title || '',
        };
      };

      await sleep(0);
      const initial = {
        count: document.querySelectorAll('[data-v6-pane-status-readout] [data-v6-target-materialization-diagnostics]').length,
        main: readoutState('main'),
        secondary: readoutState('secondary'),
        tertiary: readoutState('tertiary'),
      };

      await commands.dispatchCommand(contracts.TARGET_MATERIALIZATION_REPLAY_DIAGNOSTICS_COMMANDS.UPDATE_SNAPSHOT, {
        displayTimeframe: '8h',
        fallbackStatus: 'available',
        manualNextStatus: 'advanced',
        paneId: 'main',
        projectionOwner: 'runtime.bar-data',
        sourceCursorAuthority: true,
        targetBarsDisplayInputOnly: true,
        targetHistoryStatus: 'applied',
      });
      await sleep(0);
      const active = readoutState('main');

      await commands.dispatchCommand(contracts.TARGET_MATERIALIZATION_REPLAY_DIAGNOSTICS_COMMANDS.UPDATE_SNAPSHOT, {
        autoPlayStatus: 'ticked',
        displayTimeframe: '1D',
        fallbackStatus: 'target-history-empty',
        manualNextStatus: 'advanced',
        paneId: 'main',
        projectionOwner: 'source-projection',
        sourceCursorAuthority: true,
        targetBarsDisplayInputOnly: true,
        targetHistoryStatus: 'fallback',
      });
      await sleep(0);
      const fallback = readoutState('main');

      await commands.dispatchCommand(contracts.TARGET_MATERIALIZATION_REPLAY_DIAGNOSTICS_COMMANDS.UPDATE_SNAPSHOT, {
        displayTimeframe: '1m',
        fallbackStatus: 'target-history-disabled',
        paneId: 'main',
        projectionOwner: 'source-projection',
        sourceCursorAuthority: true,
        targetBarsDisplayInputOnly: true,
        targetHistoryStatus: 'disabled',
      });
      await sleep(0);
      const normal = readoutState('main');

      return JSON.stringify({ active, fallback, initial, normal });
    })()
  `));

  assert.equal(value.initial.count, 3);
  assert.equal(value.initial.main.exists, true);
  assert.equal(value.initial.main.hidden, true);
  assert.equal(value.initial.main.mode, 'hidden');
  assert.equal(value.initial.secondary.exists, true);
  assert.equal(value.initial.secondary.hidden, true);
  assert.equal(value.initial.secondary.paneId, 'secondary');
  assert.equal(value.initial.tertiary.exists, true);
  assert.equal(value.initial.tertiary.hidden, true);
  assert.equal(value.initial.tertiary.paneId, 'tertiary');

  assert.equal(value.active.hidden, false);
  assert.equal(value.active.mode, 'collapsed');
  assert.equal(value.active.reason, 'target-history-active');
  assert.deepEqual(value.active.rows.map((row) => row.field), [
    'displayTimeframe',
    'targetHistoryStatus',
    'projectionOwner',
    'manualNextStatus',
    'autoPlayStatus',
    'fallbackStatus',
  ]);
  assert.match(value.active.text, /TF 8h/);
  assert.match(value.active.text, /Target applied/);
  assert.match(value.active.text, /Projection runtime\.bar-data/);
  assert.match(value.active.text, /Next advanced/);
  assert.match(value.active.text, /Fallback available/);
  assert.doesNotMatch(value.active.text, /sourceCursorAuthority|targetBarsDisplayInputOnly|latestSourceTimestamp/);
  assert.match(value.active.title, /Replay cursor authority: source 1m/);

  assert.equal(value.fallback.hidden, false);
  assert.equal(value.fallback.mode, 'collapsed');
  assert.equal(value.fallback.reason, 'fallback');
  assert.match(value.fallback.text, /TF 1D/);
  assert.match(value.fallback.text, /Target fallback/);
  assert.match(value.fallback.text, /Fallback target-history-empty/);

  assert.equal(value.normal.hidden, true);
  assert.equal(value.normal.mode, 'hidden');
  assert.equal(value.normal.reason, 'normal-replay');
  assert.equal(value.normal.rows.length, 0);
  assert.equal(value.normal.text, '');
} finally {
  await page.cleanup();
}

console.log('v6 target materialization replay diagnostics readout dom wiring browser step351 smoke passed');
