const documentService = require('../services/documentService');
const documentProcessingService = require('../services/documentProcessingService');
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

module.exports = { upload, analyze, getDocument };
