import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  AnnotationGeometryError,
  createGeometryRegistry,
  createInitialGeometryRegistry,
  createMarketAnchor,
  createPointGeometry,
  createRectangleGeometry,
  createSegmentGeometry,
  defineGeometryType,
  GEOMETRY_TYPE_IDS,
  readDrawingGeometry,
  readGeometryTypeDefinition,
  readMarketAnchor,
} from '../src/annotation-geometry-domain/public.js';
import { createModuleHost, normalizeModuleDescriptor } from '../src/module-host/public.js';

const TEST_DIR = path.dirname(fileURLToPath(import.meta.url));
const V7_ROOT = path.resolve(TEST_DIR, '..');
const negativeCases = JSON.parse(fs.readFileSync(path.join(
  TEST_DIR,
  'fixtures/annotation-geometry-domain/negative/cases.json',
), 'utf8'));

function anchor(epochMs, price, instrumentId = 'instrument.test') {
  return createMarketAnchor({ epochMs, instrumentId, price });
}

const first = anchor(1_000, 100);
const second = anchor(2_000, 110);
assert.deepEqual(readMarketAnchor(first), {
  epochMs: 1_000,
  instrumentId: 'instrument.test',
  price: 100,
});
assert.equal(Object.isFrozen(first), true);
assert.equal(Object.isFrozen(readMarketAnchor(first)), true);
assert.equal(readMarketAnchor(anchor(1, -0)).price, 0);
assert.equal(readMarketAnchor(anchor(1, -37.5)).price, -37.5);

const point = createPointGeometry({ anchor: first });
assert.deepEqual(readDrawingGeometry(point), {
  payload: { anchor: readMarketAnchor(first) },
  schemaVersion: 1,
  typeId: GEOMETRY_TYPE_IDS.point,
  typeVersion: '1.0.0',
});
const segment = createSegmentGeometry({ startAnchor: first, endAnchor: second });
assert.deepEqual(readDrawingGeometry(segment).payload, {
  endAnchor: readMarketAnchor(second),
  startAnchor: readMarketAnchor(first),
});
assert.doesNotThrow(() => createSegmentGeometry({
  startAnchor: anchor(1_000, 100), endAnchor: anchor(1_000, 110),
}), 'vertical Segment must remain valid');
assert.doesNotThrow(() => createSegmentGeometry({
  startAnchor: anchor(1_000, 100), endAnchor: anchor(2_000, 100),
}), 'horizontal Segment must remain valid');

const rectangleForward = readDrawingGeometry(createRectangleGeometry({
  firstAnchor: first,
  secondAnchor: second,
}));
const rectangleReverse = readDrawingGeometry(createRectangleGeometry({
  firstAnchor: second,
  secondAnchor: first,
}));
assert.deepEqual(rectangleForward, rectangleReverse, 'Rectangle input direction cannot change truth');
assert.deepEqual(rectangleForward.payload, {
  endEpochMs: 2_000,
  highPrice: 110,
  instrumentId: 'instrument.test',
  lowPrice: 100,
  startEpochMs: 1_000,
});
assert.equal(Object.isFrozen(rectangleForward), true);
assert.equal(Object.isFrozen(rectangleForward.payload), true);

const initial = createInitialGeometryRegistry();
assert.equal(Object.isFrozen(initial), true);
assert.deepEqual(initial.list(), [
  { typeId: 'geometry.point', version: '1.0.0' },
  { typeId: 'geometry.rectangle', version: '1.0.0' },
  { typeId: 'geometry.segment', version: '1.0.0' },
]);
assert.equal(Object.isFrozen(initial.list()), true);
assert.equal(Object.isFrozen(initial.list()[0]), true);
assert.deepEqual(initial.get('geometry.segment'), { typeId: 'geometry.segment', version: '1.0.0' });
assert.equal(initial.get('geometry.unregistered'), null);
assert.deepEqual(
  readDrawingGeometry(initial.create('geometry.point', { anchor: first })),
  readDrawingGeometry(point),
);

