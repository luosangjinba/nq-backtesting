import http from 'node:http';

function requireLoopbackOrigin(value) {
  const origin = new URL(value);
  if (origin.protocol !== 'http:' || !['127.0.0.1', '::1', 'localhost'].includes(origin.hostname)) {
    throw new TypeError('Database import proxy origin must use loopback HTTP.');
  }
  return origin;
}

/** Private-path proxy that injects the deployment's trusted bootstrap identity. */
export function createDatabaseImportProxy({ origin, userId }) {
  const target = requireLoopbackOrigin(origin);
  if (typeof userId !== 'string' || !/^[A-Za-z0-9._-]{1,64}$/.test(userId)) {
    throw new TypeError('Database import proxy requires one safe configured user id.');
  }
  return Object.freeze({
    handles(request) {
      try {
        return new URL(request.url, 'http://127.0.0.1').pathname.startsWith('/v7/database/');
      } catch {
        return false;
      }
    },
    forward(request, response) {
      if (!['GET', 'POST', 'PUT'].includes(request.method)) {
        response.writeHead(405, { Allow: 'GET, POST, PUT' });
        response.end();
        return;
      }
      const upstream = http.request({
        headers: {
          Accept: 'application/json',
          'Content-Length': request.headers['content-length'] ?? '0',
          'Content-Type': request.headers['content-type'] ?? 'application/octet-stream',
          'X-Replay-Lab-File-Name': request.headers['x-replay-lab-file-name'] ?? '',
          'X-Replay-Lab-User': userId,
        },
        host: target.hostname,
        method: request.method,
        path: request.url,
        port: target.port,
      }, (upstreamResponse) => {
        response.writeHead(upstreamResponse.statusCode ?? 502, {
          'Cache-Control': 'no-store',
          'Content-Type': upstreamResponse.headers['content-type'] ?? 'application/json; charset=utf-8',
          'X-Content-Type-Options': 'nosniff',
        });
        upstreamResponse.pipe(response);
      });
      upstream.on('error', () => {
        if (!response.headersSent) response.writeHead(502, { 'Content-Type': 'application/json' });
        response.end('{"error":{"code":"DATABASE_PROXY_UNAVAILABLE","message":"database import service is unavailable"}}');
      });
      upstream.setTimeout(60 * 60 * 1000, () => upstream.destroy(new Error('database import service timed out')));
      request.pipe(upstream);
    },
  });
}
