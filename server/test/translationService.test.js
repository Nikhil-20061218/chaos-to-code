const assert = require('node:assert/strict');
const test = require('node:test');

const AppError = require('../src/utils/AppError');
const { createGeminiTranslationAdapter } = require('../src/services/geminiTranslationAdapter');

test('Gemini translation adapter translates only field text and returns structured text', async () => {
  let request;
  const adapter = createGeminiTranslationAdapter({
    apiKey: 'test-key',
    model: 'test-model',
    client: { models: { generateContent: async (input) => {
      request = input;
      return { text: JSON.stringify({ label: 'पूरा नाम', help: 'अपना पूरा नाम लिखें।' }) };
    } } },
  });

  const translated = await adapter.translateFieldText({
    label: 'Full name', help: 'Enter your full name.', languageName: 'Hindi',
  });

  assert.deepEqual(translated, { label: 'पूरा नाम', help: 'अपना पूरा नाम लिखें।' });
  assert.equal(request.model, 'test-model');
  assert.equal(request.config.responseMimeType, 'application/json');
  assert.match(request.contents[0].parts[0].text, /English to Hindi/);
  assert.match(request.contents[0].parts[0].text, /Label: Full name/);
});

test('Gemini translation adapter reports unavailable configuration and invalid provider data safely', async () => {
  const unconfigured = createGeminiTranslationAdapter({ apiKey: '' });
  await assert.rejects(
    unconfigured.translateFieldText({ label: 'Name', help: '', languageName: 'Hindi' }),
    (error) => error instanceof AppError && error.status === 503 && error.message === 'Translation is not configured.',
  );

  const invalidResponse = createGeminiTranslationAdapter({
    apiKey: 'test-key',
    client: { models: { generateContent: async () => ({ text: JSON.stringify({ label: 'नाम' }) }) } },
  });
  await assert.rejects(
    invalidResponse.translateFieldText({ label: 'Name', help: '', languageName: 'Hindi' }),
    (error) => error instanceof AppError && error.status === 502 && error.message === 'Translation provider returned invalid data.',
  );
});