const triangleDefinition = defineGeometryType({
  typeId: 'geometry.test-triangle',
  version: '1.0.0',
  normalize({ anchors }) {
    if (!Array.isArray(anchors) || anchors.length !== 3) throw new TypeError('three anchors required');
    return { anchors: anchors.map(readMarketAnchor) };
  },
});
assert.deepEqual(readGeometryTypeDefinition(triangleDefinition), {
  typeId: 'geometry.test-triangle', version: '1.0.0',
});
const extended = createGeometryRegistry({ definitions: [triangleDefinition] });
const triangleInput = { anchors: [first, second, anchor(3_000, 90)] };
const triangle = readDrawingGeometry(extended.create('geometry.test-triangle', triangleInput));
assert.equal(triangle.typeId, 'geometry.test-triangle');
assert.deepEqual(triangle.payload.anchors.map(({ epochMs }) => epochMs), [1_000, 2_000, 3_000]);
assert.equal(Object.isFrozen(triangle.payload.anchors), true);
assert.equal(Object.isFrozen(triangle.payload.anchors[0]), true);
triangleInput.anchors.push(anchor(4_000, 95));
assert.equal(triangle.payload.anchors.length, 3, 'accepted Geometry cannot retain mutable input arrays');

const arbitraryDefinition = (typeId, normalize) => defineGeometryType({
  normalize, typeId, version: '1.0.0',
});
const cyclic = {};
cyclic.self = cyclic;
let deep = { anchor: readMarketAnchor(first) };
for (let index = 0; index < 18; index += 1) deep = { nested: deep };
class VendorPayload { constructor() { this.value = 1; } }

const foreign = anchor(2_000, 110, 'instrument.foreign');
const operations = {
  'anchor-extra': () => createMarketAnchor({ epochMs: 1, instrumentId: 'instrument.test', price: 1, x: 1 }),
  'anchor-instrument': () => createMarketAnchor({ epochMs: 1, instrumentId: ' instrument.test', price: 1 }),
  'anchor-epoch': () => createMarketAnchor({ epochMs: 1.5, instrumentId: 'instrument.test', price: 1 }),
  'anchor-price': () => createMarketAnchor({ epochMs: 1, instrumentId: 'instrument.test', price: Number.NaN }),
  'anchor-lookalike': () => readMarketAnchor(readMarketAnchor(first)),
  'point-extra': () => createPointGeometry({ anchor: first, indicatorId: 'ma' }),
  'point-anchor-lookalike': () => createPointGeometry({ anchor: readMarketAnchor(first) }),
  'segment-instrument': () => createSegmentGeometry({ startAnchor: first, endAnchor: foreign }),
  'segment-degenerate': () => createSegmentGeometry({ startAnchor: first, endAnchor: first }),
  'rectangle-instrument': () => createRectangleGeometry({ firstAnchor: first, secondAnchor: foreign }),
  'rectangle-time': () => createRectangleGeometry({
    firstAnchor: anchor(1_000, 100), secondAnchor: anchor(1_000, 110),
  }),
  'rectangle-price': () => createRectangleGeometry({
    firstAnchor: anchor(1_000, 100), secondAnchor: anchor(2_000, 100),
  }),
  'geometry-lookalike': () => readDrawingGeometry(readDrawingGeometry(point)),
  'definition-extra': () => defineGeometryType({
    typeId: 'geometry.test', version: '1.0.0', normalize: () => ({}), display: {},
  }),
  'definition-id': () => defineGeometryType({ typeId: 'indicator.ma', version: '1.0.0', normalize: () => ({}) }),
  'definition-version': () => defineGeometryType({ typeId: 'geometry.test', version: 'latest', normalize: () => ({}) }),
  'definition-normalizer': () => defineGeometryType({ typeId: 'geometry.test', version: '1.0.0', normalize: null }),
  'definition-lookalike': () => readGeometryTypeDefinition({ typeId: 'geometry.test', version: '1.0.0' }),
  'registry-extra': () => createGeometryRegistry({ definitions: [], mutable: true }),
  'registry-definitions': () => createGeometryRegistry({ definitions: null }),
  'registry-definition-lookalike': () => createGeometryRegistry({
    definitions: [{ typeId: 'geometry.test', version: '1.0.0' }],
  }),
  'registry-duplicate': () => createGeometryRegistry({ definitions: [triangleDefinition, triangleDefinition] }),
  'registry-unknown': () => initial.create('geometry.unregistered', {}),
  'registry-id': () => initial.get('point'),
  'payload-function': () => createGeometryRegistry({ definitions: [arbitraryDefinition(
    'geometry.test-function', () => ({ callback() {} }),
  )] }).create('geometry.test-function'),
  'payload-class': () => createGeometryRegistry({ definitions: [arbitraryDefinition(
    'geometry.test-class', () => new VendorPayload(),
  )] }).create('geometry.test-class'),
  'payload-cycle': () => createGeometryRegistry({ definitions: [arbitraryDefinition(
    'geometry.test-cycle', () => cyclic,
  )] }).create('geometry.test-cycle'),
  'payload-pixel': () => createGeometryRegistry({ definitions: [arbitraryDefinition(
    'geometry.test-pixel', () => ({ pixelX: 42 }),
  )] }).create('geometry.test-pixel'),
  'payload-bars': () => createGeometryRegistry({ definitions: [arbitraryDefinition(
    'geometry.test-bars', () => ({ bars: [] }),
  )] }).create('geometry.test-bars'),
  'payload-indicator': () => createGeometryRegistry({ definitions: [arbitraryDefinition(
    'geometry.test-indicator', () => ({ indicatorId: 'ma' }),
  )] }).create('geometry.test-indicator'),
  'payload-depth': () => createGeometryRegistry({ definitions: [arbitraryDefinition(
    'geometry.test-deep', () => deep,
  )] }).create('geometry.test-deep'),
  'normalizer-failure': () => createGeometryRegistry({ definitions: [arbitraryDefinition(
    'geometry.test-failure', () => { throw new Error('intentional'); },
  )] }).create('geometry.test-failure'),
};

