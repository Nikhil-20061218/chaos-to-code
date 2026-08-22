const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const AppError = require('../utils/AppError');

const OTP_ROUNDS = 10;

function requireSecret(name) {
  const value = process.env[name];
  if (!value) throw new AppError(`${name} is not configured.`, 500);
  return value;
}

function generateOtp() {
  return crypto.randomInt(0, 1_000_000).toString().padStart(6, '0');
}

function hashOtp(otp) {
  return bcrypt.hash(otp, OTP_ROUNDS);
}

function compareOtp(otp, otpHash) {
  return bcrypt.compare(otp, otpHash);
}

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function generateAccessToken(userId) {
  return jwt.sign({ sub: userId.toString() }, requireSecret('JWT_ACCESS_SECRET'), {
    expiresIn: process.env.ACCESS_TOKEN_EXPIRES_IN || '15m',
  });
}

function generateRefreshToken(userId) {
  return jwt.sign({ sub: userId.toString() }, requireSecret('JWT_REFRESH_SECRET'), {
    expiresIn: process.env.REFRESH_TOKEN_EXPIRES_IN || '7d',
  });
}

function verifyAccessToken(token) {
  return jwt.verify(token, requireSecret('JWT_ACCESS_SECRET'));
}

function verifyRefreshToken(token) {
  return jwt.verify(token, requireSecret('JWT_REFRESH_SECRET'));
}

function tokenExpiration(token) {
  const decoded = jwt.decode(token);
  if (!decoded || !decoded.exp) throw new AppError('Token expiration is invalid.', 500);
  return new Date(decoded.exp * 1000);
}

function generateGuestToken() {
  return crypto.randomBytes(32).toString('base64url');
}

module.exports = {
  generateOtp,
  hashOtp,
  compareOtp,
  hashToken,
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  tokenExpiration,
  generateGuestToken,
};
