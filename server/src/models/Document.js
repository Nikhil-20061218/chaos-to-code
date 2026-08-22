const mongoose = require('mongoose');

const documentSchema = new mongoose.Schema(
  {
    ownerType: { type: String, enum: ['user', 'guest'], required: true },
    ownerId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
    originalName: { type: String, required: true, maxlength: 255 },
    storagePath: { type: String, required: true, select: false },
    mimeType: { type: String, enum: ['application/pdf', 'image/png', 'image/jpeg'], required: true },
    size: { type: Number, required: true, min: 1, max: 10 * 1024 * 1024 },
    status: { type: String, enum: ['uploaded', 'processing', 'completed', 'failed'], default: 'uploaded' },
    analysisStatus: { type: String, enum: ['not_started', 'processing', 'completed', 'failed'], default: 'not_started' },
    analysis: { type: mongoose.Schema.Types.Mixed, default: undefined },
    expiresAt: { type: Date, required: true, index: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

documentSchema.index({ ownerType: 1, ownerId: 1, createdAt: -1 });

module.exports = mongoose.model('Document', documentSchema);
