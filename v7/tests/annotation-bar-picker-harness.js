import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createStaticServer } from '../scripts/static-server.mjs';
import {
  createLightweightAnnotationInteractionPort,
} from '../src/annotation-chart-projection/public.js';
import {
  AnnotationBarPickerError,
  createExactAnnotationBarPickerController,
  createExactAnnotationBarSelection,
  readExactAnnotationBarSelection,
} from '../src/annotation-bar-picker/public.js';
import { connectCdp, evaluate, waitFor } from './support/cdp-client.js';

const TEST_DIR = path.dirname(fileURLToPath(import.meta.url));
const V7_ROOT = path.resolve(TEST_DIR, '..');
const negativeCases = JSON.parse(fs.readFileSync(path.join(
  TEST_DIR,
  'fixtures/annotation-bar-picker/negative/cases.json',
), 'utf8'));
const BASE = 1_700_000_000_000;

function createFakeBarPickerPort({ acquireFailure = null } = {}) {
  let active = null;
  let lastHandlers = null;
  let leaseRevision = 0;

  function requireActive() {
    if (active === null) throw new Error('fake Bar Picker has no active lease');
    return active;
  }

  return Object.freeze({
    acquireBarPicker(handlers) {
      if (acquireFailure) throw acquireFailure;
      if (active !== null) throw new Error('fake Bar Picker lease already active');
      const record = { handlers, leaseRevision: ++leaseRevision };
      active = record;
      lastHandlers = handlers;
      return Object.freeze({
        release(reason = 'released') {
          if (active !== record) return;
          active = null;
          handlers.onCancel(Object.freeze({ reason }));
        },
      });
    },
    cancel(reason = 'cancelled') {
      const record = requireActive();
      active = null;
      record.handlers.onCancel(Object.freeze({ reason }));
    },
    candidate(sequence, overrides = {}) {
      requireActive().handlers.onCandidate(sequence === null ? null : Object.freeze({
        barStartEpochMs: BASE + (sequence * 60_000),
        paneId: 'pane-main',
        sequence,
        ...overrides,
      }));
    },
    repeatSelect(sequence, overrides = {}) {
      lastHandlers?.onSelect(Object.freeze({
        barStartEpochMs: BASE + (sequence * 60_000),
        paneId: 'pane-main',
        sequence,
        ...overrides,
      }));
    },
    select(sequence, overrides = {}) {
      const record = requireActive();
      active = null;
      record.handlers.onSelect(Object.freeze({
        barStartEpochMs: BASE + (sequence * 60_000),
        paneId: 'pane-main',
        sequence,
        ...overrides,
      }));
    },
    snapshot: () => Object.freeze({ active: active !== null, leaseRevision }),
  });
}

function controllerFixture(options = {}) {
  const errors = [];
  const selections = [];
  const states = [];
  const port = options.port ?? createFakeBarPickerPort();
  const controller = createExactAnnotationBarPickerController({
    interactionPort: port,
    onError: (error) => errors.push(error),
    onSelection: (selection) => selections.push(selection),
    onStateChange: (state) => states.push(state),
  });
  return { controller, errors, port, selections, states };
}

const selected = controllerFixture();
assert.deepEqual(selected.controller.arm({ pickerId: 'picker.one' }), {
  acceptedSelectionCount: 0,
  candidateSelection: null,
  lastCancelReason: null,
  lastErrorCode: null,
  lastSelection: null,
  lastSequence: 0,
  pickerId: 'picker.one',
  status: 'armed',
});
selected.port.candidate(1);
assert.deepEqual(readExactAnnotationBarSelection(selected.controller.snapshot().candidateSelection), {
  barStartEpochMs: BASE + 60_000,
  paneId: 'pane-main',
  schemaVersion: 1,
});
selected.port.candidate(1, { barStartEpochMs: BASE + 120_000 });
assert.equal(
  selected.controller.snapshot().candidateSelection.barStartEpochMs,
  BASE + 60_000,
  'stale/equal event sequence must not replace the exact candidate',
);
selected.port.candidate(2);
selected.port.select(3);
selected.port.repeatSelect(4);
assert.equal(selected.selections.length, 1, 'one-shot Picker must emit one selection');
assert.equal(selected.controller.snapshot().acceptedSelectionCount, 1);
assert.equal(selected.controller.snapshot().lastSelection.barStartEpochMs, BASE + 180_000);
assert.equal(selected.controller.snapshot().status, 'idle');
assert.equal(selected.port.snapshot().active, false);

