const assert = require('node:assert/strict');
const http = require('node:http');
const test = require('node:test');
const app = require('../src/app');

test('GET /api/health returns the AccessAI API health status', async (t) => {
  const server = http.createServer(app);

  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve()))));

  const { port } = server.address();
  const response = await fetch(`http://127.0.0.1:${port}/api/health`);

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    status: 'ok',
    service: 'AccessAI API',
  });
});
