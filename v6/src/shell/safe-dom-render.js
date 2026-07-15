function requireNode(target, label) {
  if (!target || typeof target.replaceChildren !== 'function') {
    throw new Error(`${label} requires a DOM node with replaceChildren().`);
  }
  return target;
}

export function clearNode(target) {
  requireNode(target, 'clearNode').replaceChildren();
  return target;
}

export function replaceNodeChildren(target, children = []) {
  const normalized = Array.from(children);
  requireNode(target, 'replaceNodeChildren').replaceChildren(...normalized);
  return target;
}

export function createTextElement(documentRef, {
  className = '',
  tagName = 'div',
  text = '',
} = {}) {
  if (!documentRef || typeof documentRef.createElement !== 'function') {
    throw new Error('createTextElement requires a document with createElement().');
  }
  const normalizedTagName = String(tagName).toLowerCase();
  if (!/^[a-z][a-z0-9-]*$/.test(normalizedTagName)) {
    throw new Error(`Invalid safe DOM tag name: ${tagName}`);
  }
  const element = documentRef.createElement(normalizedTagName);
  element.className = String(className);
  element.textContent = String(text ?? '');
  return element;
}
