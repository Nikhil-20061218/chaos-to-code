const { createGeminiDocumentAdapter } = require('./geminiDocumentAdapter');

let adapter;

function getAdapter() {
  if (!adapter) adapter = createGeminiDocumentAdapter();
  return adapter;
}

async function analyzeDocument(input) {
  return getAdapter().analyzeDocument(input);
}

module.exports = { analyzeDocument };
