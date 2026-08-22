const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

const AppError = require('../src/utils/AppError');
const { createGeminiDocumentAdapter } = require('../src/services/geminiDocumentAdapter');
const { validateAccessibilityTask } = require('../src/schemas/accessibilityTaskSchema');

function validTask() {
  return {
    title: 'Application Form', language: 'en', sections: [{
      id: 'personal', title: 'Personal Information', fields: [{
        id: 'full_name', label: 'Full Name', simpleLabel: 'Your name', type: 'text', required: true,
        help: 'Enter your full name as shown on your ID.',
      }],
    }],
  };
}

test('Gemini document adapter sends local PDFs as inline data and returns structured JSON', async (t) => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'accessai-ai-test-'));
  const filePath = path.join(directory, 'form.pdf');
  await fs.writeFile(filePath, Buffer.from('%PDF-1.7\nform'));
  t.after(() => fs.rm(directory, { recursive: true, force: true }));

  let request;
  const adapter = createGeminiDocumentAdapter({
    apiKey: 'test-key',
    model: 'test-model',
    client: { models: { generateContent: async (input) => {
      request = input;
      return { text: JSON.stringify(validTask()) };
    } } },
  });

  const output = await adapter.analyzeDocument({ filePath, mimeType: 'application/pdf', originalName: 'application.pdf' });
  assert.deepEqual(validateAccessibilityTask(output), validTask());
  assert.equal(request.model, 'test-model');
  assert.equal(request.config.responseMimeType, 'application/json');
  assert.match(request.contents[0].parts[0].text, /Ground every field in visible source evidence/);
  assert.match(request.contents[0].parts[0].text, /Never add personal-information fields such as phone number/);
  assert.match(request.contents[0].parts[0].text, /omit it rather than inventing it/);
  assert.equal(request.contents[0].parts[1].inlineData.mimeType, 'application/pdf');
  assert.equal(typeof request.contents[0].parts[1].inlineData.data, 'string');
  assert.equal(request.contents[0].parts[1].inlineData.data.includes(filePath), false);
});

test('Gemini document adapter rejects missing configuration and malformed provider JSON safely', async () => {
  const unconfigured = createGeminiDocumentAdapter({ apiKey: '' });
  await assert.rejects(
    unconfigured.analyzeDocument({ filePath: 'not-read', mimeType: 'application/pdf', originalName: 'form.pdf' }),
    (error) => error instanceof AppError && error.status === 503 && error.message === 'Document analysis is not configured.',
  );

  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'accessai-ai-test-'));
  const filePath = path.join(directory, 'form.png');
  await fs.writeFile(filePath, Buffer.from([0x89, 0x50, 0x4e, 0x47]));
  try {
    const adapter = createGeminiDocumentAdapter({
      apiKey: 'test-key',
      client: { models: { generateContent: async () => ({ text: '{broken' }) } },
    });
    await assert.rejects(
      adapter.analyzeDocument({ filePath, mimeType: 'image/png', originalName: 'form.png' }),
      (error) => error instanceof AppError && error.status === 502 && error.message === 'Document analysis provider returned invalid JSON.',
    );
  } finally {
    await fs.rm(directory, { recursive: true, force: true });
  }
});

test('Gemini document adapter converts provider failures to safe errors and leaves schema validation to the shared validator', async (t) => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'accessai-ai-test-'));
  const filePath = path.join(directory, 'form.jpeg');
  await fs.writeFile(filePath, Buffer.from([0xff, 0xd8, 0xff]));
  t.after(() => fs.rm(directory, { recursive: true, force: true }));

  const failingAdapter = createGeminiDocumentAdapter({
    apiKey: 'test-key',
    client: { models: { generateContent: async () => { throw new Error('provider detail'); } } },
  });
  await assert.rejects(
    failingAdapter.analyzeDocument({ filePath, mimeType: 'image/jpeg', originalName: 'form.jpeg' }),
    (error) => error instanceof AppError && error.status === 502 && error.message === 'Document analysis provider request failed.',
  );

  const invalidTaskAdapter = createGeminiDocumentAdapter({
    apiKey: 'test-key',
    client: { models: { generateContent: async () => ({ text: JSON.stringify({ title: 'Invalid', language: 'en', sections: [] }) }) } },
  });
  const output = await invalidTaskAdapter.analyzeDocument({ filePath, mimeType: 'image/jpeg', originalName: 'form.jpeg' });
  assert.throws(() => validateAccessibilityTask(output), (error) => error instanceof AppError && error.status === 422);
});
