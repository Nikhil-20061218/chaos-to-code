const mongoose = require('mongoose');

const emailVerificationSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true, index: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    otpHash: { type: String, required: true, select: false },
    expiresAt: { type: Date, required: true, expires: 0 },
    attempts: { type: Number, default: 0, min: 0 },
    lastSentAt: { type: Date, required: true },
    resendCount: { type: Number, default: 0, min: 0 },
    resendWindowStartedAt: { type: Date, required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

module.exports = mongoose.model('EmailVerification', emailVerificationSchema);
