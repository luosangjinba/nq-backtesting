import http from 'node:http';

function requireLoopbackOrigin(value) {
  const origin = new URL(value);
  if (origin.protocol !== 'http:' || !['127.0.0.1', '::1', 'localhost'].includes(origin.hostname)) {
    throw new TypeError('State proxy origin must use loopback HTTP.');
  }
  return origin;
}

/** Create the private-web-path proxy that injects one configured local identity. */
export function createStateProxy({ origin, userId }) {
  const target = requireLoopbackOrigin(origin);
  if (typeof userId !== 'string' || !/^[A-Za-z0-9._-]{1,64}$/.test(userId)) {
    throw new TypeError('State proxy requires one safe configured user id.');
  }
  return Object.freeze({
    handles(request) {
      try {
        return new URL(request.url, 'http://127.0.0.1').pathname.startsWith('/v7/state/');
      } catch {
        return false;
      }
    },
    forward(request, response) {
      if (!['GET', 'PUT'].includes(request.method)) {
        response.writeHead(405, { Allow: 'GET, PUT' });
        response.end();
        return;
      }
      const upstream = http.request({
        headers: {
          Accept: 'application/json',
          'Content-Length': request.headers['content-length'] ?? '0',
          'Content-Type': request.headers['content-type'] ?? 'application/octet-stream',
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
        response.end('{"error":{"code":"STATE_PROXY_UNAVAILABLE","message":"state service is unavailable"}}');
      });
      upstream.setTimeout(5_000, () => upstream.destroy(new Error('state service timed out')));
      request.pipe(upstream);
    },
  });
}
