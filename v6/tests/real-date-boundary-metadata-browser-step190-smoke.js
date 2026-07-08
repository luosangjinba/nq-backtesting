import assert from 'node:assert/strict';
import { evaluate } from '../../v4/tests/helpers/browser-cdp-client.js';
import { openV6Page } from './helpers/v6-browser-harness.js';

const boundaries = [
  '2026-04-26 18:00',
  '2026-05-03 18:00',
  '2026-05-10 18:00',
  '2026-05-31 18:00',
];

const page = await openV6Page({ height: 820, width: 1360 });

try {
  const value = JSON.parse(await evaluate(page.client, `
    (async () => JSON.stringify(await (async () => {
      const commands = await import('/v6/src/runtime/commands.js');
      const contracts = await import('/v6/src/contracts/app-contracts.js');
      const boundaries = ${JSON.stringify(boundaries)};
      const results = [];

      function minuteShift(value, minutes) {
        const parsed = Date.parse(value.replace(' ', 'T') + 'Z') + (minutes * 60 * 1000);
        return new Date(parsed).toISOString().slice(0, 16).replace('T', ' ');
      }

      for (const boundary of boundaries) {
        const emptyWindow = {
          end: minuteShift(boundary, -1),
          instrument: 'NQ',
          start: minuteShift(boundary, -5),
          timeframe: 1,
        };
        const dataWindow = {
          end: minuteShift(boundary, 5),
          instrument: 'NQ',
          start: boundary,
          timeframe: 1,
        };
        await commands.dispatchCommand(contracts.BAR_DATA_COMMANDS.LOAD_WINDOW, emptyWindow);
        await commands.dispatchCommand(contracts.BAR_DATA_COMMANDS.LOAD_WINDOW, dataWindow);
        const metadata = await commands.dispatchCommand(contracts.BAR_DATA_COMMANDS.GET_BOUNDARY_METADATA, {
          instrument: 'NQ',
          timeframe: 1,
        });
        results.push({
          boundary,
          metadata,
        });
        await commands.dispatchCommand(contracts.BAR_DATA_COMMANDS.RELEASE_WINDOW, emptyWindow);
        await commands.dispatchCommand(contracts.BAR_DATA_COMMANDS.RELEASE_WINDOW, dataWindow);
      }

      return {
        afterRelease: await commands.dispatchCommand(contracts.BAR_DATA_COMMANDS.GET_BOUNDARY_METADATA, {
          instrument: 'NQ',
          timeframe: 1,
        }),
        results,
      };
    })()))()
  `));

  assert.equal(value.results.length, boundaries.length);
  for (const result of value.results) {
    assert.equal(result.metadata.scope.instrument, 'NQ');
    assert.equal(result.metadata.scope.timeframe, 1);
    assert.equal(result.metadata.scopes.length, 1);
    const [scope] = result.metadata.scopes;
    assert.equal(scope.earliestLoadedTime, result.boundary);
    assert.equal(scope.emptyWindowCount, 1);
    assert.equal(scope.loadedWindowCount, 1);
    assert.equal(scope.loadedBarCount >= 6, true);
    assert.equal(scope.windowCount, 2);
  }
  assert.deepEqual(value.afterRelease.scopes, []);
} finally {
  await page.cleanup();
}

console.log('v6 real-date boundary metadata browser step 190 smoke passed');
