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

async function withServer(t, callback) {
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve()))));
  return callback(`http://127.0.0.1:${server.address().port}`);
}

function formWithFile(content, type, filename) {
  const form = new FormData();
  form.append('file', new Blob([content], { type }), filename);
  return form;
}

test('secure document upload accepts valid owned files and rejects unsafe uploads', async (t) => {
  const testDirectory = await fs.mkdtemp(path.join(os.tmpdir(), 'accessai-upload-test-'));
  const originalDirectory = process.env.UPLOAD_TMP_DIR;
  const originalCreate = Document.create;
  const originalFindGuest = GuestSession.findOne;
  const created = [];
  let failMetadataCreation = false;
  let nextId = 1;

  process.env.UPLOAD_TMP_DIR = testDirectory;
  Document.create = async (input) => {
    if (failMetadataCreation) throw new Error('database unavailable');
    created.push(input);
    return { _id: { toString: () => `document-${nextId++}` }, ...input };
  };
  GuestSession.findOne = async () => ({
    _id: { toString: () => '507f1f77bcf86cd799439012' },
    expiresAt: new Date(Date.now() + 60_000),
  });

  t.after(async () => {
    Document.create = originalCreate;
    GuestSession.findOne = originalFindGuest;
    if (originalDirectory === undefined) delete process.env.UPLOAD_TMP_DIR;
    else process.env.UPLOAD_TMP_DIR = originalDirectory;
    await fs.rm(testDirectory, { recursive: true, force: true });
  });

  const userId = '507f1f77bcf86cd799439011';
  const authorization = { authorization: `Bearer ${generateAccessToken(userId)}` };
  const pdf = Buffer.from('%PDF-1.7\nminimal document');
  const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00]);
  const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00]);

  await withServer(t, async (baseUrl) => {
    const pdfResponse = await fetch(`${baseUrl}/api/documents/upload`, {
      method: 'POST', headers: authorization, body: formWithFile(pdf, 'application/pdf', 'application.pdf'),
    });
    assert.equal(pdfResponse.status, 201);
    const pdfBody = await pdfResponse.json();
    assert.deepEqual(pdfBody.document, {
      id: 'document-1', originalName: 'application.pdf', mimeType: 'application/pdf', size: pdf.length, status: 'uploaded',
    });
    assert.equal('storagePath' in pdfBody.document, false);
    assert.equal(created[0].ownerType, 'user');
    assert.equal(created[0].ownerId, userId);
    assert.match(path.basename(created[0].storagePath), /^[0-9a-f-]{36}\.pdf$/i);
    assert.equal(created[0].originalName, 'application.pdf');
    assert.ok(created[0].expiresAt > new Date());

    const pngResponse = await fetch(`${baseUrl}/api/documents/upload`, {
      method: 'POST', headers: authorization, body: formWithFile(png, 'image/png', 'scan.png'),
    });
    assert.equal(pngResponse.status, 201);
    const jpegResponse = await fetch(`${baseUrl}/api/documents/upload`, {
      method: 'POST', headers: authorization, body: formWithFile(jpeg, 'image/jpeg', 'photo.jpeg'),
    });
    assert.equal(jpegResponse.status, 201);

    const guestResponse = await fetch(`${baseUrl}/api/documents/upload`, {
      method: 'POST', headers: { cookie: 'guestSession=valid-guest-token' }, body: formWithFile(pdf, 'application/pdf', 'guest.pdf'),
    });
    assert.equal(guestResponse.status, 201);
    assert.equal(created[3].ownerType, 'guest');
    assert.equal(created[3].ownerId, '507f1f77bcf86cd799439012');

    const missingFile = await fetch(`${baseUrl}/api/documents/upload`, { method: 'POST', headers: authorization });
    assert.equal(missingFile.status, 400);
    const unsupported = await fetch(`${baseUrl}/api/documents/upload`, {
      method: 'POST', headers: authorization, body: formWithFile('plain text', 'text/plain', 'notes.txt'),
    });
    assert.equal(unsupported.status, 400);
    const unauthenticated = await fetch(`${baseUrl}/api/documents/upload`, {
      method: 'POST', body: formWithFile(pdf, 'application/pdf', 'private.pdf'),
    });
    assert.equal(unauthenticated.status, 401);
    const oversized = await fetch(`${baseUrl}/api/documents/upload`, {
      method: 'POST', headers: authorization,
      body: formWithFile(Buffer.alloc((10 * 1024 * 1024) + 1, 0x61), 'application/pdf', 'large.pdf'),
    });
    assert.equal(oversized.status, 413);

    failMetadataCreation = true;
    const failedMetadata = await fetch(`${baseUrl}/api/documents/upload`, {
      method: 'POST', headers: authorization, body: formWithFile(pdf, 'application/pdf', 'cleanup.pdf'),
    });
    assert.equal(failedMetadata.status, 500);
    assert.equal((await fs.readdir(testDirectory)).length, 4);
  });
});
