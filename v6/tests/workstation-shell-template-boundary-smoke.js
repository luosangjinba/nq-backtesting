import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createWorkstationShellMarkup } from '../src/shell/workstation-shell.js';

const facade = await readFile('v6/src/shell/workstation-shell.js', 'utf8');
const template = await readFile('v6/src/shell/workstation-shell-template.js', 'utf8');

assert.match(facade, /workstation-shell-template\.js/);
assert.doesNotMatch(facade, /<section|<button|<form/);
assert.equal(facade.split('\n').length < 12, true);
assert.match(template, /data-v6-workstation-shell/);
assert.match(template, /data-v6-chart-engine-host/);
assert.match(template, /data-v6-transport/);
assert.match(template, /data-v6-settings-panel/);

const markup = createWorkstationShellMarkup();
assert.match(markup, /data-v6-workstation-shell/);
assert.match(markup, /data-v6-status-bar/);

console.log('v6 workstation shell template boundary smoke passed');
