const authService = require('../services/authService');
const { validateRegister, validateLogin, validateEmailRequest, validateVerifyEmail } = require('../schemas/authSchemas');
const { refreshCookieOptions, clearRefreshCookieOptions } = require('../utils/cookies');
const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');

const register = asyncHandler(async (request, response) => {
  await authService.register(validateRegister(request.body));
  response.status(202).json({ message: 'Verification OTP sent' });
});

const verifyEmail = asyncHandler(async (request, response) => {
  await authService.verifyEmail(validateVerifyEmail(request.body));
  response.status(200).json({ message: 'Email verified successfully' });
});

const resendOtp = asyncHandler(async (request, response) => {
  await authService.resendOtp(validateEmailRequest(request.body).email);
  response.status(202).json({ message: 'If an unverified account exists, a verification OTP has been sent.' });
});

const login = asyncHandler(async (request, response) => {
  const result = await authService.login(validateLogin(request.body));
  response.cookie('refreshToken', result.refreshToken, refreshCookieOptions(result.expiresAt));
  response.status(200).json({ accessToken: result.accessToken, user: result.user });
});

const refresh = asyncHandler(async (request, response) => {
  if (!request.cookies.refreshToken) throw new AppError('Invalid or expired refresh token.', 401);
  const result = await authService.refresh(request.cookies.refreshToken);
  response.cookie('refreshToken', result.refreshToken, refreshCookieOptions(result.expiresAt));
  response.status(200).json({ accessToken: result.accessToken });
});

const logout = asyncHandler(async (request, response) => {
  await authService.logout(request.cookies.refreshToken);
  response.clearCookie('refreshToken', clearRefreshCookieOptions());
  response.status(200).json({ message: 'Logged out successfully' });
});

const me = asyncHandler(async (request, response) => {
  response.status(200).json({ user: await authService.getCurrentUser(request.user.id) });
});

module.exports = { register, verifyEmail, resendOtp, login, refresh, logout, me };
