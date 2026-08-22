const GuestSession = require('../models/GuestSession');
const { hashToken } = require('../services/tokenService');
const { getAuthenticatedUser } = require('./authenticate');
const AppError = require('../utils/AppError');

async function uploadOwner(request, _response, next) {
  const authorization = request.get('authorization');
  if (authorization && authorization.startsWith('Bearer ')) {
    try {
      const user = getAuthenticatedUser(request);
      request.uploadOwner = { type: 'user', id: user.id };
      return next();
    } catch (_error) {
      return next(new AppError('Authentication required.', 401));
    }
  }

  const guestToken = request.cookies.guestSession;
  if (!guestToken) return next(new AppError('Authentication required.', 401));

  try {
    const session = await GuestSession.findOne({ tokenHash: hashToken(guestToken) });
    if (!session || session.expiresAt <= new Date()) return next(new AppError('Authentication required.', 401));
    request.uploadOwner = { type: 'guest', id: session._id.toString() };
    return next();
  } catch (error) {
    return next(error);
  }
}

module.exports = uploadOwner;
