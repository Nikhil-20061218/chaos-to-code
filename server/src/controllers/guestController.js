const authService = require('../services/authService');
const { guestCookieOptions } = require('../utils/cookies');
const asyncHandler = require('../utils/asyncHandler');

const createSession = asyncHandler(async (_request, response) => {
  const { guestToken, expiresAt } = await authService.createGuestSession();
  response.cookie('guestSession', guestToken, guestCookieOptions(expiresAt));
  response.status(201).json({ message: 'Guest session created' });
});

module.exports = { createSession };
