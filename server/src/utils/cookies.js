function isProduction() {
  return process.env.NODE_ENV === 'production';
}

function refreshCookieOptions(expiresAt) {
  return {
    httpOnly: true,
    secure: isProduction(),
    sameSite: 'lax',
    path: '/api/auth',
    expires: expiresAt,
  };
}

function guestCookieOptions(expiresAt) {
  return {
    httpOnly: true,
    secure: isProduction(),
    sameSite: 'lax',
    path: '/api',
    expires: expiresAt,
  };
}

function clearRefreshCookieOptions() {
  return {
    httpOnly: true,
    secure: isProduction(),
    sameSite: 'lax',
    path: '/api/auth',
  };
}

module.exports = { refreshCookieOptions, guestCookieOptions, clearRefreshCookieOptions };
