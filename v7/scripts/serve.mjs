import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createStaticServer } from './static-server.mjs';
import { createStateProxy } from './state-proxy.mjs';

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(scriptDirectory, '../..');
const requestedPort = Number(process.argv[2] ?? 8007);
if (!Number.isSafeInteger(requestedPort) || requestedPort < 1 || requestedPort > 65535) {
  throw new TypeError('Port must be an integer from 1 to 65535.');
}

const stateUser = process.env.REPLAY_LAB_STATE_USER ?? '';
const stateProxy = stateUser.length === 0 ? null : createStateProxy({
  origin: process.env.REPLAY_LAB_STATE_API_ORIGIN ?? 'http://127.0.0.1:8767',
  userId: stateUser,
});
const server = createStaticServer(repositoryRoot, { stateProxy });
server.listen(requestedPort, '127.0.0.1', () => {
  console.log(`V7 Session Browser: http://127.0.0.1:${requestedPort}/v7/app/`);
});

function stop() {
  server.close(() => process.exit(0));
}
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
