const documentService = require('../services/documentService');
const documentProcessingService = require('../services/documentProcessingService');
const guidedFormService = require('../services/guidedFormService');
const reviewService = require('../services/reviewService');
const translationService = require('../services/translationService');
const fs = require('fs');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');

const upload = asyncHandler(async (request, response) => {
  if (!request.file) throw new AppError('A file is required.', 400);
  const document = await documentService.createDocument({ file: request.file, owner: request.uploadOwner });
  response.status(201).json({ document });
});

const analyze = asyncHandler(async (request, response) => {
  const document = await documentProcessingService.analyzeDocument({
    documentId: request.params.id,
    owner: request.uploadOwner,
  });
  response.status(200).json({ document: documentService.publicDocument(document) });
});

const getDocument = asyncHandler(async (request, response) => {
  const document = await documentService.getOwnedDocument({
    documentId: request.params.id,
    owner: request.uploadOwner,
  });
  response.status(200).json({ document });
});

const getForm = asyncHandler(async (request, response) => {
  const form = await guidedFormService.getForm({ documentId: request.params.id, owner: request.uploadOwner });
  response.status(200).json({ form });
});

const getAnswers = asyncHandler(async (request, response) => {
  const answers = await guidedFormService.getAnswers({ documentId: request.params.id, owner: request.uploadOwner });
  response.status(200).json({ answers });
});

const getTranslatedFieldText = asyncHandler(async (request, response) => {
  const text = await translationService.translateFieldText({
    documentId: request.params.id,
    owner: request.uploadOwner,
    fieldId: request.params.fieldId,
    locale: request.query.locale,
  });
  response.status(200).json({ text });
});

const saveAnswers = asyncHandler(async (request, response) => {
  const answers = await guidedFormService.saveAnswers({
    documentId: request.params.id, owner: request.uploadOwner, answers: request.body && request.body.answers,
  });
  response.status(200).json({ answers });
});

const getReview = asyncHandler(async (request, response) => {
  const review = await reviewService.getReview({ documentId: request.params.id, owner: request.uploadOwner });
  response.status(200).json({ review: {
    title: review.title, language: review.language, complete: review.complete,
    missingRequiredFields: review.missingRequiredFields, sections: review.sections,
  } });
});

const confirmReview = asyncHandler(async (request, response) => {
  const document = await reviewService.confirmReview({ documentId: request.params.id, owner: request.uploadOwner });
  response.status(200).json({ document });
});

const generatePdf = asyncHandler(async (request, response) => {
  const document = await reviewService.generatePdf({ documentId: request.params.id, owner: request.uploadOwner });
  response.status(200).json({ document });
});

const downloadPdf = asyncHandler(async (request, response) => {
  const filePath = await reviewService.getGeneratedPdf({ documentId: request.params.id, owner: request.uploadOwner });
  response.set({ 'Content-Type': 'application/pdf', 'Content-Disposition': 'attachment; filename="completed-form.pdf"' });
  fs.createReadStream(filePath).on('error', () => response.destroy()).pipe(response);
});

const listDocuments = asyncHandler(async (request, response) => {
  const documents = await documentService.listDocuments({ owner: request.uploadOwner });
  response.status(200).json({ documents });
});

module.exports = { upload, analyze, getDocument, getForm, getAnswers, getTranslatedFieldText, saveAnswers, getReview, confirmReview, generatePdf, downloadPdf, listDocuments };
