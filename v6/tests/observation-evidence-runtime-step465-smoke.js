import assert from 'node:assert/strict';
import { createObservationEvidenceRuntime } from '../src/validation-observation/observation-evidence-runtime.js';
import { PANE_COMMANDS, REPLAY_COMMANDS, VALIDATION_OBSERVATION_COMMANDS } from '../src/contracts/app-contracts.js';
import { clearCommandsForTest, dispatchCommand } from '../src/runtime/commands.js';
import { createRuntimeRegistry } from '../src/runtime/lifecycle.js';

clearCommandsForTest();
let created = null;
const repository = {
  async create(value) { created = value; return value; },
  async getEvidence() { return null; }, async getObservation() { return null; },
  async listEvidence() { return []; }, async listObservations() { return []; }, async open() {}, async close() {},
};
const dispatch = async (command) => {
  if (command === REPLAY_COMMANDS.GET_STATE) return { cursorTime: '2026-01-01T10:00:00Z', sessionId: 's', status: 'ready', symbol: 'NQ', timeframe: '1m' };
  if (command === PANE_COMMANDS.GET_ACTIVE) return { displayTimeframe: '5m', id: 'primary', instrument: 'NQ' };
  throw new Error(`unexpected ${command}`);
};
const registry = createRuntimeRegistry();
registry.registerRuntime(createObservationEvidenceRuntime({ dispatchCommand: dispatch, now: () => 10, repository }));
await registry.start();
const result = await dispatchCommand(VALIDATION_OBSERVATION_COMMANDS.CAPTURE, { category: 'setup', evidenceId: 'e', observationId: 'o', price: 25000, text: 'Setup', time: '2026-01-01T09:59:00Z', trialId: 't' });
assert.equal(result.status, 'captured');
assert.equal(created.evidence.timeframe, '5m');
assert.equal(created.evidence.replayVisibleThroughTime, '2026-01-01T10:00:00Z');
await registry.stop();
clearCommandsForTest();
console.log('v6 observation evidence runtime step465 smoke passed');
