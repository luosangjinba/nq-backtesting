import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const repoRoot = resolve('.');
const replayRuntimeSource = readFileSync(
  resolve(repoRoot, 'v5/src/runtime/replay-runtime.js'),
  'utf8'
);
const replayPrefixControllerSource = readFileSync(
  resolve(repoRoot, 'v5/src/runtime/replay-prefix-controller.js'),
  'utf8'
);
const replayDisplayWindowControllerSource = readFileSync(
  resolve(repoRoot, 'v5/src/runtime/replay-display-window-controller.js'),
  'utf8'
);
const replayPlaybackControllerSource = readFileSync(
  resolve(repoRoot, 'v5/src/runtime/replay-playback-controller.js'),
  'utf8'
);
const replayNavigationControllerSource = readFileSync(
  resolve(repoRoot, 'v5/src/runtime/replay-navigation-controller.js'),
  'utf8'
);

assert.ok(
  replayRuntimeSource.includes('createReplayPrefixController('),
  'replay runtime must delegate prefix demand/retention to the prefix controller'
);
assert.ok(
  !replayRuntimeSource.includes('async function loadPrefixDemand(')
    && !replayRuntimeSource.includes('async function applyPrefixRetention('),
  'replay runtime must not own prefix demand/retention implementations'
);
assert.ok(
  replayPrefixControllerSource.includes('async function loadPrefixDemand(')
    && replayPrefixControllerSource.includes('async function applyPrefixRetention('),
  'replay prefix controller must own prefix demand/retention implementations'
);
assert.ok(
  replayRuntimeSource.includes('createReplayDisplayWindowController('),
  'replay runtime must delegate display-window loading to the display-window controller'
);
assert.ok(
  !replayRuntimeSource.includes('async function loadDisplayWindow(')
    && !replayRuntimeSource.includes('async function setDisplayTimeframe(')
    && !replayRuntimeSource.includes('async function projectDisplayForCursor('),
  'replay runtime must not own display-window implementations'
);
assert.ok(
  replayDisplayWindowControllerSource.includes('async function loadDisplayWindow(')
    && replayDisplayWindowControllerSource.includes('async function setDisplayTimeframe(')
    && replayDisplayWindowControllerSource.includes('async function projectDisplayForCursor('),
  'replay display-window controller must own display-window implementations'
);
assert.ok(
  replayRuntimeSource.includes('createReplayPlaybackController('),
  'replay runtime must delegate playback state to the playback controller'
);
assert.ok(
  !replayRuntimeSource.includes('function play(')
    && !replayRuntimeSource.includes('function pause(')
    && !replayRuntimeSource.includes('function setPlayback(')
    && !replayRuntimeSource.includes('async function playTick('),
  'replay runtime must not own playback implementations'
);
assert.ok(
  replayPlaybackControllerSource.includes('function play(')
    && replayPlaybackControllerSource.includes('function pause(')
    && replayPlaybackControllerSource.includes('function setPlayback(')
    && replayPlaybackControllerSource.includes('async function tick('),
  'replay playback controller must own playback implementations'
);
assert.ok(
  replayRuntimeSource.includes('createReplayNavigationController('),
  'replay runtime must delegate cursor navigation to the navigation controller'
);
assert.ok(
  !replayRuntimeSource.includes('async function next(')
    && !replayRuntimeSource.includes('async function previous(')
    && !replayRuntimeSource.includes('async function truncateToTimestamp(')
    && !replayRuntimeSource.includes('async function reset('),
  'replay runtime must not own cursor navigation implementations'
);
assert.ok(
  replayNavigationControllerSource.includes('async function next(')
    && replayNavigationControllerSource.includes('async function previous(')
    && replayNavigationControllerSource.includes('async function truncateToTimestamp(')
    && replayNavigationControllerSource.includes('async function reset('),
  'replay navigation controller must own cursor navigation implementations'
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
