const fs = require('fs/promises');
const { GoogleGenAI } = require('@google/genai');
const AppError = require('../utils/AppError');
const { DOCUMENT_ANALYSIS_INSTRUCTIONS } = require('../prompts/documentAnalysisPrompt');

const SUPPORTED_MIME_TYPES = new Set(['application/pdf', 'image/png', 'image/jpeg']);

const ACCESSIBILITY_TASK_JSON_SCHEMA = {
  type: 'object',
  properties: {
    title: { type: 'string' },
    language: { type: 'string' },
    sections: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          title: { type: 'string' },
          fields: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                label: { type: 'string' },
                simpleLabel: { type: 'string' },
                type: { type: 'string', enum: ['text', 'textarea', 'email', 'tel', 'number', 'date', 'select', 'checkbox', 'radio'] },
                required: { type: 'boolean' },
                help: { type: 'string' },
              },
              required: ['id', 'label', 'simpleLabel', 'type', 'required', 'help'],
            },
          },
        },
        required: ['id', 'title', 'fields'],
      },
    },
  },
  required: ['title', 'language', 'sections'],
};

function buildDocumentPart({ data, mimeType }) {
  return { inlineData: { mimeType, data: data.toString('base64') } };
}

function createGeminiDocumentAdapter({ client, apiKey = process.env.GEMINI_API_KEY, model = process.env.GEMINI_MODEL || 'gemini-2.5-flash' } = {}) {
  return {
    async analyzeDocument({ filePath, mimeType, originalName }) {
      if (!SUPPORTED_MIME_TYPES.has(mimeType)) throw new AppError('Document type is not supported for analysis.', 400);
      if (!apiKey && !client) throw new AppError('Document analysis is not configured.', 503);

      const data = await fs.readFile(filePath);
      if (data.length === 0) throw new AppError('Document is empty.', 400);
      const gemini = client || new GoogleGenAI({ apiKey });
      let response;
      try {
        response = await gemini.models.generateContent({
          model,
          contents: [{
            role: 'user',
            parts: [
              { text: `${DOCUMENT_ANALYSIS_INSTRUCTIONS}\n\nExtract the accessible form structure from ${originalName}.` },
              buildDocumentPart({ data, mimeType }),
            ],
          }],
          config: {
            responseMimeType: 'application/json',
            responseSchema: ACCESSIBILITY_TASK_JSON_SCHEMA,
          },
        });
      } catch (_error) {
        throw new AppError('Document analysis provider request failed.', 502);
      }

      if (!response || typeof response.text !== 'string' || response.text.trim() === '') {
        throw new AppError('Document analysis provider returned no usable result.', 502);
      }
      try {
        return JSON.parse(response.text);
      } catch (_error) {
        throw new AppError('Document analysis provider returned invalid JSON.', 502);
      }
    },
  };
}

module.exports = { createGeminiDocumentAdapter, buildDocumentPart, ACCESSIBILITY_TASK_JSON_SCHEMA };
