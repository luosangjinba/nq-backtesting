const root = document.querySelector('[data-v5-root]');

if (!root) {
  throw new Error('V5 root element was not found.');
}

root.dataset.booted = 'true';
