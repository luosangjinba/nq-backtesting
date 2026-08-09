/** Own one transient Drawing Preview identity, revision, and serialized apply promise. */
export function createDrawingPreviewSession({ identity, previewPort, project }) {
  let pending = Promise.resolve();
  let revision = 0;
  let visible = false;

  return Object.freeze({
    async clear() {
      await pending.catch(() => {});
      if (visible) await previewPort.clear(identity);
      visible = false;
    },
    flush() { return pending; },
    replace(geometry) {
      revision += 1;
      visible = true;
      pending = Promise.resolve(previewPort.replace(identity, [project(geometry, revision)]));
      return pending;
    },
    snapshot() {
      return Object.freeze({ revision, visible });
    },
  });
}
