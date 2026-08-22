const Document = require('../models/Document');
const { findOwnedDocument } = require('./documentProcessingService');
const { validateAccessibilityTask } = require('../schemas/accessibilityTaskSchema');
const { validateFormAnswers } = require('./formAnswerService');
const AppError = require('../utils/AppError');

function completedForm(document) {
  if (document.status === 'processing' || document.analysisStatus === 'processing') {
    throw new AppError('Document analysis is still in progress.', 409);
  }
  if (document.status === 'failed' || document.analysisStatus === 'failed') {
    throw new AppError('Document analysis failed.', 409);
  }
  if (document.status !== 'completed' || document.analysisStatus !== 'completed' || !document.analysis) {
    throw new AppError('Document form is not available.', 409);
  }
  return validateAccessibilityTask(document.analysis);
}

async function getForm({ documentId, owner }) {
  return completedForm(await findOwnedDocument(documentId, owner));
}

async function getAnswers({ documentId, owner }) {
  const document = await findOwnedDocument(documentId, owner);
  completedForm(document);
  return document.answers && typeof document.answers === 'object' && !Array.isArray(document.answers) ? document.answers : {};
}

async function saveAnswers({ documentId, owner, answers }) {
  const document = await findOwnedDocument(documentId, owner);
  const form = completedForm(document);
  const updates = validateFormAnswers(form, answers);
  const existing = document.answers && typeof document.answers === 'object' && !Array.isArray(document.answers) ? document.answers : {};
  const merged = { ...existing, ...updates };
  const saved = await Document.findOneAndUpdate(
    { _id: document._id, ownerType: owner.type, ownerId: owner.id, status: 'completed', analysisStatus: 'completed' },
    { $set: { answers: merged } },
    { new: true },
  );
  if (!saved) throw new AppError('Document form is not available.', 409);
  return merged;
}

module.exports = { getForm, getAnswers, saveAnswers, completedForm };
