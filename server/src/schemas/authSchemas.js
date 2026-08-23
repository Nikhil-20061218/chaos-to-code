const AppError = require('../utils/AppError');

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PASSWORD_MIN_LENGTH = 12;

function requireObject(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new AppError('Invalid request body.', 400);
  }
}

function normalizeEmail(email) {
  if (typeof email !== 'string') throw new AppError('A valid email is required.', 400);
  const normalized = email.trim().toLowerCase();
  if (normalized.length > 254 || !EMAIL_PATTERN.test(normalized)) {
    throw new AppError('A valid email is required.', 400);
  }
  return normalized;
}

function validateRegister(input) {
  requireObject(input);
  const name = typeof input.name === 'string' ? input.name.trim() : '';
  if (name.length < 2 || name.length > 100) throw new AppError('Name must be between 2 and 100 characters.', 400);
  const password = typeof input.password === 'string' ? input.password : '';
  if (password.length < PASSWORD_MIN_LENGTH || password.length > 128) {
    throw new AppError(`Password must be between ${PASSWORD_MIN_LENGTH} and 128 characters.`, 400);
  }
  const hasUppercase = /[A-Z]/.test(password);
  const hasLowercase = /[a-z]/.test(password);
  const hasDigit = /\d/.test(password);
  if (!hasUppercase || !hasLowercase || !hasDigit) {
    throw new AppError('Password must contain at least one uppercase letter, one lowercase letter, and one number.', 400);
  }
  return { name, email: normalizeEmail(input.email), password };
}

function validateLogin(input) {
  requireObject(input);
  const password = typeof input.password === 'string' ? input.password : '';
  if (password.length === 0 || password.length > 128) throw new AppError('A valid password is required.', 400);
  return { email: normalizeEmail(input.email), password };
}

function validateEmailRequest(input) {
  requireObject(input);
  return { email: normalizeEmail(input.email) };
}

function validateVerifyEmail(input) {
  const { email } = validateEmailRequest(input);
  if (typeof input.otp !== 'string' || !/^\d{6}$/.test(input.otp)) {
    throw new AppError('OTP must contain exactly 6 digits.', 400);
  }
  return { email, otp: input.otp };
}

module.exports = { validateRegister, validateLogin, validateEmailRequest, validateVerifyEmail };
