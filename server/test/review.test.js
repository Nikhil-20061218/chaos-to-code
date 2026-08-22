const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const http = require('node:http');
const os = require('node:os');
const path = require('node:path');
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
  return { title: 'Application Form', language: 'en', sections: [{ id: 'personal', title: 'Personal Information', fields: [
    { id: 'full_name', label: 'Full Name', simpleLabel: 'Your name', type: 'text', required: true, help: 'Enter your full name.' },
    { id: 'email', label: 'Email', simpleLabel: 'Email', type: 'email', required: true, help: 'Enter your email.' },
    { id: 'notes', label: 'Notes', simpleLabel: 'Notes', type: 'textarea', required: false, help: 'Optional notes.' },
  ] }] };
}

async function withServer(t, callback) {
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve()))));
  return callback(`http://127.0.0.1:${server.address().port}`);
}

function matches(document, query) {
  return document && Object.entries(query).every(([key, value]) => {
    if (value && typeof value === 'object' && Array.isArray(value.$in)) return value.$in.includes(document[key]);
    return document[key] === value;
  });
}

test('review, confirmation, PDF generation, and download enforce completed owner state', async (t) => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'accessai-review-test-'));
  const originalDirectory = process.env.GENERATED_PDF_DIR;
  const originalFindOne = Document.findOne;
  const originalFindOneAndUpdate = Document.findOneAndUpdate;
  const originalFindGuest = GuestSession.findOne;
  process.env.GENERATED_PDF_DIR = directory;

  const originalUpload = path.join(directory, 'original-upload.pdf');
  await fs.writeFile(originalUpload, Buffer.from('%PDF-original-upload'));
  const originalUploadContents = await fs.readFile(originalUpload);
  const documents = new Map([
    ['507f1f77bcf86cd799439041', { _id: '507f1f77bcf86cd799439041', ownerType: 'user', ownerId: userId, storagePath: originalUpload, status: 'completed', analysisStatus: 'completed', finalizationStatus: 'ready_for_review', analysis: validTask(), answers: { full_name: 'Nikhil' } }],
    ['507f1f77bcf86cd799439042', { _id: '507f1f77bcf86cd799439042', ownerType: 'guest', ownerId: guestId, status: 'completed', analysisStatus: 'completed', finalizationStatus: 'ready_for_review', analysis: validTask(), answers: { full_name: 'Guest', email: 'guest@example.com' } }],
    ['507f1f77bcf86cd799439043', { _id: '507f1f77bcf86cd799439043', ownerType: 'user', ownerId: userId, status: 'processing', analysisStatus: 'processing', finalizationStatus: 'draft', answers: {} }],
    ['507f1f77bcf86cd799439044', { _id: '507f1f77bcf86cd799439044', ownerType: 'user', ownerId: userId, status: 'failed', analysisStatus: 'failed', finalizationStatus: 'draft', answers: {} }],
    ['507f1f77bcf86cd799439045', { _id: '507f1f77bcf86cd799439045', ownerType: 'user', ownerId: userId, status: 'completed', analysisStatus: 'completed', finalizationStatus: 'ready_for_review', analysis: validTask(), answers: { full_name: 'Invalid', email: 123 } }],
    ['507f1f77bcf86cd799439046', { _id: '507f1f77bcf86cd799439046', ownerType: 'user', ownerId: userId, status: 'completed', analysisStatus: 'completed', finalizationStatus: 'pdf_generated', analysis: validTask(), answers: { full_name: 'Path', email: 'path@example.com' }, generatedPdfPath: path.join(directory, '..', 'outside.pdf') }],
  ]);

  Document.findOne = (query) => ({
    select: async () => [...documents.values()].find((document) => matches(document, query)) || null,
    then: (resolve, reject) => Promise.resolve([...documents.values()].find((document) => matches(document, query)) || null).then(resolve, reject),
  });
  Document.findOneAndUpdate = (query, update) => ({
    then: (resolve, reject) => {
      const document = [...documents.values()].find((entry) => matches(entry, query)) || null;
      if (document && update.$set) Object.assign(document, update.$set);
      if (document && update.$unset) Object.keys(update.$unset).forEach((key) => delete document[key]);
      return Promise.resolve(document).then(resolve, reject);
    },
  });
  GuestSession.findOne = async () => ({ _id: { toString: () => guestId }, expiresAt: new Date(Date.now() + 60_000) });
  t.after(async () => {
    Document.findOne = originalFindOne;
    Document.findOneAndUpdate = originalFindOneAndUpdate;
    GuestSession.findOne = originalFindGuest;
    if (originalDirectory === undefined) delete process.env.GENERATED_PDF_DIR;
    else process.env.GENERATED_PDF_DIR = originalDirectory;
    await fs.rm(directory, { recursive: true, force: true });
  });

  const userHeaders = { authorization: `Bearer ${generateAccessToken(userId)}` };
  const otherHeaders = { authorization: `Bearer ${generateAccessToken(otherUserId)}` };
  const guestHeaders = { cookie: 'guestSession=valid-guest-token' };
  const id = '507f1f77bcf86cd799439041';

  await withServer(t, async (baseUrl) => {
    const reviewResponse = await fetch(`${baseUrl}/api/documents/${id}/review`, { headers: userHeaders });
    assert.equal(reviewResponse.status, 200);
    const review = (await reviewResponse.json()).review;
    assert.equal(review.complete, false);
    assert.deepEqual(review.missingRequiredFields, ['email']);
    assert.equal(review.sections[0].fields[0].answer, 'Nikhil');
    assert.deepEqual(documents.get(id).analysis, validTask());

    const guestReview = await fetch(`${baseUrl}/api/documents/507f1f77bcf86cd799439042/review`, { headers: guestHeaders });
    assert.equal(guestReview.status, 200);
    assert.equal((await guestReview.json()).review.complete, true);
    assert.equal((await fetch(`${baseUrl}/api/documents/${id}/review`, { headers: otherHeaders })).status, 404);
    assert.equal((await fetch(`${baseUrl}/api/documents/507f1f77bcf86cd799439043/review`, { headers: userHeaders })).status, 409);
    assert.equal((await fetch(`${baseUrl}/api/documents/507f1f77bcf86cd799439044/review`, { headers: userHeaders })).status, 409);
    assert.equal((await fetch(`${baseUrl}/api/documents/507f1f77bcf86cd799439045/review`, { headers: userHeaders })).status, 422);

    const missingConfirm = await fetch(`${baseUrl}/api/documents/${id}/review/confirm`, { method: 'POST', headers: userHeaders });
    assert.equal(missingConfirm.status, 422);
    const beforeConfirmPdf = await fetch(`${baseUrl}/api/documents/${id}/pdf`, { method: 'POST', headers: userHeaders });
    assert.equal(beforeConfirmPdf.status, 422);

    documents.get(id).answers.email = 'nikhil@example.com';
    const unconfirmedPdf = await fetch(`${baseUrl}/api/documents/${id}/pdf`, { method: 'POST', headers: userHeaders });
    assert.equal(unconfirmedPdf.status, 409);
    const confirm = await fetch(`${baseUrl}/api/documents/${id}/review/confirm`, { method: 'POST', headers: userHeaders });
    assert.equal(confirm.status, 200);
    assert.deepEqual((await confirm.json()).document, { id, status: 'confirmed' });
    assert.equal(documents.get(id).finalizationStatus, 'confirmed');
    assert.equal((await fetch(`${baseUrl}/api/documents/${id}/review/confirm`, { method: 'POST', headers: otherHeaders })).status, 404);

    const generated = await fetch(`${baseUrl}/api/documents/${id}/pdf`, { method: 'POST', headers: userHeaders });
    assert.equal(generated.status, 200);
    assert.deepEqual((await generated.json()).document, { id, status: 'pdf_generated' });
    assert.equal(documents.get(id).finalizationStatus, 'pdf_generated');
    const generatedPdf = await fs.readFile(documents.get(id).generatedPdfPath);
    const pdfText = [...generatedPdf.toString('latin1').matchAll(/<([0-9a-f]+)>/gi)]
      .map((match) => Buffer.from(match[1], 'hex').toString('latin1')).join('');
    assert.ok(generatedPdf.subarray(0, 5).equals(Buffer.from('%PDF-')));
    assert.match(pdfText, /Application Form/);
    assert.match(pdfText, /Personal Information/);
    assert.match(pdfText, /Nikhil/);
    assert.deepEqual(await fs.readFile(originalUpload), originalUploadContents);

    const download = await fetch(`${baseUrl}/api/documents/${id}/pdf`, { headers: userHeaders });
    assert.equal(download.status, 200);
    assert.equal(download.headers.get('content-type'), 'application/pdf');
    assert.match(download.headers.get('content-disposition'), /filename="completed-form\.pdf"/);
    assert.ok(Buffer.from(await download.arrayBuffer()).subarray(0, 5).equals(Buffer.from('%PDF-')));
    assert.equal((await fetch(`${baseUrl}/api/documents/${id}/pdf`, { headers: otherHeaders })).status, 404);
    assert.equal((await fetch(`${baseUrl}/api/documents/507f1f77bcf86cd799439046/pdf`, { headers: userHeaders })).status, 409);
  });
});
