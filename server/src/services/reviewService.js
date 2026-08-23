const Document = require('../models/Document');
const { findOwnedDocument } = require('./documentProcessingService');
const { completedForm } = require('./guidedFormService');
const { validateFormAnswers } = require('./formAnswerService');
const { generateCompletedPdf } = require('./pdfGenerationService');
const { hasGeneratedPdf } = require('./generatedPdfStorageService');
const AppError = require('../utils/AppError');

function isCompleteAnswer(value, fieldType) {
  if (fieldType === 'checkbox') {
    return value === true;
  }
  return value !== undefined && value !== null && (typeof value !== 'string' || value.trim().length > 0);
}

function buildDocumentReview(document) {
  const form = completedForm(document);
  const answers = validateFormAnswers(form, document.answers || {});
  const missingRequiredFields = [];
  const sections = form.sections.map((section) => ({
    id: section.id,
    title: section.title,
    fields: section.fields.map((field) => {
      const answer = Object.prototype.hasOwnProperty.call(answers, field.id) ? answers[field.id] : null;
      const complete = isCompleteAnswer(answer, field.type);
      if (field.required && !complete) missingRequiredFields.push(field.id);
      return { id: field.id, label: field.label, answer, required: field.required, complete };
    }),
  }));
  return { title: form.title, language: form.language, complete: missingRequiredFields.length === 0, missingRequiredFields, sections, form, answers };
}

async function getReview({ documentId, owner }) {
  return buildDocumentReview(await findOwnedDocument(documentId, owner));
}

async function confirmReview({ documentId, owner }) {
  const document = await findOwnedDocument(documentId, owner);
  const review = buildDocumentReview(document);
  if (!review.complete) throw new AppError('Required form answers are missing.', 422);
  if (document.finalizationStatus === 'pdf_generated' && await hasGeneratedPdf(document.generatedPdfPath)) {
    return { id: document._id.toString(), status: 'confirmed' };
  }
  const confirmed = await Document.findOneAndUpdate(
    { _id: document._id, ownerType: owner.type, ownerId: owner.id, status: 'completed', analysisStatus: 'completed' },
    { $set: { finalizationStatus: 'confirmed' } },
    { new: true },
  );
  if (!confirmed) throw new AppError('Document review is not available.', 409);
  return { id: document._id.toString(), status: 'confirmed' };
}

async function generatePdf({ documentId, owner }) {
  const document = await findOwnedDocument(documentId, owner, true);
  const review = buildDocumentReview(document);
  if (!review.complete) throw new AppError('Required form answers are missing.', 422);
  if (!['confirmed', 'pdf_generated'].includes(document.finalizationStatus)) throw new AppError('Document review must be confirmed before PDF generation.', 409);
  if (document.finalizationStatus === 'pdf_generated' && await hasGeneratedPdf(document.generatedPdfPath)) {
    return { id: document._id.toString(), status: 'pdf_generated' };
  }
  const filePath = await generateCompletedPdf({ form: review.form, answers: review.answers });
  try {
    const generated = await Document.findOneAndUpdate(
      { _id: document._id, ownerType: owner.type, ownerId: owner.id, status: 'completed', analysisStatus: 'completed', finalizationStatus: { $in: ['confirmed', 'pdf_generated'] } },
      { $set: { finalizationStatus: 'pdf_generated', generatedPdfPath: filePath, generatedPdfCreatedAt: new Date() } },
      { new: true },
    );
    if (!generated) throw new AppError('Document PDF could not be generated.', 409);
    return { id: document._id.toString(), status: 'pdf_generated' };
  } catch (error) {
    const { removeGeneratedPdf } = require('./generatedPdfStorageService');
    await removeGeneratedPdf(filePath);
    throw error;
  }
}

async function getGeneratedPdf({ documentId, owner }) {
  const document = await findOwnedDocument(documentId, owner, true);
  if (document.finalizationStatus !== 'pdf_generated' || !await hasGeneratedPdf(document.generatedPdfPath)) {
    throw new AppError('Generated PDF is not available.', 409);
  }
  return document.generatedPdfPath;
}

module.exports = { buildDocumentReview, getReview, confirmReview, generatePdf, getGeneratedPdf };
