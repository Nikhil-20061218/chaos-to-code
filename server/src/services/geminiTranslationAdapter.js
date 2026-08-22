const { GoogleGenAI } = require('@google/genai');
const AppError = require('../utils/AppError');

const TRANSLATION_SCHEMA = {
  type: 'object',
  properties: {
    label: { type: 'string' },
    help: { type: 'string' },
  },
  required: ['label', 'help'],
};

function createGeminiTranslationAdapter({ client, apiKey = process.env.GEMINI_API_KEY, model = process.env.GEMINI_MODEL || 'gemini-2.5-flash' } = {}) {
  return {
    async translateFieldText({ label, help, languageName }) {
      if (!apiKey && !client) throw new AppError('Translation is not configured.', 503);
      const gemini = client || new GoogleGenAI({ apiKey });
      let response;
      try {
        response = await gemini.models.generateContent({
          model,
          contents: [{
            role: 'user',
            parts: [{ text: `Translate the following accessible form text from English to ${languageName}. Preserve its meaning, use plain language, and return only the requested JSON fields.\n\nLabel: ${label}\nHelp: ${help || ''}` }],
          }],
          config: { responseMimeType: 'application/json', responseSchema: TRANSLATION_SCHEMA },
        });
      } catch (_error) {
        throw new AppError('Translation provider request failed.', 502);
      }
      if (!response || typeof response.text !== 'string' || response.text.trim() === '') {
        throw new AppError('Translation provider returned no usable result.', 502);
      }
      try {
        const translated = JSON.parse(response.text);
        if (typeof translated.label !== 'string' || typeof translated.help !== 'string') throw new Error('Invalid translation');
        return translated;
      } catch (_error) {
        throw new AppError('Translation provider returned invalid data.', 502);
      }
    },
  };
}

module.exports = { createGeminiTranslationAdapter, TRANSLATION_SCHEMA };
