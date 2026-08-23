const fs = require('fs');
const https = require('https');
const PDFDocument = require('pdfkit');
const { ensureGeneratedPdfDirectory, createGeneratedPdfPath, removeGeneratedPdf } = require('./generatedPdfStorageService');

const FONT_URLS = {
  hi: 'https://raw.githubusercontent.com/googlefonts/noto-fonts/master/hinted/ttf/NotoSansDevanagari/NotoSansDevanagari-Regular.ttf',
  te: 'https://raw.githubusercontent.com/googlefonts/noto-fonts/master/hinted/ttf/NotoSansTelugu/NotoSansTelugu-Regular.ttf',
  kn: 'https://raw.githubusercontent.com/googlefonts/noto-fonts/master/hinted/ttf/NotoSansKannada/NotoSansKannada-Regular.ttf',
};

const fontCache = new Map();

function downloadFont(url) {
  if (fontCache.has(url)) return Promise.resolve(fontCache.get(url));
  return new Promise((resolve, reject) => {
    function get(targetUrl) {
      https.get(targetUrl, (res) => {
        if ([301, 302].includes(res.statusCode) && res.headers.location) {
          get(res.headers.location);
          return;
        }
        if (res.statusCode !== 200) {
          return reject(new Error(`Font download failed with status ${res.statusCode}`));
        }
        const chunks = [];
        res.on('data', (chunk) => chunks.push(chunk));
        res.on('end', () => {
          const buffer = Buffer.concat(chunks);
          fontCache.set(url, buffer);
          resolve(buffer);
        });
      }).on('error', reject);
    }
    get(url);
  });
}

function displayAnswer(value) {
  if (value === null || value === undefined || value === '') return 'Not provided';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  return String(value);
}

async function writeCompletedPdf({ form, answers, filePath }) {
  let fontBuffer = null;
  const lang = String(form.language || '').toLowerCase().substring(0, 2);
  const fontUrl = FONT_URLS[lang];

  if (fontUrl) {
    try {
      fontBuffer = await downloadFont(fontUrl);
    } catch (error) {
      console.warn(`Could not load Unicode font for language '${lang}'; falling back to Helvetica.`, error.message);
    }
  }

  return new Promise((resolve, reject) => {
    try {
      const document = new PDFDocument({ margin: 54, compress: false });
      const stream = fs.createWriteStream(filePath, { flags: 'wx' });
      stream.on('finish', resolve);
      stream.on('error', reject);
      document.on('error', reject);
      document.pipe(stream);

      if (fontBuffer) {
        document.registerFont('UnicodeFont', fontBuffer);
        document.font('UnicodeFont');
      }

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
    } catch (error) {
      reject(error);
    }
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
