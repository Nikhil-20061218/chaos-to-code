const documentService = require('../services/documentService');
const documentProcessingService = require('../services/documentProcessingService');
const guidedFormService = require('../services/guidedFormService');
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

const saveAnswers = asyncHandler(async (request, response) => {
  const answers = await guidedFormService.saveAnswers({
    documentId: request.params.id, owner: request.uploadOwner, answers: request.body && request.body.answers,
  });
  response.status(200).json({ answers });
});

module.exports = { upload, analyze, getDocument, getForm, getAnswers, saveAnswers };
