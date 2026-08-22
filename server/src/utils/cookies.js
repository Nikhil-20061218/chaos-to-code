function isProduction() {
  return process.env.NODE_ENV === 'production';
}

function sameSite() {
  return process.env.COOKIE_SAME_SITE === 'none' ? 'none' : 'lax';
}

function secureCookies() {
  return isProduction() || sameSite() === 'none';
}

function refreshCookieOptions(expiresAt) {
  return {
    httpOnly: true,
    secure: secureCookies(),
    sameSite: sameSite(),
    path: '/api/auth',
    expires: expiresAt,
  };
}

function guestCookieOptions(expiresAt) {
  return {
    httpOnly: true,
    secure: secureCookies(),
    sameSite: sameSite(),
    path: '/api',
    expires: expiresAt,
  };
}

function clearRefreshCookieOptions() {
  return {
    httpOnly: true,
    secure: secureCookies(),
    sameSite: sameSite(),
    path: '/api/auth',
  };
}

module.exports = { refreshCookieOptions, guestCookieOptions, clearRefreshCookieOptions };
