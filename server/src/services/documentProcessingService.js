const mongoose = require('mongoose');
const Document = require('../models/Document');
const aiService = require('./aiService');
const { validateAccessibilityTask } = require('../schemas/accessibilityTaskSchema');
const AppError = require('../utils/AppError');

function documentQuery(id, owner) {
  return { _id: id, ownerType: owner.type, ownerId: owner.id };
}

function assertValidDocumentId(id) {
  if (!mongoose.isValidObjectId(id)) throw new AppError('Document not found.', 404);
}

async function findOwnedDocument(id, owner, includeStoragePath = false) {
  assertValidDocumentId(id);
  const query = Document.findOne(documentQuery(id, owner));
  const document = includeStoragePath ? await query.select('+storagePath') : await query;
  if (!document) throw new AppError('Document not found.', 404);
  return document;
}

async function analyzeDocument({ documentId, owner }) {
  const existing = await findOwnedDocument(documentId, owner, true);
  if (existing.status === 'processing') throw new AppError('Document analysis is already in progress.', 409);
  if (existing.status === 'completed') throw new AppError('Document analysis has already completed.', 409);
  if (existing.status !== 'uploaded') throw new AppError('Document cannot be analyzed in its current state.', 409);

  const document = await Document.findOneAndUpdate(
    { ...documentQuery(documentId, owner), status: 'uploaded' },
    { $set: { status: 'processing', analysisStatus: 'processing' } },
    { new: true },
  ).select('+storagePath');
  if (!document) throw new AppError('Document analysis could not be started.', 409);

  try {
    const output = await aiService.analyzeDocument({
      filePath: document.storagePath,
      mimeType: document.mimeType,
      originalName: document.originalName,
    });
    const analysis = validateAccessibilityTask(output);
    const completed = await Document.findOneAndUpdate(
      { _id: document._id, status: 'processing' },
      { $set: { status: 'completed', analysisStatus: 'completed', analysis } },
      { new: true },
    );
    if (!completed) throw new AppError('Document analysis could not be completed.', 500);
    return completed;
  } catch (error) {
    try {
      await Document.findOneAndUpdate(
        { _id: document._id, status: 'processing' },
        { $set: { status: 'failed', analysisStatus: 'failed' }, $unset: { analysis: 1 } },
        { new: true },
      );
    } catch (_updateError) {
      // The original error is still safely handled by the global error middleware.
    }
    if (error instanceof AppError && error.status === 422) throw error;
    throw new AppError('Document analysis failed.', 502);
  }
}

module.exports = { analyzeDocument, findOwnedDocument };