for (const reason of ['escape', 'secondary-button', 'focus-loss', 'pane-removed']) {
  const cancelled = controllerFixture();
  cancelled.controller.arm({ pickerId: `picker.${reason}` });
  cancelled.port.candidate(1);
  cancelled.port.cancel(reason);
  assert.equal(cancelled.selections.length, 0);
  assert.equal(cancelled.controller.snapshot().candidateSelection, null);
  assert.equal(cancelled.controller.snapshot().lastCancelReason, reason);
  assert.equal(cancelled.controller.snapshot().status, 'idle');
  cancelled.controller.dispose();
}

const callbackFailure = controllerFixture();
const throwingController = createExactAnnotationBarPickerController({
  interactionPort: callbackFailure.port,
  onSelection() { throw new Error('consumer failed'); },
});
throwingController.arm({ pickerId: 'picker.callback-failure' });
callbackFailure.port.select(1);
assert.equal(
  throwingController.snapshot().lastErrorCode,
  'ANNOTATION_BAR_PICKER_SELECTION_HANDLER_FAILED',
);
throwingController.dispose();

function eventOwner(extra = {}) {
  const listeners = new Map();
  return {
    ...extra,
    addEventListener(type, listener) { listeners.set(type, listener); },
    dispatch(type, event = {}) { listeners.get(type)?.(event); },
    listenerCount: () => listeners.size,
    removeEventListener(type, listener) {
      if (listeners.get(type) === listener) listeners.delete(type);
    },
  };
}

function concreteEnvironment({ resolver = ({ displayEpochMs }) => displayEpochMs } = {}) {
  const chartHandlers = { click: null, move: null };
  const options = {
    handleScale: { mouseWheel: true },
    handleScroll: { pressedMouseMove: true },
  };
  const target = eventOwner();
  const host = eventOwner({ getBoundingClientRect: () => ({ left: 0, top: 0 }) });
  const chart = {
    applyOptions(value) { Object.assign(options, value); },
    options: () => options,
    paneSize: () => ({ height: 400, width: 600 }),
    subscribeClick(handler) { chartHandlers.click = handler; },
    subscribeCrosshairMove(handler) { chartHandlers.move = handler; },
    timeScale: () => ({ coordinateToTime: (x) => 1_700_000_000 + x }),
    unsubscribeClick(handler) { if (chartHandlers.click === handler) chartHandlers.click = null; },
    unsubscribeCrosshairMove(handler) { if (chartHandlers.move === handler) chartHandlers.move = null; },
  };
  const series = { coordinateToPrice: (y) => 200 - y };
  const parameters = (time = 1_700_000_120) => ({
    point: { x: 100, y: 160 },
    seriesData: new Map([[series, { close: 102, high: 104, low: 99, open: 100, time }]]),
    time,
  });
  return {
    chart,
    chartHandlers,
    host,
    options,
    parameters,
    port: createLightweightAnnotationInteractionPort({
      chart,
      eventTarget: target,
      host,
      paneId: 'pane-main',
      resolveInstrumentId: () => 'instrument.nq',
      resolveMarketEpochMs: resolver,
      series,
    }),
    series,
    target,
  };
}

