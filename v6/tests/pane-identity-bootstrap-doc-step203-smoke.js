import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

async function read(path) {
  return readFile(path, 'utf8');
}

const doc = await read('v6/docs/V6_PANE_IDENTITY_BOOTSTRAP_NORMALIZATION_STEP203.md');
const index = await read('v6/docs/INDEX.md');
const todo = await read('v6/TODO.md');
const handoff = await read('v6/docs/V6_HANDOFF.md');
const paneModel = await read('v6/src/panes/pane-model.js');
const paneStore = await read('v6/src/panes/pane-store.js');
const regressionPack = await read('v6/tests/chart-browser-regression-pack.js');

[
  '`DEFAULT_PANE_ID` is now `main`',
  '`main`, `secondary`, and `tertiary`',
  'Step 204 Recommendation',
].forEach((text) => assert.equal(doc.includes(text), true));
assert.match(doc, /no `pane-default`\s+runtime record/);

assert.match(index, /V6_PANE_IDENTITY_BOOTSTRAP_NORMALIZATION_STEP203\.md/);
assert.match(todo, /Latest completed roadmap step: Step 203 - Pane Identity Bootstrap\s+Normalization/);
assert.match(handoff, /Current V6 step state: Step 203 completed/);
assert.match(paneModel, /DEFAULT_PANE_ID\s*=\s*'main'/);
assert.match(paneModel, /CHART_SURFACE_PANE_IDS\s*=\s*Object\.freeze\(\['main', 'secondary', 'tertiary'\]\)/);
assert.match(paneStore, /initialPanes\s*=\s*createDefaultPaneRecords\(\)/);
assert.match(regressionPack, /pane-identity-bootstrap-browser-step203-smoke\.js/);

console.log('v6 pane identity bootstrap doc step 203 smoke passed');
