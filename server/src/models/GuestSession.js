const mongoose = require('mongoose');

const guestSessionSchema = new mongoose.Schema(
  {
    tokenHash: { type: String, required: true, unique: true, select: false },
    expiresAt: { type: Date, required: true, expires: 0 },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

module.exports = mongoose.model('GuestSession', guestSessionSchema);
