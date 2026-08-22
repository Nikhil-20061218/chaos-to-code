const assert = require('node:assert/strict');
const test = require('node:test');
const { mapFields, validateTargetUrl } = require('../src/services/browserAutomationService');
const http = require('node:http');
process.env.JWT_ACCESS_SECRET = 'test-access-secret';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret';
const app = require('../src/app');
const Document = require('../src/models/Document');
const GuestSession = require('../src/models/GuestSession');
const { generateAccessToken } = require('../src/services/tokenService');

const form = { title: 'Test form', language: 'en', sections: [{ id: 'details', title: 'Details', fields: [
  { id: 'phone', label: 'Phone number', simpleLabel: 'Phone number', type: 'tel', required: true, help: 'Enter your phone number.' },
  { id: 'email', label: 'Email address', simpleLabel: 'Email', type: 'email', required: false, help: 'Enter your email.' },
  { id: 'notes', label: 'Notes', simpleLabel: 'Notes', type: 'textarea', required: false, help: 'Enter notes.' },
  { id: 'secret', label: 'Password', simpleLabel: 'Password', type: 'text', required: false, help: 'Enter password.' },
  { id: 'address', label: 'Address', simpleLabel: 'Address', type: 'text', required: false, help: 'Enter address.' },
] }] };

test('browser automation validates only http and https URLs', () => {
  assert.equal(validateTargetUrl('https://example.com/form'), 'https://example.com/form');
  for (const url of ['javascript:alert(1)', 'data:text/html,test', 'file:///tmp/form.html']) {
    assert.throws(() => validateTargetUrl(url), { status: 422 });
  }
});

test('field mapping fills common strong matches and leaves uncertain or password fields alone', () => {
  const result = mapFields(form, { phone: '+91 99999', email: 'a@example.com', notes: 'Hello', secret: 'never-fill', address: 'One Road' }, [
    { selector: '[data-accessai-field="0"]', tag: 'input', type: 'tel', name: 'phone', id: 'phone', label: 'Phone Number' },
    { selector: '[data-accessai-field="1"]', tag: 'input', type: 'email', name: 'email', label: 'Email address' },
    { selector: '[data-accessai-field="2"]', tag: 'textarea', type: 'text', name: 'notes', label: 'Notes' },
    { selector: '[data-accessai-field="3"]', tag: 'input', type: 'password', name: 'password', label: 'Password' },
    { selector: '[data-accessai-field="4"]', tag: 'input', type: 'text', name: 'something', label: '' },
  ]);
  assert.deepEqual(result.filled.map((field) => field.sourceField), ['phone', 'email', 'notes']);
  assert.deepEqual(result.manualReview.map((field) => field.sourceField), ['secret', 'address']);
});

test('automation endpoint rejects unauthorised and non-owner users and requires completed answers', async (t) => {
  const documentId = '507f1f77bcf86cd799439081';
  const guestDocumentId = '507f1f77bcf86cd799439082';
  const ownerId = '507f1f77bcf86cd799439011';
  const guestId = '507f1f77bcf86cd799439012';
  const documents = new Map([
    [documentId, { _id: documentId, ownerType: 'user', ownerId, status: 'completed', analysisStatus: 'completed', analysis: form, answers: {} }],
    [guestDocumentId, { _id: guestDocumentId, ownerType: 'guest', ownerId: guestId, status: 'completed', analysisStatus: 'completed', analysis: form, answers: { phone: '+91 99999' } }],
  ]);
  const originalFindOne = Document.findOne;
  const originalGuestFindOne = GuestSession.findOne;
  Document.findOne = (query) => ({
    then: (resolve, reject) => Promise.resolve([...documents.values()].find((document) => Object.entries(query).every(([key, value]) => document[key] === value)) || null).then(resolve, reject),
    select: async () => [...documents.values()].find((document) => Object.entries(query).every(([key, value]) => document[key] === value)) || null,
  });
  GuestSession.findOne = async () => ({ _id: { toString: () => guestId }, expiresAt: new Date(Date.now() + 60_000) });
  t.after(() => { Document.findOne = originalFindOne; GuestSession.findOne = originalGuestFindOne; });
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve())));
  const base = `http://127.0.0.1:${server.address().port}/api/documents`;
  const post = (id, headers = {}) => fetch(`${base}/${id}/automation/start`, { method: 'POST', headers: { 'content-type': 'application/json', ...headers }, body: JSON.stringify({ targetUrl: 'javascript:alert(1)' }) });

  assert.equal((await post(documentId)).status, 401);
  assert.equal((await post(documentId, { authorization: `Bearer ${generateAccessToken('507f1f77bcf86cd799439013')}` })).status, 404);
  const incomplete = await post(documentId, { authorization: `Bearer ${generateAccessToken(ownerId)}` });
  assert.equal(incomplete.status, 422);
  assert.match((await incomplete.json()).error.message, /Complete all required/);
  const guest = await post(guestDocumentId, { cookie: 'guestSession=valid-guest' });
  assert.equal(guest.status, 422);
  assert.match((await guest.json()).error.message, /Only public http or https/);
});
