const crypto = require('crypto');
const multer = require('multer');
const AppError = require('../utils/AppError');
const { MAX_FILE_SIZE, ensureUploadDirectory, getAllowedFileType } = require('../services/documentStorageService');

const storage = multer.diskStorage({
  destination: async (_request, _file, callback) => {
    try {
      callback(null, await ensureUploadDirectory());
    } catch (error) {
      callback(error);
    }
  },
  filename: (_request, _file, callback) => callback(null, crypto.randomUUID()),
});

const uploadFile = multer({
  storage,
  limits: { fileSize: MAX_FILE_SIZE, files: 1 },
  fileFilter: (_request, file, callback) => {
    try {
      getAllowedFileType(file);
      callback(null, true);
    } catch (error) {
      callback(error instanceof AppError ? error : new AppError('Unsupported file.', 400));
    }
  },
}).single('file');

module.exports = uploadFile;
