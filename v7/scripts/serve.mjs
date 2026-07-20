import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createStaticServer } from './static-server.mjs';

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(scriptDirectory, '../..');
const requestedPort = Number(process.argv[2] ?? 8007);
if (!Number.isSafeInteger(requestedPort) || requestedPort < 1 || requestedPort > 65535) {
  throw new TypeError('Port must be an integer from 1 to 65535.');
}

const server = createStaticServer(repositoryRoot);
server.listen(requestedPort, '127.0.0.1', () => {
  console.log(`V7 Session Browser: http://127.0.0.1:${requestedPort}/v7/app/`);
});

function stop() {
  server.close(() => process.exit(0));
}
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
