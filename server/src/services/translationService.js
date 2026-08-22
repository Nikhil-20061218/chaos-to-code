const guidedFormService = require('./guidedFormService');
const { createGeminiTranslationAdapter } = require('./geminiTranslationAdapter');
const AppError = require('../utils/AppError');

const TARGET_LANGUAGES = {
  'hi-IN': 'Hindi',
  'te-IN': 'Telugu',
  'kn-IN': 'Kannada',
};

let adapter;

function getAdapter() {
  if (!adapter) adapter = createGeminiTranslationAdapter();
  return adapter;
}

async function translateFieldText({ documentId, owner, fieldId, locale }) {
  const languageName = TARGET_LANGUAGES[locale];
  if (!languageName) throw new AppError('The requested translation language is not supported.', 400);

  const form = await guidedFormService.getForm({ documentId, owner });
  const field = form.sections.flatMap((section) => section.fields).find((candidate) => candidate.id === fieldId);
  if (!field) throw new AppError('Form field was not found.', 404);
  return getAdapter().translateFieldText({ label: field.label, help: field.help, languageName });
}

module.exports = { translateFieldText, TARGET_LANGUAGES };