const concrete = concreteEnvironment();
const concreteCandidates = [];
const concreteSelections = [];
const concreteCancels = [];
const initialOptions = structuredClone(concrete.options);
const lease = concrete.port.acquireBarPicker({
  onCancel: (event) => concreteCancels.push(event),
  onCandidate: (event) => concreteCandidates.push(event),
  onSelect: (event) => concreteSelections.push(event),
});
assert.equal(concrete.port.snapshot().leaseKind, 'bar-picker');
assert.deepEqual(concrete.options, initialOptions, 'Bar Picker must not disable native navigation');
assert.throws(
  () => concrete.port.acquire({ onCancel() {}, onEnd() {}, onMove() {}, onStart() {} }),
  (error) => error.code === 'ANNOTATION_INTERACTION_LEASE_ACTIVE',
);
concrete.chartHandlers.move(concrete.parameters());
assert.deepEqual(concreteCandidates.at(-1), {
  barStartEpochMs: 1_700_000_120_000,
  paneId: 'pane-main',
  sequence: 1,
});
concrete.target.dispatch('pointerdown', {
  button: 0, clientX: 100, clientY: 160, isPrimary: true, pointerId: 7,
});
concrete.target.dispatch('blur');
assert.equal(concrete.port.snapshot().active, true, 'transient focus loss must not preempt an active click');
concrete.target.dispatch('pointermove', {
  button: 0, clientX: 106, clientY: 160, isPrimary: true, pointerId: 7,
});
concrete.target.dispatch('pointerup', {
  button: 0, clientX: 106, clientY: 160, isPrimary: true, pointerId: 7,
});
assert.equal(concreteSelections.length, 1);
assert.equal(concreteSelections[0].barStartEpochMs, 1_700_000_120_000);
assert.equal(concrete.port.snapshot().active, false);
assert.equal(concrete.chartHandlers.click, null);
assert.equal(concrete.chartHandlers.move, null);
lease.release('late-release');

concrete.port.acquireBarPicker({
  onCancel: (event) => concreteCancels.push(event),
  onCandidate: (event) => concreteCandidates.push(event),
  onSelect: (event) => concreteSelections.push(event),
});
concrete.chartHandlers.move(concrete.parameters(1_700_000_180));
concrete.chartHandlers.click(concrete.parameters(1_700_000_180));
assert.equal(concreteSelections.length, 2, 'official Chart click remains an acceptance path');
assert.equal(concreteSelections[1].barStartEpochMs, 1_700_000_180_000);

concrete.port.acquireBarPicker({
  onCancel: (event) => concreteCancels.push(event),
  onCandidate: (event) => concreteCandidates.push(event),
  onSelect: (event) => concreteSelections.push(event),
});
concrete.chartHandlers.move(concrete.parameters(1_700_000_210));
concrete.chartHandlers.move({ point: undefined, seriesData: new Map() });
concrete.chartHandlers.click({ point: { x: 100, y: 160 }, seriesData: new Map() });
assert.equal(
  concreteSelections.length,
  3,
  'official click must retain the exact same-slot candidate when click seriesData is transiently empty',
);
assert.equal(concreteSelections[2].barStartEpochMs, 1_700_000_210_000);

concrete.port.acquireBarPicker({
  onCancel: (event) => concreteCancels.push(event),
  onCandidate: (event) => concreteCandidates.push(event),
  onSelect: (event) => concreteSelections.push(event),
});
concrete.chartHandlers.move(concrete.parameters(1_700_000_220));
concrete.chartHandlers.move({ point: undefined, seriesData: new Map() });
concrete.chartHandlers.click({ point: { x: 140, y: 160 }, seriesData: new Map() });
assert.equal(concreteSelections.length, 3, 'a different-slot empty click must not reuse a stale candidate');
concrete.target.dispatch('keydown', { key: 'Escape', preventDefault() {} });

