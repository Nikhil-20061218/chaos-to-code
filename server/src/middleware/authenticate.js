const { verifyAccessToken } = require('../services/tokenService');
const AppError = require('../utils/AppError');

function getAuthenticatedUser(request) {
  const authorization = request.get('authorization');
  if (!authorization || !authorization.startsWith('Bearer ')) {
    throw new AppError('Authentication required.', 401);
  }

  try {
    const payload = verifyAccessToken(authorization.slice(7));
    if (!payload.sub) throw new Error('Missing subject');
    return { id: payload.sub };
  } catch (_error) {
    throw new AppError('Authentication required.', 401);
  }
}

function authenticate(request, _response, next) {
  try {
    request.user = getAuthenticatedUser(request);
    return next();
  } catch (_error) {
    return next(new AppError('Authentication required.', 401));
  }
}

module.exports = authenticate;
module.exports.getAuthenticatedUser = getAuthenticatedUser;
