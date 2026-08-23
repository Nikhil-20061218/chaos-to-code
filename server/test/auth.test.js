const assert = require('node:assert/strict');
const http = require('node:http');
const test = require('node:test');

process.env.NODE_ENV = 'test';
process.env.JWT_ACCESS_SECRET = 'test-access-secret';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret';

const app = require('../src/app');
const authService = require('../src/services/authService');
const {
  generateOtp, hashOtp, compareOtp, generateAccessToken, verifyAccessToken,
} = require('../src/services/tokenService');

async function withServer(t, callback) {
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve()))));
  return callback(`http://127.0.0.1:${server.address().port}`);
}

test('register validates input and does not call the service for malformed data', async (t) => {
  const originalRegister = authService.register;
  let called = false;
  authService.register = async () => { called = true; };
  t.after(() => { authService.register = originalRegister; });

  await withServer(t, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email: 'invalid' }),
    });
    assert.equal(response.status, 400);
    assert.equal(called, false);
  });
});

test('register rejects weak passwords missing uppercase, lowercase, or digits', async (t) => {
  const originalRegister = authService.register;
  let called = false;
  authService.register = async () => { called = true; };
  t.after(() => { authService.register = originalRegister; });

  await withServer(t, async (baseUrl) => {
    // 1. Password too short
    const res1 = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: 'Rahul Kumar', email: 'rahul@example.com', password: 'Short1!' }),
    });
    assert.equal(res1.status, 400);

    // 2. Missing uppercase
    const res2 = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: 'Rahul Kumar', email: 'rahul@example.com', password: 'lowercase12345!' }),
    });
    assert.equal(res2.status, 400);

    // 3. Missing lowercase
    const res3 = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: 'Rahul Kumar', email: 'rahul@example.com', password: 'UPPERCASE12345!' }),
    });
    assert.equal(res3.status, 400);

    // 4. Missing digit
    const res4 = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: 'Rahul Kumar', email: 'rahul@example.com', password: 'NoDigitsUppercaseLowercase!' }),
    });
    assert.equal(res4.status, 400);

    assert.equal(called, false);
  });
});

test('register passes normalized input and never returns credentials', async (t) => {
  const originalRegister = authService.register;
  let received;
  authService.register = async (input) => { received = input; };
  t.after(() => { authService.register = originalRegister; });

  await withServer(t, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: 'Rahul Kumar', email: ' Rahul@Example.COM ', password: 'StrongPassword123!' }),
    });
    assert.equal(response.status, 202);
    assert.deepEqual(await response.json(), { message: 'Verification OTP sent' });
    assert.deepEqual(received, { name: 'Rahul Kumar', email: 'rahul@example.com', password: 'StrongPassword123!' });
  });
});

test('OTP and password-style hashes cannot be used as plaintext', async () => {
  const otp = generateOtp();
  assert.match(otp, /^\d{6}$/);
  const otpHash = await hashOtp(otp);
  assert.notEqual(otpHash, otp);
  assert.equal(await compareOtp(otp, otpHash), true);
  assert.equal(await compareOtp('000000', otpHash), false);
});

test('access tokens contain a subject and invalid tokens are rejected', () => {
  const token = generateAccessToken('507f1f77bcf86cd799439011');
  assert.equal(verifyAccessToken(token).sub, '507f1f77bcf86cd799439011');
  assert.throws(() => verifyAccessToken(`${token}broken`));
});

test('login sets an HttpOnly refresh cookie and returns only access data', async (t) => {
  const originalLogin = authService.login;
  authService.login = async () => ({
    accessToken: 'access-token', refreshToken: 'refresh-token', expiresAt: new Date(Date.now() + 60_000),
    user: { id: 'user-id', name: 'Rahul', email: 'rahul@example.com', isEmailVerified: true },
  });
  t.after(() => { authService.login = originalLogin; });

  await withServer(t, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: 'rahul@example.com', password: 'StrongPassword123!' }),
    });
    assert.equal(response.status, 200);
    assert.match(response.headers.get('set-cookie'), /HttpOnly/);
    assert.deepEqual(await response.json(), {
      accessToken: 'access-token', user: { id: 'user-id', name: 'Rahul', email: 'rahul@example.com', isEmailVerified: true },
    });
  });
});

