import test from 'node:test';
import assert from 'node:assert/strict';

import { rateLimit, getRateLimitStatus, resetRateLimit } from '../src/ratelimit.js';

function createKvMock() {
  const store = new Map();
  const optionsByKey = new Map();
  return {
    store,
    optionsByKey,
    async get(key) {
      return store.has(key) ? JSON.parse(store.get(key)) : null;
    },
    async put(key, value, options) {
      store.set(key, value);
      if (options) {
        optionsByKey.set(key, options);
      }
    },
    async delete(key) {
      store.delete(key);
    },
    async list() {
      return { keys: [] };
    }
  };
}

function createRequest(method, headers = {}) {
  return new Request('https://example.workers.dev/sync', {
    method,
    headers
  });
}

test('rateLimit allows first request and stores counter', async () => {
  const kv = createKvMock();
  const env = { SYNC_KV: kv };
  const request = createRequest('POST', { 'CF-Connecting-IP': '1.2.3.4' });

  const result = await rateLimit(request, env, '/sync');

  assert.equal(result.allowed, true);
  assert.equal(kv.store.size, 1);
});

test('rateLimit blocks when limit is exceeded', async () => {
  const kv = createKvMock();
  const env = { SYNC_KV: kv };
  const now = Date.now();
  kv.store.set(
    'ratelimit:1.2.3.4:/sync:POST',
    JSON.stringify({ count: 10, resetAt: now + 30_000 })
  );

  const request = createRequest('POST', { 'CF-Connecting-IP': '1.2.3.4' });
  const result = await rateLimit(request, env, '/sync');

  assert.equal(result.allowed, false);
  assert.ok(result.retryAfter > 0);
});

test('rateLimit normalizes /sync/:userId path config', async () => {
  const kv = createKvMock();
  const env = { SYNC_KV: kv };
  const request = createRequest('GET', { 'CF-Connecting-IP': '1.2.3.4' });

  const result = await rateLimit(request, env, '/sync/alice');

  assert.equal(result.allowed, true);
  assert.equal(kv.store.size, 1);
  const [key] = [...kv.store.keys()];
  assert.ok(key.includes('/sync/:userId:GET'));
});

test('rateLimit uses minimum KV TTL when remaining window is short', async () => {
  const kv = createKvMock();
  const env = { SYNC_KV: kv };
  const now = Date.now();
  kv.store.set(
    'ratelimit:1.2.3.4:/sync:POST',
    JSON.stringify({ count: 1, resetAt: now + 30_000 })
  );

  const request = createRequest('POST', { 'CF-Connecting-IP': '1.2.3.4' });
  const result = await rateLimit(request, env, '/sync');

  assert.equal(result.allowed, true);
  const options = kv.optionsByKey.get('ratelimit:1.2.3.4:/sync:POST');
  assert.ok(options);
  assert.equal(options.expirationTtl, 60);
});

test('getRateLimitStatus returns default when key does not exist', async () => {
  const kv = createKvMock();
  const env = { SYNC_KV: kv };

  const status = await getRateLimitStatus(env, 'api-key', '/sync/alice', 'GET');

  assert.equal(status.requests, 0);
  assert.equal(status.limit, 60);
  assert.equal(status.resetAt, null);
});

test('resetRateLimit deletes existing key', async () => {
  const kv = createKvMock();
  const env = { SYNC_KV: kv };
  kv.store.set('ratelimit:api-key:/sync/:userId:DELETE', JSON.stringify({ count: 1, resetAt: 1 }));

  await resetRateLimit(env, 'api-key', '/sync/user-1', 'DELETE');

  assert.equal(kv.store.has('ratelimit:api-key:/sync/:userId:DELETE'), false);
});
