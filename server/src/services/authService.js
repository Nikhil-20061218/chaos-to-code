const bcrypt = require('bcryptjs');
const User = require('../models/User');
const EmailVerification = require('../models/EmailVerification');
const RefreshSession = require('../models/RefreshSession');
const GuestSession = require('../models/GuestSession');
const AppError = require('../utils/AppError');
const { sendVerificationOtp } = require('./emailService');
const {
  generateOtp, hashOtp, compareOtp, hashToken, generateAccessToken, generateRefreshToken,
  verifyRefreshToken, tokenExpiration, generateGuestToken,
} = require('./tokenService');

const PASSWORD_ROUNDS = 12;
const OTP_EXPIRATION_MS = 10 * 60 * 1000;
const OTP_MAX_ATTEMPTS = 5;
const OTP_RESEND_COOLDOWN_MS = 60 * 1000;
const OTP_RESEND_WINDOW_MS = 60 * 60 * 1000;
const OTP_MAX_RESENDS_PER_WINDOW = 5;
const GUEST_SESSION_MS = 24 * 60 * 60 * 1000;

function publicUser(user) {
  return {
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    isEmailVerified: user.isEmailVerified,
  };
}

async function issueVerificationOtp(user, isResend = false) {
  const now = new Date();
  const existing = await EmailVerification.findOne({ userId: user._id }).select('+otpHash');
  let resendCount = 0;
  let resendWindowStartedAt = now;

  if (existing) {
    const elapsedSinceLastSend = now - existing.lastSentAt;
    if (isResend && elapsedSinceLastSend < OTP_RESEND_COOLDOWN_MS) {
      throw new AppError('Please wait before requesting another OTP.', 429);
    }
    if (now - existing.resendWindowStartedAt < OTP_RESEND_WINDOW_MS) {
      resendCount = existing.resendCount;
      resendWindowStartedAt = existing.resendWindowStartedAt;
    }
    if (isResend && resendCount >= OTP_MAX_RESENDS_PER_WINDOW) {
      throw new AppError('OTP resend limit reached. Please try again later.', 429);
    }
  }

  const otp = generateOtp();
  const otpHash = await hashOtp(otp);
  const verification = {
    userId: user._id,
    email: user.email,
    otpHash,
    expiresAt: new Date(now.getTime() + OTP_EXPIRATION_MS),
    attempts: 0,
    lastSentAt: now,
    resendCount: isResend ? resendCount + 1 : resendCount,
    resendWindowStartedAt,
  };

  await EmailVerification.findOneAndUpdate({ userId: user._id }, verification, {
    new: true,
    upsert: true,
    setDefaultsOnInsert: true,
  });
  await sendVerificationOtp(user.email, otp);
}

async function register({ name, email, password }) {
  const existing = await User.findOne({ email });
  if (existing) {
    if (!existing.isEmailVerified) await issueVerificationOtp(existing, true);
    return;
  }

  const passwordHash = await bcrypt.hash(password, PASSWORD_ROUNDS);
  const user = await User.create({ name, email, passwordHash });
  await issueVerificationOtp(user);
}

async function verifyEmail({ email, otp }) {
  const user = await User.findOne({ email });
  if (!user) throw new AppError('Invalid or expired verification code.', 400);
  if (user.isEmailVerified) return;

  const verification = await EmailVerification.findOne({ userId: user._id }).select('+otpHash');
  if (!verification || verification.expiresAt <= new Date()) {
    if (verification) await verification.deleteOne();
    throw new AppError('Invalid or expired verification code.', 400);
  }
  if (verification.attempts >= OTP_MAX_ATTEMPTS) {
    await verification.deleteOne();
    throw new AppError('Invalid or expired verification code.', 400);
  }

  const isValid = await compareOtp(otp, verification.otpHash);
  if (!isValid) {
    verification.attempts += 1;
    await verification.save();
    throw new AppError('Invalid or expired verification code.', 400);
  }

  user.isEmailVerified = true;
  await user.save();
  await verification.deleteOne();
}

async function resendOtp(email) {
  const user = await User.findOne({ email });
  if (user && !user.isEmailVerified) await issueVerificationOtp(user, true);
}

async function createRefreshSession(userId) {
  const refreshToken = generateRefreshToken(userId);
  const expiresAt = tokenExpiration(refreshToken);
  await RefreshSession.create({ userId, tokenHash: hashToken(refreshToken), expiresAt });
  return { refreshToken, expiresAt };
}

async function login({ email, password }) {
  const user = await User.findOne({ email }).select('+passwordHash');
  if (!user || !(await bcrypt.compare(password, user.passwordHash)) || !user.isEmailVerified) {
    throw new AppError('Invalid email or password.', 401);
  }
  const session = await createRefreshSession(user._id);
  return { accessToken: generateAccessToken(user._id), ...session, user: publicUser(user) };
}

async function refresh(refreshToken) {
  let payload;
  try {
    payload = verifyRefreshToken(refreshToken);
  } catch (_error) {
    throw new AppError('Invalid or expired refresh token.', 401);
  }
  const session = await RefreshSession.findOne({ tokenHash: hashToken(refreshToken) }).select('+tokenHash');
  if (!session || session.revokedAt || session.expiresAt <= new Date() || session.userId.toString() !== payload.sub) {
    throw new AppError('Invalid or expired refresh token.', 401);
  }
  session.revokedAt = new Date();
  await session.save();
  const replacement = await createRefreshSession(session.userId);
  return { accessToken: generateAccessToken(session.userId), ...replacement };
}

async function logout(refreshToken) {
  if (refreshToken) {
    await RefreshSession.findOneAndUpdate({ tokenHash: hashToken(refreshToken), revokedAt: null }, { revokedAt: new Date() });
  }
}

async function getCurrentUser(userId) {
  const user = await User.findById(userId);
  if (!user) throw new AppError('Authentication required.', 401);
  return publicUser(user);
}

async function createGuestSession() {
  const guestToken = generateGuestToken();
  const expiresAt = new Date(Date.now() + GUEST_SESSION_MS);
  await GuestSession.create({ tokenHash: hashToken(guestToken), expiresAt });
  return { guestToken, expiresAt };
}

module.exports = {
  register, verifyEmail, resendOtp, login, refresh, logout, getCurrentUser, createGuestSession,
  publicUser, OTP_MAX_ATTEMPTS,
};
