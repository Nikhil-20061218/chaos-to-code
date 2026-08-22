const crypto = require('crypto');
const fs = require('fs/promises');
const path = require('path');
const AppError = require('../utils/AppError');

function getGeneratedPdfDirectory() {
  return path.resolve(process.env.GENERATED_PDF_DIR || path.join(__dirname, '..', '..', 'uploads', 'generated'));
}

async function ensureGeneratedPdfDirectory() {
  const directory = getGeneratedPdfDirectory();
  await fs.mkdir(directory, { recursive: true });
  return directory;
}

function safeGeneratedPdfPath(filename) {
  const directory = getGeneratedPdfDirectory();
  const resolved = path.resolve(directory, filename);
  if (path.dirname(resolved) !== directory || path.extname(resolved).toLowerCase() !== '.pdf') {
    throw new AppError('Generated PDF path is invalid.', 500);
  }
  return resolved;
}

function createGeneratedPdfPath() {
  return safeGeneratedPdfPath(`${crypto.randomUUID()}.pdf`);
}

async function hasGeneratedPdf(filePath) {
  if (!filePath) return false;
  try {
    const directory = getGeneratedPdfDirectory();
    const resolved = path.resolve(filePath);
    if (path.dirname(resolved) !== directory || path.extname(resolved).toLowerCase() !== '.pdf') return false;
    const stat = await fs.stat(resolved);
    return stat.isFile() && stat.size > 0;
  } catch (_error) {
    return false;
  }
}

async function removeGeneratedPdf(filePath) {
  if (!filePath) return;
  try {
    const directory = getGeneratedPdfDirectory();
    const resolved = path.resolve(filePath);
    if (path.dirname(resolved) !== directory || path.extname(resolved).toLowerCase() !== '.pdf') return;
    await fs.unlink(resolved);
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
}

module.exports = { getGeneratedPdfDirectory, ensureGeneratedPdfDirectory, createGeneratedPdfPath, hasGeneratedPdf, removeGeneratedPdf };
