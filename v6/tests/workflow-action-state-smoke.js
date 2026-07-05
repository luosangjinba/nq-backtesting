import assert from 'node:assert/strict';
import { setWorkflowActionOpen } from '../src/shell/workflow-action-state.js';

function createToggle() {
  const classes = new Set();
  return {
    attributes: {},
    classList: {
      contains(name) {
        return classes.has(name);
      },
      toggle(name, active) {
        if (active) {
          classes.add(name);
          return true;
        }
        classes.delete(name);
        return false;
      },
    },
    dataset: {},
    setAttribute(name, value) {
      this.attributes[name] = String(value);
    },
  };
}

const toggle = createToggle();
setWorkflowActionOpen(toggle, true);
assert.equal(toggle.classList.contains('is-active'), true);
assert.equal(toggle.dataset.v6WorkflowActive, 'true');
assert.equal(toggle.attributes['aria-expanded'], 'true');
assert.equal(toggle.attributes['aria-pressed'], 'true');

setWorkflowActionOpen(toggle, false);
assert.equal(toggle.classList.contains('is-active'), false);
assert.equal(toggle.dataset.v6WorkflowActive, 'false');
assert.equal(toggle.attributes['aria-expanded'], 'false');
assert.equal(toggle.attributes['aria-pressed'], 'false');

const minimalToggle = { attributes: {}, setAttribute(name, value) { this.attributes[name] = String(value); } };
setWorkflowActionOpen(minimalToggle, true);
assert.equal(minimalToggle.attributes['aria-expanded'], 'true');
assert.equal(minimalToggle.attributes['aria-pressed'], 'true');

setWorkflowActionOpen(null, true);

console.log('v6 workflow action state smoke passed');
