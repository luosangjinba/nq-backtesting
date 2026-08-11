export const SESSION_APPLICATION_MODULE_ID = 'adapter.session-application';

export function requireApplicationPort(ports, id, method) {
  const port = ports[id];
  if (!port || typeof port[method] !== 'function') {
    throw new TypeError(`${SESSION_APPLICATION_MODULE_ID} requires ${id}.${method}().`);
  }
  return port;
}
