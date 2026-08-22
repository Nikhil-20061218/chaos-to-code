const crypto = require('crypto');
const fs = require('fs/promises');
const path = require('path');
const AppError = require('../utils/AppError');

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const FILE_TYPES = {
  '.pdf': { mimeType: 'application/pdf', extension: 'pdf' },
  '.png': { mimeType: 'image/png', extension: 'png' },
  '.jpg': { mimeType: 'image/jpeg', extension: 'jpg' },
  '.jpeg': { mimeType: 'image/jpeg', extension: 'jpg' },
};

function getUploadDirectory() {
  return path.resolve(process.env.UPLOAD_TMP_DIR || path.join(__dirname, '..', '..', 'uploads', 'tmp'));
}

async function ensureUploadDirectory() {
  const directory = getUploadDirectory();
  await fs.mkdir(directory, { recursive: true });
  return directory;
}

function getAllowedFileType(file) {
  const extension = path.extname(file.originalname || '').toLowerCase();
  const type = FILE_TYPES[extension];
  if (!type || file.mimetype !== type.mimeType) {
    throw new AppError('Only PDF, PNG, and JPEG files are supported.', 400);
  }
  return type;
}

async function detectMimeType(filePath) {
  const handle = await fs.open(filePath, 'r');
  try {
    const buffer = Buffer.alloc(8);
    const { bytesRead } = await handle.read(buffer, 0, buffer.length, 0);
    const header = buffer.subarray(0, bytesRead);
    if (header.subarray(0, 5).toString('ascii') === '%PDF-') return 'application/pdf';
    if (header.length >= 8 && header.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'image/png';
    if (header.length >= 3 && header[0] === 0xff && header[1] === 0xd8 && header[2] === 0xff) return 'image/jpeg';
    return null;
  } finally {
    await handle.close();
  }
}

function safeStoragePath(filename) {
  const directory = getUploadDirectory();
  const resolved = path.resolve(directory, filename);
  if (path.dirname(resolved) !== directory) throw new AppError('Invalid upload path.', 500);
  return resolved;
}

async function removeFile(filePath) {
  if (!filePath) return;
  try {
    const directory = getUploadDirectory();
    const resolved = path.resolve(filePath);
    if (path.dirname(resolved) !== directory) return;
    await fs.unlink(resolved);
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
}

async function finalizeUploadedFile(file) {
  const expected = getAllowedFileType(file);
  if (!file.size || file.size > MAX_FILE_SIZE) throw new AppError('File must be 10 MB or smaller.', 413);
  const detectedMimeType = await detectMimeType(file.path);
  if (detectedMimeType !== expected.mimeType) throw new AppError('File content does not match its declared type.', 400);

  const filename = `${crypto.randomUUID()}.${expected.extension}`;
  const finalPath = safeStoragePath(filename);
  await fs.rename(file.path, finalPath);
  return { storagePath: finalPath, mimeType: expected.mimeType };
}

module.exports = {
  MAX_FILE_SIZE,
  ensureUploadDirectory,
  getUploadDirectory,
  getAllowedFileType,
  finalizeUploadedFile,
  removeFile,
};
