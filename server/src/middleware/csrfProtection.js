const AppError = require('../utils/AppError');

function csrfProtection(request, response, next) {
  // 1. Only enforce on state-changing methods
  const stateChangingMethods = ['POST', 'PUT', 'DELETE', 'PATCH'];
  if (!stateChangingMethods.includes(request.method)) {
    return next();
  }

  // 2. If it's a Bearer authenticated request, it's safe from CSRF
  const authorization = request.get('authorization');
  if (authorization && authorization.startsWith('Bearer ')) {
    return next();
  }

  // 3. Only enforce if the request relies on cookie authentication (guestSession or refreshToken exist in cookies)
  const hasGuestCookie = request.cookies && request.cookies.guestSession;
  const hasRefreshCookie = request.cookies && request.cookies.refreshToken;
  if (!hasGuestCookie && !hasRefreshCookie) {
    return next();
  }

  // 4. Check Origin or Referer header against allowed client origins
  const origin = request.get('origin');
  const referer = request.get('referer');
  
  let requestOrigin = origin;
  if (!requestOrigin && referer) {
    try {
      const parsed = new URL(referer);
      requestOrigin = parsed.origin;
    } catch (_) {
      // Invalid URL in referer
    }
  }

  const clientOrigins = (process.env.CLIENT_ORIGIN || 'http://localhost:5173')
    .split(',').map((o) => o.trim()).filter(Boolean);

  if (process.env.NODE_ENV !== 'production') {
    const isLoopback = requestOrigin && (requestOrigin.startsWith('http://localhost') || requestOrigin.startsWith('http://127.0.0.1') || requestOrigin === 'null');
    if (!requestOrigin || requestOrigin === 'null' || isLoopback) {
      return next();
    }
  }

  if (!requestOrigin || !clientOrigins.includes(requestOrigin)) {
    return next(new AppError('CSRF protection: request origin not allowed.', 403));
  }

  next();
}

module.exports = csrfProtection;