concrete.port.acquireBarPicker({
  onCancel: (event) => concreteCancels.push(event),
  onCandidate: (event) => concreteCandidates.push(event),
  onSelect: (event) => concreteSelections.push(event),
});
concrete.chartHandlers.move(concrete.parameters(1_700_000_240));
concrete.target.dispatch('pointerdown', {
  button: 0, clientX: 100, clientY: 160, isPrimary: true, pointerId: 8,
});
concrete.target.dispatch('pointermove', {
  button: 0, clientX: 140, clientY: 160, isPrimary: true, pointerId: 8,
});
concrete.target.dispatch('pointerup', {
  button: 0, clientX: 140, clientY: 160, isPrimary: true, pointerId: 8,
});
assert.equal(concreteSelections.length, 3, 'native pan-sized movement must not accept a Bar');
assert.equal(concrete.port.snapshot().active, true, 'a native pan leaves the one-shot Picker armed');
concrete.chartHandlers.move({ point: undefined, seriesData: new Map() });
assert.equal(concreteCandidates.at(-1), null, 'outside-plot move must clear the candidate');
concrete.target.dispatch('keydown', { key: 'Escape', preventDefault() {} });

concrete.port.acquireBarPicker({
  onCancel: (event) => concreteCancels.push(event),
  onCandidate() {},
  onSelect() {},
});
let prevented = 0;
let stopped = 0;
concrete.target.dispatch('pointerdown', {
  button: 2, clientX: 100, clientY: 160,
  preventDefault() { prevented += 1; },
  stopImmediatePropagation() { stopped += 1; },
});
assert.equal(concreteCancels.at(-1).reason, 'secondary-button');
assert.equal(prevented, 1);
assert.equal(stopped, 1);
assert.equal(concrete.port.snapshot().active, false);

concrete.port.acquireBarPicker({
  onCancel: (event) => concreteCancels.push(event),
  onCandidate() {},
  onSelect() {},
});
concrete.target.dispatch('blur');
assert.equal(concreteCancels.at(-1).reason, 'focus-loss');
assert.equal(concrete.port.snapshot().active, false, 'idle focus loss must still cancel immediately');

concrete.port.acquireBarPicker({
  onCancel: (event) => concreteCancels.push(event),
  onCandidate() {},
  onSelect() {},
});
concrete.target.dispatch('keydown', { key: 'Escape', preventDefault() { prevented += 1; } });
assert.equal(concreteCancels.at(-1).reason, 'escape');
assert.equal(concrete.port.snapshot().active, false);
concrete.port.dispose();
assert.equal(concrete.host.listenerCount(), 0);
assert.equal(concrete.target.listenerCount(), 0);

const resolutionFailure = concreteEnvironment({ resolver: () => -1 });
const resolutionCancels = [];
resolutionFailure.port.acquireBarPicker({
  onCancel: (event) => resolutionCancels.push(event),
  onCandidate() {},
  onSelect() {},
});
resolutionFailure.chartHandlers.move(resolutionFailure.parameters());
assert.equal(resolutionCancels[0].reason, 'bar-resolution-failed');
resolutionFailure.port.dispose();

async function errorFor(operation) {
  try { await operation(); } catch (error) { return error; }
  assert.fail('negative operation unexpectedly succeeded');
}

const operations = {
  'selection-extra': () => createExactAnnotationBarSelection({
    barStartEpochMs: BASE, extra: true, paneId: 'pane-main', schemaVersion: 1,
  }),
  'selection-lookalike': () => readExactAnnotationBarSelection({
    barStartEpochMs: BASE, paneId: 'pane-main', schemaVersion: 1,
  }),
  'selection-epoch': () => createExactAnnotationBarSelection({
    barStartEpochMs: -1, paneId: 'pane-main', schemaVersion: 1,
  }),
  'selection-pane': () => createExactAnnotationBarSelection({
    barStartEpochMs: BASE, paneId: ' bad', schemaVersion: 1,
  }),
  'arm-extra': () => controllerFixture().controller.arm({ pickerId: 'picker.one', extra: true }),
  'arm-id': () => controllerFixture().controller.arm({ pickerId: ' bad' }),
  'arm-busy': () => {
    const fixture = controllerFixture();
    fixture.controller.arm({ pickerId: 'picker.one' });
    fixture.controller.arm({ pickerId: 'picker.two' });
  },
  'port-invalid': () => createExactAnnotationBarPickerController({ interactionPort: {} }),
  'callback-invalid': () => createExactAnnotationBarPickerController({
    interactionPort: createFakeBarPickerPort(), onSelection: null,
  }),
  'candidate-invalid': () => {
    const fixture = controllerFixture();
    fixture.controller.arm({ pickerId: 'picker.invalid-event' });
    fixture.port.candidate(1, { paneId: ' bad' });
    throw fixture.errors[0];
  },
  'acquire-failed': () => controllerFixture({
    port: createFakeBarPickerPort({ acquireFailure: new Error('unavailable') }),
  }).controller.arm({ pickerId: 'picker.acquire' }),
  disposed: () => {
    const fixture = controllerFixture();
    fixture.controller.dispose();
    fixture.controller.arm({ pickerId: 'picker.disposed' });
  },
};