for (const fixture of negativeCases) {
  assert.throws(operations[fixture.operation], (error) => {
    assert.ok(error instanceof AnnotationGeometryError, fixture.name);
    assert.equal(error.code, fixture.expectedCode, fixture.name);
    return true;
  });
}

const descriptor = normalizeModuleDescriptor(JSON.parse(fs.readFileSync(
  path.join(V7_ROOT, 'src/annotation-geometry-domain/module.json'),
  'utf8',
)));
assert.equal(descriptor.id, 'optional.annotation-geometry-domain');
assert.equal(descriptor.removable, true);
const withGeometry = createModuleHost([{ descriptor, publicApi: await import(
  '../src/annotation-geometry-domain/public.js'
) }]);
await withGeometry.start();
assert.deepEqual(withGeometry.snapshot().moduleIds, ['optional.annotation-geometry-domain']);
await withGeometry.stop();
const withoutGeometry = createModuleHost([]);
await withoutGeometry.start();
assert.deepEqual(withoutGeometry.snapshot().moduleIds, []);
await withoutGeometry.stop();

const registrySource = fs.readFileSync(
  path.join(V7_ROOT, 'src/annotation-geometry-domain/geometry-registry.js'),
  'utf8',
);
for (const concreteId of Object.values(GEOMETRY_TYPE_IDS)) {
  assert.equal(registrySource.includes(concreteId), false, `Registry branches on ${concreteId}`);
}
const moduleSource = fs.readdirSync(path.join(V7_ROOT, 'src/annotation-geometry-domain'))
  .filter((file) => file.endsWith('.js'))
  .map((file) => fs.readFileSync(path.join(V7_ROOT, 'src/annotation-geometry-domain', file), 'utf8'))
  .join('\n');
for (const forbidden of ['lightweight-charts', 'CanvasRenderingContext2D', '../bar-data-', '../replay-', '../v4', '../v5', '../v6']) {
  assert.equal(moduleSource.includes(forbidden), false, `Geometry production code contains ${forbidden}`);
}

console.log(`v7 Annotation Geometry Domain harness passed (${negativeCases.length} negative controls)`);
