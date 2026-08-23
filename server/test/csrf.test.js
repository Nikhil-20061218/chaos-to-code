const assert = require('node:assert/strict');
const http = require('node:http');
const test = require('node:test');

process.env.NODE_ENV = 'test';
process.env.JWT_ACCESS_SECRET = 'test-access-secret';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret';
process.env.CLIENT_ORIGIN = 'http://localhost:5173,https://accessai-puce.vercel.app';

const app = require('../src/app');
const GuestSession = require('../src/models/GuestSession');

async function withServer(t, callback) {
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve()))));
  return callback(`http://127.0.0.1:${server.address().port}`);
}

test('CORS allows requests from allowed origin', async (t) => {
  await withServer(t, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/health`, {
      headers: { Origin: 'https://accessai-puce.vercel.app' },
    });
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('access-control-allow-origin'), 'https://accessai-puce.vercel.app');
    assert.equal(response.headers.get('access-control-allow-credentials'), 'true');
  });
});

test('CORS rejects/does not set headers for disallowed origin', async (t) => {
  await withServer(t, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/health`, {
      headers: { Origin: 'http://malicious-site.com' },
    });
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('access-control-allow-origin'), null);
  });
});

test('CORS preflight OPTIONS request works for allowed origin', async (t) => {
  await withServer(t, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/guest/session`, {
      method: 'OPTIONS',
      headers: {
        Origin: 'https://accessai-puce.vercel.app',
        'Access-Control-Request-Method': 'POST',
      },
    });
    assert.equal(response.status, 204);
    assert.equal(response.headers.get('access-control-allow-origin'), 'https://accessai-puce.vercel.app');
    assert.ok(response.headers.get('access-control-allow-methods').includes('POST'));
  });
});

test('CSRF protection blocks state-changing request from disallowed origin when cookies are present', async (t) => {
  // Mock GuestSession lookup
  const originalFindOne = GuestSession.findOne;
  GuestSession.findOne = async () => ({ _id: '507f1f77bcf86cd799439082', expiresAt: new Date(Date.now() + 60_000) });
  t.after(() => { GuestSession.findOne = originalFindOne; });

  await withServer(t, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/documents/upload`, {
      method: 'POST',
      headers: {
        Origin: 'http://malicious-site.com',
        Cookie: 'guestSession=some-token',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({}),
    });
    // Should be blocked by CSRF middleware
    assert.equal(response.status, 403);
    const body = await response.json();
    assert.match(body.error.message, /CSRF protection/);
  });
});

test('CSRF protection allows state-changing request from allowed origin when cookies are present', async (t) => {
  // Mock GuestSession lookup
  const originalFindOne = GuestSession.findOne;
  GuestSession.findOne = async () => ({ _id: '507f1f77bcf86cd799439082', expiresAt: new Date(Date.now() + 60_000) });
  t.after(() => { GuestSession.findOne = originalFindOne; });

  await withServer(t, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/documents/upload`, {
      method: 'POST',
      headers: {
        Origin: 'https://accessai-puce.vercel.app',
        Cookie: 'guestSession=some-token',
      },
      // Do not send file so it fails on file validation (400) rather than CSRF (403)
    });
    // If it reaches file validation, it passed CSRF!
    assert.equal(response.status, 400);
    const body = await response.json();
    assert.notEqual(body.error.message, 'CSRF protection: request origin not allowed.');
  });
});

test('CSRF protection is bypassed for state-changing request with Bearer authorization header', async (t) => {
  await withServer(t, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/documents/upload`, {
      method: 'POST',
      headers: {
        Origin: 'http://malicious-site.com',
        Authorization: 'Bearer invalid-token-fails-auth-but-passes-csrf',
      },
    });
    // Fails on auth (401) rather than CSRF (403)
    assert.equal(response.status, 401);
    const body = await response.json();
    assert.notEqual(body.error.message, 'CSRF protection: request origin not allowed.');
  });
});
