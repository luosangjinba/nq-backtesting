import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const app = await readFile('v6/src/app.js', 'utf8');
const contributions = await readFile('v6/src/runtime/app-runtime-contributions.js', 'utf8');

assert.match(app, /createAppRuntimeContributions/);
assert.doesNotMatch(app, /createCoreRuntimeContributions/);
assert.doesNotMatch(app, /createSessionMetadataStorage/);
assert.doesNotMatch(app, /createInMemorySessionRepository/);
assert.doesNotMatch(app, /createWebStoragePersistenceAdapter/);
assert.doesNotMatch(app, /createReplayNavigationPreferencesStorage/);

assert.match(contributions, /createCoreRuntimeContributions/);
assert.match(contributions, /createSessionMetadataStorage/);
assert.match(contributions, /createInMemorySessionRepository/);
assert.match(contributions, /createWebStoragePersistenceAdapter/);
assert.match(contributions, /createReplayNavigationPreferencesStorage/);

console.log('v6 app runtime contributions static smoke passed');