assert.equal(negativeCases.schemaVersion, 1);
for (const testCase of negativeCases.cases) {
  const error = await errorFor(operations[testCase.operation]);
  assert.ok(error instanceof AnnotationBarPickerError, testCase.name);
  assert.equal(error.code, testCase.expectedCode, testCase.name);
}

const descriptor = JSON.parse(fs.readFileSync(
  path.join(V7_ROOT, 'src/annotation-bar-picker/module.json'),
  'utf8',
));
assert.equal(descriptor.id, 'optional.annotation-bar-picker');
assert.equal(descriptor.owner, 'annotation-interaction-controller');
assert.deepEqual(descriptor.requiredPorts, ['optional.annotation-chart-projection']);
assert.equal(descriptor.removable, true);
const moduleSource = fs.readdirSync(path.join(V7_ROOT, 'src/annotation-bar-picker'))
  .filter((file) => file.endsWith('.js'))
  .map((file) => fs.readFileSync(path.join(V7_ROOT, 'src/annotation-bar-picker', file), 'utf8'))
  .join('\n');
assert.doesNotMatch(
  moduleSource,
  /(?:\.\s*(?:setData|update|setVisibleRange|setPosition)|\b(?:requestRawBars|requestProjectedHistory|fetch|XMLHttpRequest)\s*\()/,
  'Bar Picker controller module must not acquire vendor, owner, or Bar-request authority',
);
assert.doesNotMatch(
  moduleSource,
  /from\s+['"][^'"]*(?:lightweight|bar-data|replay|workspace|annotation-runtime)[^'"]*['"]/,
  'Bar Picker controller module must import no vendor or state-owner implementation',
);

const repositoryRoot = path.resolve(TEST_DIR, '../..');
const userDataDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'v7-annotation-bar-picker-'));
const server = createStaticServer(repositoryRoot, {
  additionalPublicPathPrefixes: ['/v7/tests/fixtures/annotation-bar-picker/'],
});
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const chrome = spawn('/usr/bin/google-chrome', [
  '--headless=new', '--no-sandbox', '--disable-gpu', '--disable-breakpad',
  '--disable-crash-reporter', '--no-first-run', '--no-default-browser-check',
  '--disable-background-timer-throttling', '--disable-renderer-backgrounding',
  '--remote-debugging-port=0', '--window-size=1400,850',
  `--user-data-dir=${userDataDirectory}`, 'about:blank',
], { stdio: 'ignore' });

async function waitForDevtools() {
  const file = path.join(userDataDirectory, 'DevToolsActivePort');
  const deadline = Date.now() + 8_000;
  while (Date.now() < deadline) {
    if (fs.existsSync(file)) return fs.readFileSync(file, 'utf8').split(/\r?\n/)[0];
    await new Promise((resolve) => setTimeout(resolve, 25));
  }
  throw new Error('Chrome DevTools endpoint did not start.');
}

