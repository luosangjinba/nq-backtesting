import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const repoRoot = resolve('.');
const replayRuntimeSource = readFileSync(
  resolve(repoRoot, 'v5/src/runtime/replay-runtime.js'),
  'utf8'
);

const mutationHelperCalls = [
  'resolveStartBar(',
  'loadInitialPrefix(',
  'loadInitialSession(',
  'loadPrefixDemand(',
  'applyPrefixRetention(',
  'next(',
  'play(',
  'pause(',
  'setPlayback(',
];

function extractCallSource(source, startIndex) {
  let depth = 0;
  for (let index = startIndex; index < source.length; index += 1) {
    const char = source[index];
    if (char === '(') depth += 1;
    if (char === ')') {
      depth -= 1;
      if (depth === 0) {
        return source.slice(startIndex, index + 1);
      }
    }
  }
  throw new Error('subscribeEvent call is not balanced.');
}

function listSubscribeEventCalls(source) {
  const calls = [];
  let searchFrom = 0;
  while (searchFrom < source.length) {
    const index = source.indexOf('subscribeEvent(', searchFrom);
    if (index === -1) break;
    calls.push(extractCallSource(source, index));
    searchFrom = index + 'subscribeEvent('.length;
  }
  return calls;
}

const subscribeEventCalls = listSubscribeEventCalls(replayRuntimeSource);
assert.ok(subscribeEventCalls.length > 0, 'replay runtime must have event subscriptions to guard');

const eventMutationViolations = subscribeEventCalls.flatMap((callSource) => {
  const eventMatch = callSource.match(/subscribeEvent\(([^,\n]+)/);
  const eventName = eventMatch?.[1]?.trim() || 'unknown event';

  const violations = [];
  for (const helperCall of mutationHelperCalls) {
    if (callSource.includes(helperCall)) {
      violations.push(`${eventName}: handler must not call ${helperCall} directly`);
    }
  }
  if (!callSource.includes('dispatchCommand(')) {
    violations.push(`${eventName}: handler must dispatch a command for mutation`);
  }
  return violations;
});

assert.deepEqual(eventMutationViolations, []);

console.log('v5 runtime boundary smoke passed');