test('verify and resend endpoints validate OTPs and use normalized emails', async (t) => {
  const originalVerifyEmail = authService.verifyEmail;
  const originalResendOtp = authService.resendOtp;
  let verificationInput;
  let resendEmail;
  authService.verifyEmail = async (input) => { verificationInput = input; };
  authService.resendOtp = async (email) => { resendEmail = email; };
  t.after(() => {
    authService.verifyEmail = originalVerifyEmail;
    authService.resendOtp = originalResendOtp;
  });

  await withServer(t, async (baseUrl) => {
    const verifyResponse = await fetch(`${baseUrl}/api/auth/verify-email`, {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: 'RAHUL@EXAMPLE.COM', otp: '482193' }),
    });
    assert.equal(verifyResponse.status, 200);
    assert.deepEqual(verificationInput, { email: 'rahul@example.com', otp: '482193' });

    const resendResponse = await fetch(`${baseUrl}/api/auth/resend-otp`, {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email: ' RAHUL@example.com ' }),
    });
    assert.equal(resendResponse.status, 202);
    assert.equal(resendEmail, 'rahul@example.com');

    const invalidOtpResponse = await fetch(`${baseUrl}/api/auth/verify-email`, {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: 'rahul@example.com', otp: '123' }),
    });
    assert.equal(invalidOtpResponse.status, 400);
  });
});

test('refresh rotates the cookie and logout revokes the supplied refresh token', async (t) => {
  const originalRefresh = authService.refresh;
  const originalLogout = authService.logout;
  let loggedOutToken;
  authService.refresh = async (token) => {
    assert.equal(token, 'old-token');
    return { accessToken: 'new-access-token', refreshToken: 'new-refresh-token', expiresAt: new Date(Date.now() + 60_000) };
  };
  authService.logout = async (token) => { loggedOutToken = token; };
  t.after(() => {
    authService.refresh = originalRefresh;
    authService.logout = originalLogout;
  });

  await withServer(t, async (baseUrl) => {
    const refreshResponse = await fetch(`${baseUrl}/api/auth/refresh`, { method: 'POST', headers: { cookie: 'refreshToken=old-token' } });
    assert.equal(refreshResponse.status, 200);
    assert.deepEqual(await refreshResponse.json(), { accessToken: 'new-access-token' });
    assert.match(refreshResponse.headers.get('set-cookie'), /refreshToken=new-refresh-token;.*HttpOnly/);

    const logoutResponse = await fetch(`${baseUrl}/api/auth/logout`, { method: 'POST', headers: { cookie: 'refreshToken=old-token' } });
    assert.equal(logoutResponse.status, 200);
    assert.equal(loggedOutToken, 'old-token');
  });
});

test('protected current-user endpoint rejects invalid tokens and uses valid token subjects', async (t) => {
  const originalGetCurrentUser = authService.getCurrentUser;
  let requestedId;
  authService.getCurrentUser = async (id) => {
    requestedId = id;
    return { id, name: 'Rahul', email: 'rahul@example.com', isEmailVerified: true };
  };
  t.after(() => { authService.getCurrentUser = originalGetCurrentUser; });

  await withServer(t, async (baseUrl) => {
    const invalidResponse = await fetch(`${baseUrl}/api/auth/me`, { headers: { authorization: 'Bearer invalid' } });
    assert.equal(invalidResponse.status, 401);

    const userId = '507f1f77bcf86cd799439011';
    const validResponse = await fetch(`${baseUrl}/api/auth/me`, {
      headers: { authorization: `Bearer ${generateAccessToken(userId)}` },
    });
    assert.equal(validResponse.status, 200);
    assert.equal(requestedId, userId);
    assert.deepEqual((await validResponse.json()).user, {
      id: userId, name: 'Rahul', email: 'rahul@example.com', isEmailVerified: true,
    });
  });
});

test('guest sessions are delivered only through an HttpOnly cookie', async (t) => {
  const originalCreateGuestSession = authService.createGuestSession;
  authService.createGuestSession = async () => ({ guestToken: 'guest-token', expiresAt: new Date(Date.now() + 60_000) });
  t.after(() => { authService.createGuestSession = originalCreateGuestSession; });

  await withServer(t, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/guest/session`, { method: 'POST' });
    assert.equal(response.status, 201);
    assert.match(response.headers.get('set-cookie'), /guestSession=guest-token; Path=\/api;.*HttpOnly/);
    assert.deepEqual(await response.json(), { message: 'Guest session created' });
  });
});
