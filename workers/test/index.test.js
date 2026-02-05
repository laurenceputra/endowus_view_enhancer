import test from 'node:test';
import assert from 'node:assert/strict';

import worker from '../src/index.js';

async function parseJsonResponse(response) {
  return {
    status: response.status,
    headers: Object.fromEntries(response.headers.entries()),
    body: response.headers.get('content-type')?.includes('application/json')
      ? await response.json()
      : null
  };
}

test('OPTIONS request returns CORS preflight response', async () => {
  const request = new Request('https://worker.example/sync', { method: 'OPTIONS' });
  const response = await worker.fetch(request, {}, {});

  assert.equal(response.status, 204);
  assert.equal(response.headers.get('access-control-max-age'), '86400');
});

test('GET /health returns status payload', async () => {
  const request = new Request('https://worker.example/health', { method: 'GET' });
  const response = await worker.fetch(request, {}, {});
  const parsed = await parseJsonResponse(response);

  assert.equal(parsed.status, 200);
  assert.equal(parsed.body.status, 'ok');
  assert.ok(typeof parsed.body.timestamp === 'number');
});

test('POST /auth/login with invalid json returns bad request', async () => {
  const request = new Request('https://worker.example/auth/login', {
    method: 'POST',
    body: '{not-json',
    headers: {
      'Content-Type': 'application/json'
    }
  });

  const response = await worker.fetch(request, { SYNC_KV: { get: async () => null, put: async () => {} } }, {});
  const parsed = await parseJsonResponse(response);

  assert.equal(parsed.status, 400);
  assert.equal(parsed.body.error, 'BAD_REQUEST');
});

test('unauthenticated sync request returns unauthorized', async () => {
  const request = new Request('https://worker.example/sync', { method: 'POST', body: '{}' });
  const response = await worker.fetch(request, {}, {});
  const parsed = await parseJsonResponse(response);

  assert.equal(parsed.status, 401);
  assert.equal(parsed.body.error, 'UNAUTHORIZED');
});
