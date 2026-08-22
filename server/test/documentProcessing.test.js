const assert = require('node:assert/strict');
const http = require('node:http');
const test = require('node:test');

process.env.NODE_ENV = 'test';
process.env.JWT_ACCESS_SECRET = 'test-access-secret';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret';

const app = require('../src/app');
const Document = require('../src/models/Document');
const GuestSession = require('../src/models/GuestSession');
const aiService = require('../src/services/aiService');
const { generateAccessToken } = require('../src/services/tokenService');

const userId = '507f1f77bcf86cd799439011';
const otherUserId = '507f1f77bcf86cd799439013';
const guestId = '507f1f77bcf86cd799439012';

function validTask(title = 'Application Form') {
  return {
    title,
    language: 'en',
    sections: [{
      id: 'personal', title: 'Personal Information', fields: [{
        id: 'full_name', label: 'Full Name', simpleLabel: 'Your name', type: 'text', required: true,
        help: 'Enter your full name as shown on your ID.',
      }],
    }],
  };
}

async function withServer(t, callback) {
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve()))));
  return callback(`http://127.0.0.1:${server.address().port}`);
}

function matchingDocument(documents, query) {
  return documents.get(query._id) && Object.entries(query).every(([key, value]) => documents.get(query._id)[key] === value)
    ? documents.get(query._id)
    : null;
}

function updateDocument(document, update) {
  if (!document) return null;
  if (update.$set) Object.assign(document, update.$set);
  if (update.$unset) Object.keys(update.$unset).forEach((key) => delete document[key]);
  return document;
}