let cdp;
try {
  const debugPort = await waitForDevtools();
  const targets = await (await fetch(`http://127.0.0.1:${debugPort}/json/list`)).json();
  cdp = await connectCdp(targets.find((target) => target.type === 'page').webSocketDebuggerUrl);
  await cdp.send('Page.enable');
  await cdp.send('Runtime.enable');
  await cdp.send('Page.navigate', {
    url: `http://127.0.0.1:${server.address().port}/v7/tests/fixtures/annotation-bar-picker/`,
  });
  await waitFor(cdp, `document.querySelector('#chart')?.dataset.scenario === 'ready'`, 15_000);
  const point = await evaluate(cdp, 'globalThis.__annotationBarPickerFixture.clientPointForIndex(40)');
  await evaluate(cdp, 'globalThis.__annotationBarPickerFixture.arm()');
  await cdp.send('Input.dispatchMouseEvent', {
    button: 'none', buttons: 0, type: 'mouseMoved', ...point,
  });
  await waitFor(
    cdp,
    'globalThis.__annotationBarPickerFixture.snapshot().controller.candidateSelection !== null',
    10_000,
  );
  const candidate = await evaluate(cdp, 'globalThis.__annotationBarPickerFixture.snapshot()');
  assert.equal(candidate.controller.status, 'armed');
  assert.equal(candidate.controller.candidateSelection.barStartEpochMs, BASE + (40 * 60_000));
  assert.equal(candidate.highlight.projectionCount, 1);
  assert.equal(candidate.interaction.leaseKind, 'bar-picker');
  assert.equal(candidate.nativeOptionsUnchanged, true);
  assert.equal(await evaluate(cdp, 'document.querySelector("#chart").dataset.highlightColor'), '#22d3ee');

  await cdp.send('Input.dispatchMouseEvent', {
    button: 'left', buttons: 1, clickCount: 1, type: 'mousePressed', ...point,
  });
  await evaluate(cdp, 'window.dispatchEvent(new Event("blur"))');
  await cdp.send('Input.dispatchMouseEvent', {
    button: 'left', buttons: 1, type: 'mouseMoved', x: point.x + 6, y: point.y,
  });
  await cdp.send('Input.dispatchMouseEvent', {
    button: 'left', buttons: 0, clickCount: 1, type: 'mouseReleased',
    x: point.x + 6, y: point.y,
  });
  await waitFor(
    cdp,
    'globalThis.__annotationBarPickerFixture.snapshot().controller.acceptedSelectionCount === 1',
    10_000,
  );
  await waitFor(
    cdp,
    'globalThis.__annotationBarPickerFixture.snapshot().highlight.projectionCount === 1',
    10_000,
  );
  const accepted = await evaluate(cdp, 'globalThis.__annotationBarPickerFixture.snapshot()');
  assert.equal(accepted.controller.status, 'idle');
  assert.equal(accepted.controller.lastSelection.barStartEpochMs, BASE + (40 * 60_000));
  assert.equal(accepted.selections.length, 1);
  assert.equal(accepted.interaction.active, false);
  assert.equal(accepted.beforeData, accepted.afterData);
  assert.equal(accepted.nativeOptionsUnchanged, true);
  assert.equal(await evaluate(cdp, 'document.querySelector("#chart").dataset.highlightColor'), '#a3e635');
  assert.match(await evaluate(cdp, 'document.querySelector("#status").textContent'), /^Selected/);

  await evaluate(cdp, 'globalThis.__annotationBarPickerFixture.arm()');
  await cdp.send('Input.dispatchKeyEvent', { key: 'Escape', type: 'keyDown' });
  await waitFor(
    cdp,
    'globalThis.__annotationBarPickerFixture.snapshot().controller.status === "idle"',
    10_000,
  );
  const escaped = await evaluate(cdp, 'globalThis.__annotationBarPickerFixture.snapshot()');
  assert.equal(escaped.controller.lastCancelReason, 'escape');
  assert.equal(escaped.controller.acceptedSelectionCount, 1);
} finally {
  if (cdp) cdp.close();
  chrome.kill('SIGTERM');
  await new Promise((resolve) => chrome.once('exit', resolve));
  await new Promise((resolve) => server.close(resolve));
  await fs.promises.rm(userDataDirectory, {
    force: true, maxRetries: 10, recursive: true, retryDelay: 100,
  });
}

selected.controller.dispose();
console.log(`v7 annotation Bar Picker harness passed (${negativeCases.cases.length} negative controls)`);
