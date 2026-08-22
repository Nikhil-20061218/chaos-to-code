const fs = require('fs');
const PDFDocument = require('pdfkit');
const { ensureGeneratedPdfDirectory, createGeneratedPdfPath, removeGeneratedPdf } = require('./generatedPdfStorageService');

function displayAnswer(value) {
  if (value === null || value === undefined || value === '') return 'Not provided';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  return String(value);
}

function writeCompletedPdf({ form, answers, filePath }) {
  return new Promise((resolve, reject) => {
    const document = new PDFDocument({ margin: 54, compress: false });
    const stream = fs.createWriteStream(filePath, { flags: 'wx' });
    stream.on('finish', resolve);
    stream.on('error', reject);
    document.on('error', reject);
    document.pipe(stream);
    document.fontSize(20).text(form.title);
    document.moveDown();
    form.sections.forEach((section) => {
      document.fontSize(15).text(section.title);
      document.moveDown(0.35);
      section.fields.forEach((field) => {
        document.fontSize(11).text(`${field.label}: ${displayAnswer(answers[field.id])}`, { width: 500 });
      });
      document.moveDown();
    });
    document.end();
  });
}

async function generateCompletedPdf({ form, answers }) {
  await ensureGeneratedPdfDirectory();
  const filePath = createGeneratedPdfPath();
  try {
    await writeCompletedPdf({ form, answers, filePath });
    return filePath;
  } catch (error) {
    await removeGeneratedPdf(filePath);
    throw error;
  }
}

module.exports = { generateCompletedPdf };
