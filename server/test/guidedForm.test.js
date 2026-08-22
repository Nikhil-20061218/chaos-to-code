const assert = require('node:assert/strict');
const http = require('node:http');
const test = require('node:test');

process.env.NODE_ENV = 'test';
process.env.JWT_ACCESS_SECRET = 'test-access-secret';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret';

const app = require('../src/app');
const Document = require('../src/models/Document');
const GuestSession = require('../src/models/GuestSession');
const { generateAccessToken } = require('../src/services/tokenService');

const userId = '507f1f77bcf86cd799439011';
const otherUserId = '507f1f77bcf86cd799439013';
const guestId = '507f1f77bcf86cd799439012';

function validTask() {
  return {
    title: 'Application Form', language: 'en', sections: [{
      id: 'personal', title: 'Personal Information', fields: [
        { id: 'full_name', label: 'Full Name', simpleLabel: 'Your name', type: 'text', required: true, help: 'Enter your full name.' },
        { id: 'email', label: 'Email', simpleLabel: 'Email address', type: 'email', required: true, help: 'Enter your email address.' },
        { id: 'age', label: 'Age', simpleLabel: 'Age', type: 'number', required: false, help: 'Enter your age.' },
        { id: 'birth_date', label: 'Birth date', simpleLabel: 'Birth date', type: 'date', required: false, help: 'Enter your birth date.' },
        { id: 'contact', label: 'Phone', simpleLabel: 'Phone number', type: 'tel', required: false, help: 'Enter your phone number.' },
        { id: 'consent', label: 'Consent', simpleLabel: 'Consent', type: 'checkbox', required: false, help: 'Confirm consent.' },
        { id: 'method', label: 'Contact method', simpleLabel: 'Contact method', type: 'select', required: false, help: 'Choose a method.', options: ['Email', 'Phone'] },
        { id: 'priority', label: 'Priority', simpleLabel: 'Priority', type: 'radio', required: false, help: 'Choose a priority.', options: ['High', 'Low'] },
        { id: 'notes', label: 'Notes', simpleLabel: 'Notes', type: 'textarea', required: false, help: 'Add notes.' },
      ],
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
  const document = documents.get(query._id);
  return document && Object.entries(query).every(([key, value]) => document[key] === value) ? document : null;
}

function mockedFindOne(documents) {
  return (query) => ({
    select: async () => matchingDocument(documents, query),
    then: (resolve, reject) => Promise.resolve(matchingDocument(documents, query)).then(resolve, reject),
  });
}

test('guided form APIs enforce ownership, validate partial answers, and preserve the form definition', async (t) => {
  const originalFindOne = Document.findOne;
  const originalFindOneAndUpdate = Document.findOneAndUpdate;
  const originalFindGuest = GuestSession.findOne;
  const documents = new Map([
    ['507f1f77bcf86cd799439031', { _id: '507f1f77bcf86cd799439031', ownerType: 'user', ownerId: userId, storagePath: 'private/form.pdf', status: 'completed', analysisStatus: 'completed', analysis: validTask(), answers: {} }],
    ['507f1f77bcf86cd799439032', { _id: '507f1f77bcf86cd799439032', ownerType: 'guest', ownerId: guestId, storagePath: 'private/guest.pdf', status: 'completed', analysisStatus: 'completed', analysis: validTask(), answers: {} }],
    ['507f1f77bcf86cd799439033', { _id: '507f1f77bcf86cd799439033', ownerType: 'user', ownerId: userId, status: 'processing', analysisStatus: 'processing', analysis: undefined, answers: {} }],
    ['507f1f77bcf86cd799439034', { _id: '507f1f77bcf86cd799439034', ownerType: 'user', ownerId: userId, status: 'failed', analysisStatus: 'failed', analysis: undefined, answers: {} }],
  ]);

  Document.findOne = mockedFindOne(documents);
  Document.findOneAndUpdate = (query, update) => ({
    then: (resolve, reject) => {
      const document = matchingDocument(documents, query);
      if (document && update.$set) Object.assign(document, update.$set);
      return Promise.resolve(document).then(resolve, reject);
    },
  });
  GuestSession.findOne = async () => ({ _id: { toString: () => guestId }, expiresAt: new Date(Date.now() + 60_000) });
  t.after(() => {
    Document.findOne = originalFindOne;
    Document.findOneAndUpdate = originalFindOneAndUpdate;
    GuestSession.findOne = originalFindGuest;
  });

  const userHeaders = { authorization: `Bearer ${generateAccessToken(userId)}` };
  const otherHeaders = { authorization: `Bearer ${generateAccessToken(otherUserId)}` };
  const guestHeaders = { cookie: 'guestSession=valid-guest-token' };
  const id = '507f1f77bcf86cd799439031';

  await withServer(t, async (baseUrl) => {
    const form = await fetch(`${baseUrl}/api/documents/${id}/form`, { headers: userHeaders });
    assert.equal(form.status, 200);
    const formBody = await form.json();
    assert.equal(formBody.form.title, 'Application Form');
    assert.equal('storagePath' in formBody.form, false);

    const guestForm = await fetch(`${baseUrl}/api/documents/507f1f77bcf86cd799439032/form`, { headers: guestHeaders });
    assert.equal(guestForm.status, 200);
    assert.equal((await guestForm.json()).form.sections[0].fields[0].id, 'full_name');

    assert.equal((await fetch(`${baseUrl}/api/documents/${id}/form`, { headers: otherHeaders })).status, 404);
    assert.equal((await fetch(`${baseUrl}/api/documents/507f1f77bcf86cd799439033/form`, { headers: userHeaders })).status, 409);
    assert.equal((await fetch(`${baseUrl}/api/documents/507f1f77bcf86cd799439034/form`, { headers: userHeaders })).status, 409);

    const emptyAnswers = await fetch(`${baseUrl}/api/documents/${id}/form/answers`, { headers: userHeaders });
    assert.deepEqual((await emptyAnswers.json()).answers, {});

    const savePartial = await fetch(`${baseUrl}/api/documents/${id}/form/answers`, {
      method: 'PUT', headers: { ...userHeaders, 'content-type': 'application/json' }, body: JSON.stringify({ answers: { full_name: ' Nikhil ' } }),
    });
    assert.equal(savePartial.status, 200);
    assert.deepEqual((await savePartial.json()).answers, { full_name: 'Nikhil' });

    const updateAnswers = await fetch(`${baseUrl}/api/documents/${id}/form/answers`, {
      method: 'PUT', headers: { ...userHeaders, 'content-type': 'application/json' }, body: JSON.stringify({ answers: { email: 'example@gmail.com', age: 20, method: 'Email', priority: 'High', consent: true, birth_date: '2000-01-02', contact: '+91 98765 43210', notes: 'Accessible help requested.' } }),
    });
    assert.equal(updateAnswers.status, 200);
    const updated = (await updateAnswers.json()).answers;
    assert.equal(updated.full_name, 'Nikhil');
    assert.equal(updated.email, 'example@gmail.com');
    assert.equal(updated.method, 'Email');
    assert.deepEqual(documents.get(id).analysis, validTask());

    const invalidRequests = [
      { answers: { unknown_field: 'x' } },
      { answers: { full_name: 42 } },
      { answers: { email: 'not-an-email' } },
      { answers: { method: 'Mail pigeon' } },
      { answers: { priority: 'Medium' } },
      { answers: { analysis: { title: 'Changed' } } },
    ];
    for (const payload of invalidRequests) {
      const response = await fetch(`${baseUrl}/api/documents/${id}/form/answers`, {
        method: 'PUT', headers: { ...userHeaders, 'content-type': 'application/json' }, body: JSON.stringify(payload),
      });
      assert.equal(response.status, 422);
    }
    assert.deepEqual(documents.get(id).analysis, validTask());

    assert.equal((await fetch(`${baseUrl}/api/documents/${id}/form/answers`, { headers: otherHeaders })).status, 404);
    const nonOwnerSave = await fetch(`${baseUrl}/api/documents/${id}/form/answers`, {
      method: 'PUT', headers: { ...otherHeaders, 'content-type': 'application/json' }, body: JSON.stringify({ answers: { full_name: 'Nope' } }),
    });
    assert.equal(nonOwnerSave.status, 404);

    const guestSave = await fetch(`${baseUrl}/api/documents/507f1f77bcf86cd799439032/form/answers`, {
      method: 'PUT', headers: { ...guestHeaders, 'content-type': 'application/json' }, body: JSON.stringify({ answers: { full_name: 'Guest user' } }),
    });
    assert.equal(guestSave.status, 200);
    assert.deepEqual((await guestSave.json()).answers, { full_name: 'Guest user' });
  });
});