test('document processing enforces ownership, state transitions, and validated AI results', async (t) => {
  const originalFindOne = Document.findOne;
  const originalFindOneAndUpdate = Document.findOneAndUpdate;
  const originalFindGuest = GuestSession.findOne;
  const originalAnalyze = aiService.analyzeDocument;
  const documents = new Map([
    ['507f1f77bcf86cd799439021', { _id: '507f1f77bcf86cd799439021', ownerType: 'user', ownerId: userId, originalName: 'form.pdf', mimeType: 'application/pdf', size: 50, storagePath: 'safe/form.pdf', status: 'uploaded', analysisStatus: 'not_started' }],
    ['507f1f77bcf86cd799439022', { _id: '507f1f77bcf86cd799439022', ownerType: 'guest', ownerId: guestId, originalName: 'guest.png', mimeType: 'image/png', size: 50, storagePath: 'safe/guest.png', status: 'uploaded', analysisStatus: 'not_started' }],
    ['507f1f77bcf86cd799439023', { _id: '507f1f77bcf86cd799439023', ownerType: 'user', ownerId: userId, originalName: 'working.pdf', mimeType: 'application/pdf', size: 50, storagePath: 'safe/working.pdf', status: 'processing', analysisStatus: 'processing' }],
    ['507f1f77bcf86cd799439024', { _id: '507f1f77bcf86cd799439024', ownerType: 'user', ownerId: userId, originalName: 'invalid.pdf', mimeType: 'application/pdf', size: 50, storagePath: 'safe/invalid.pdf', status: 'uploaded', analysisStatus: 'not_started' }],
    ['507f1f77bcf86cd799439025', { _id: '507f1f77bcf86cd799439025', ownerType: 'user', ownerId: userId, originalName: 'failure.pdf', mimeType: 'application/pdf', size: 50, storagePath: 'safe/failure.pdf', status: 'uploaded', analysisStatus: 'not_started' }],
  ]);

  Document.findOne = (query) => ({
    select: async () => matchingDocument(documents, query),
    then: (resolve, reject) => Promise.resolve(matchingDocument(documents, query)).then(resolve, reject),
  });
  Document.findOneAndUpdate = (query, update) => ({
    select: async () => updateDocument(matchingDocument(documents, query), update),
    then: (resolve, reject) => Promise.resolve(updateDocument(matchingDocument(documents, query), update)).then(resolve, reject),
  });
  GuestSession.findOne = async () => ({ _id: { toString: () => guestId }, expiresAt: new Date(Date.now() + 60_000) });
  aiService.analyzeDocument = async (input) => {
    if (input.originalName === 'form.pdf') {
      assert.equal(input.filePath, 'safe/form.pdf');
      assert.equal(documents.get('507f1f77bcf86cd799439021').status, 'processing');
    }
    return validTask();
  };

  t.after(() => {
    Document.findOne = originalFindOne;
    Document.findOneAndUpdate = originalFindOneAndUpdate;
    GuestSession.findOne = originalFindGuest;
    aiService.analyzeDocument = originalAnalyze;
  });

  const auth = { authorization: `Bearer ${generateAccessToken(userId)}` };
  const otherAuth = { authorization: `Bearer ${generateAccessToken(otherUserId)}` };

  await withServer(t, async (baseUrl) => {
    const analyzed = await fetch(`${baseUrl}/api/documents/507f1f77bcf86cd799439021/analyze`, { method: 'POST', headers: auth });
    assert.equal(analyzed.status, 200);
    const analyzedBody = await analyzed.json();
    assert.equal(analyzedBody.document.status, 'completed');
    assert.deepEqual(analyzedBody.document.analysis, validTask());
    assert.equal('storagePath' in analyzedBody.document, false);
    assert.equal(documents.get('507f1f77bcf86cd799439021').analysisStatus, 'completed');

    const guest = await fetch(`${baseUrl}/api/documents/507f1f77bcf86cd799439022/analyze`, { method: 'POST', headers: { cookie: 'guestSession=guest-token' } });
    assert.equal(guest.status, 200);
    assert.equal(documents.get('507f1f77bcf86cd799439022').status, 'completed');

    const nonOwner = await fetch(`${baseUrl}/api/documents/507f1f77bcf86cd799439021/analyze`, { method: 'POST', headers: otherAuth });
    assert.equal(nonOwner.status, 404);
    const missing = await fetch(`${baseUrl}/api/documents/507f1f77bcf86cd799439099/analyze`, { method: 'POST', headers: auth });
    assert.equal(missing.status, 404);
    const invalidId = await fetch(`${baseUrl}/api/documents/not-a-document-id/analyze`, { method: 'POST', headers: auth });
    assert.equal(invalidId.status, 404);
    const duplicate = await fetch(`${baseUrl}/api/documents/507f1f77bcf86cd799439023/analyze`, { method: 'POST', headers: auth });
    assert.equal(duplicate.status, 409);

    aiService.analyzeDocument = async () => ({ title: 'Invalid', language: 'en', sections: [] });
    const invalid = await fetch(`${baseUrl}/api/documents/507f1f77bcf86cd799439024/analyze`, { method: 'POST', headers: auth });
    assert.equal(invalid.status, 422);
    assert.equal((await invalid.json()).error.message, 'We could not identify form fields with confidence. Please upload a clearer document.');
    assert.equal(documents.get('507f1f77bcf86cd799439024').status, 'failed');
    assert.equal(documents.get('507f1f77bcf86cd799439024').analysisStatus, 'failed');

    aiService.analyzeDocument = async () => { throw new Error('provider unavailable'); };
    const failed = await fetch(`${baseUrl}/api/documents/507f1f77bcf86cd799439025/analyze`, { method: 'POST', headers: auth });
    assert.equal(failed.status, 502);
    assert.equal(documents.get('507f1f77bcf86cd799439025').status, 'failed');

    const ownerGet = await fetch(`${baseUrl}/api/documents/507f1f77bcf86cd799439021`, { headers: auth });
    assert.equal(ownerGet.status, 200);
    assert.equal((await ownerGet.json()).document.status, 'completed');
    const nonOwnerGet = await fetch(`${baseUrl}/api/documents/507f1f77bcf86cd799439021`, { headers: otherAuth });
    assert.equal(nonOwnerGet.status, 404);
  });
});
