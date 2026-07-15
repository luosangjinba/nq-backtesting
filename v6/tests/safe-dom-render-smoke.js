import assert from 'node:assert/strict';
import {
  clearNode,
  createTextElement,
  replaceNodeChildren,
} from '../src/shell/safe-dom-render.js';

const calls = [];
const target = {
  replaceChildren(...children) {
    calls.push(children);
  },
};
const documentRef = {
  createElement(tagName) {
    return { className: '', tagName, textContent: '' };
  },
};

const payload = '<img src=x onerror="globalThis.compromised=true">';
const element = createTextElement(documentRef, {
  className: 'record-title',
  tagName: 'strong',
  text: payload,
});
assert.deepEqual(element, {
  className: 'record-title',
  tagName: 'strong',
  textContent: payload,
});
assert.equal('innerHTML' in element, false);

replaceNodeChildren(target, [element]);
clearNode(target);
assert.deepEqual(calls, [[element], []]);

assert.throws(() => createTextElement(documentRef, { tagName: 'img onerror=x' }), /Invalid safe DOM/);
assert.throws(() => replaceNodeChildren({}, []), /replaceChildren/);

console.log('v6 safe DOM render smoke passed');
