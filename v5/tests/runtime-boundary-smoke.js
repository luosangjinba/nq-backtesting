import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const repoRoot = resolve('.');
const replayRuntimeSource = readFileSync(
  resolve(repoRoot, 'v5/src/runtime/replay-runtime.js'),
  'utf8'
);

const eventMutationViolations = [
  {
    event: 'CHART_EVENTS.PREFIX_DEMAND',
    forbiddenCall: 'loadPrefixDemand(',
    requiredCommand: 'REPLAY_COMMANDS.LOAD_PREFIX_DEMAND',
  },
  {
    event: 'CHART_EVENTS.VISIBLE_RANGE_CHANGED',
    forbiddenCall: 'applyPrefixRetention(',
    requiredCommand: 'REPLAY_COMMANDS.APPLY_PREFIX_RETENTION',
  },
].flatMap(({ event, forbiddenCall, requiredCommand }) => {
  const subscriptionIndex = replayRuntimeSource.indexOf(`subscribeEvent(${event}`);
  assert.notEqual(subscriptionIndex, -1, `replay runtime must subscribe to ${event}`);

  const nextSubscriptionIndex = replayRuntimeSource.indexOf('subscribeEvent(', subscriptionIndex + 1);
  const handlerSource = replayRuntimeSource.slice(
    subscriptionIndex,
    nextSubscriptionIndex === -1 ? replayRuntimeSource.length : nextSubscriptionIndex
  );

  const violations = [];
  if (handlerSource.includes(forbiddenCall)) {
    violations.push(`${event}: handler must not call ${forbiddenCall} directly`);
  }
  if (!handlerSource.includes(`dispatchCommand(${requiredCommand}`)) {
    violations.push(`${event}: handler must dispatch ${requiredCommand}`);
  }
  return violations;
});

assert.deepEqual(eventMutationViolations, []);

console.log('v5 runtime boundary smoke passed');
