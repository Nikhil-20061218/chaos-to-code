const assert = require('node:assert/strict');
const http = require('node:http');
const test = require('node:test');

process.env.NODE_ENV = 'test';
process.env.JWT_ACCESS_SECRET = 'test-access-secret';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret';

const app = require('../src/app');
const authService = require('../src/services/authService');
const { generateAccessToken } = require('../src/services/tokenService');

async function withServer(t, callback) {
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve()))));
  return callback(`http://127.0.0.1:${server.address().port}`);
}

test('POST /api/auth/refresh returns access token and sets cookie on valid refresh token', async (t) => {
  const originalRefresh = authService.refresh;
  authService.refresh = async (token) => {
    assert.equal(token, 'valid-refresh-token');
    return {
      accessToken: 'new-access-token',
      refreshToken: 'new-refresh-token',
      expiresAt: new Date(Date.now() + 60_000),
    };
  };
  t.after(() => { authService.refresh = originalRefresh; });

  await withServer(t, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/auth/refresh`, {
      method: 'POST',
      headers: {
        Cookie: 'refreshToken=valid-refresh-token',
      },
    });

    assert.equal(response.status, 200);
    const body = await response.json();
    assert.equal(body.accessToken, 'new-access-token');

    // Verify rotation cookie set
    const setCookie = response.headers.get('set-cookie');
    assert.ok(setCookie);
    assert.match(setCookie, /refreshToken=new-refresh-token/);
    assert.match(setCookie, /HttpOnly/);
  });
});

test('GET /api/auth/me retrieves current user profile with valid Bearer token', async (t) => {
  const originalGetCurrentUser = authService.getCurrentUser;
  authService.getCurrentUser = async (userId) => {
    assert.equal(userId, '507f1f77bcf86cd799439011');
    return {
      _id: userId,
      email: 'session@example.com',
      name: 'Session User',
    };
  };
  t.after(() => { authService.getCurrentUser = originalGetCurrentUser; });

  const accessToken = generateAccessToken('507f1f77bcf86cd799439011');

  await withServer(t, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/auth/me`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    assert.equal(response.status, 200);
    const body = await response.json();
    assert.equal(body.user.email, 'session@example.com');
    assert.equal(body.user.name, 'Session User');
  });
});
