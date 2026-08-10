/** Track one failed package generation's asynchronous disposal to settlement. */
export function beginSemanticPackageCleanup(instance) {
  let failure = null;
  const settled = Promise.resolve()
    .then(() => instance?.dispose())
    .catch((cause) => { failure = cause; });
  return Object.freeze({
    async settle() {
      await settled;
      return failure;
    },
  });
}
