export function createPrimitiveCache({ attach, detach } = {}) {
  if (typeof attach !== 'function') throw new Error('createPrimitiveCache requires attach');
  if (typeof detach !== 'function') throw new Error('createPrimitiveCache requires detach');

  const entries = new Map();

  function detachEntry(entry) {
    if (!entry?.primitive) return;
    try {
      detach(entry.primitive);
    } catch (error) {
      // Primitive detach can fail if Lightweight Charts already detached it.
    }
  }

  function normalizeDescriptor(descriptor = {}) {
    if (!descriptor.key) throw new Error('Primitive descriptor requires key');
    if (typeof descriptor.create !== 'function') {
      throw new Error(`Primitive descriptor ${descriptor.key} requires create`);
    }
    return {
      type: descriptor.type || 'default',
      update: typeof descriptor.update === 'function' ? descriptor.update : null,
      ...descriptor,
    };
  }

  function sync(descriptors = []) {
    const seenKeys = new Set();

    descriptors.map(normalizeDescriptor).forEach((descriptor) => {
      const key = String(descriptor.key);
      seenKeys.add(key);
      const existing = entries.get(key);

      if (existing && existing.type === descriptor.type) {
        if (descriptor.update) descriptor.update(existing.primitive);
        entries.set(key, { ...existing, descriptor });
        return;
      }

      if (existing) detachEntry(existing);
      const primitive = descriptor.create();
      attach(primitive);
      primitive?.requestUpdate?.();
      entries.set(key, {
        key,
        type: descriptor.type,
        primitive,
        descriptor,
      });
    });

    Array.from(entries.keys()).forEach((key) => {
      if (seenKeys.has(key)) return;
      const entry = entries.get(key);
      detachEntry(entry);
      entries.delete(key);
    });
  }

  function clear() {
    entries.forEach(detachEntry);
    entries.clear();
  }

  function get(key) {
    return entries.get(String(key))?.primitive || null;
  }

  function size() {
    return entries.size;
  }

  function keys() {
    return Array.from(entries.keys());
  }

  return {
    clear,
    get,
    keys,
    size,
    sync,
  };
}
