const Document = require('../models/Document');
const { finalizeUploadedFile, removeFile } = require('./documentStorageService');

const DEFAULT_RETENTION_MS = 24 * 60 * 60 * 1000;

function retentionMs() {
  const configuredHours = Number(process.env.DOCUMENT_RETENTION_HOURS);
  return Number.isFinite(configuredHours) && configuredHours > 0
    ? configuredHours * 60 * 60 * 1000
    : DEFAULT_RETENTION_MS;
}

function publicDocument(document) {
  const result = {
    id: document._id.toString(),
    originalName: document.originalName,
    mimeType: document.mimeType,
    size: document.size,
    status: document.status,
  };
  if (document.status === 'completed' && document.analysis) result.analysis = document.analysis;
  return result;
}

async function getOwnedDocument({ documentId, owner }) {
  const { findOwnedDocument } = require('./documentProcessingService');
  return publicDocument(await findOwnedDocument(documentId, owner));
}

async function createDocument({ file, owner }) {
  let finalized;
  try {
    finalized = await finalizeUploadedFile(file);
    const document = await Document.create({
      ownerType: owner.type,
      ownerId: owner.id,
      originalName: file.originalname,
      storagePath: finalized.storagePath,
      mimeType: finalized.mimeType,
      size: file.size,
      status: 'uploaded',
      expiresAt: new Date(Date.now() + retentionMs()),
    });
    return publicDocument(document);
  } catch (error) {
    await removeFile(finalized ? finalized.storagePath : file.path);
    throw error;
  }
}

async function cleanupExpiredDocuments() {
  const expiredDocuments = await Document.find({ expiresAt: { $lte: new Date() } }).select('+storagePath');
  for (const document of expiredDocuments) {
    await removeFile(document.storagePath);
    await Document.deleteOne({ _id: document._id });
  }
}

function scheduleExpiredDocumentCleanup() {
  const interval = setInterval(() => {
    cleanupExpiredDocuments().catch(() => {});
  }, 60 * 1000);
  interval.unref();
  return interval;
}

module.exports = { createDocument, getOwnedDocument, cleanupExpiredDocuments, scheduleExpiredDocumentCleanup, publicDocument, retentionMs };
